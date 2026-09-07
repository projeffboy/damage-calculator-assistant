import {TYPE_CHART} from '@smogon/calc';
import type {CalcGen, FieldState, PokemonState} from './types';
import {dexGen} from './dex';
import {maxHP, zeroStats} from './pokemon';
import {defaultField} from './field';
import type {VisualRoster, VisualSlot} from './visual';

export type SideKey = 'p1' | 'p2';
export type Team = (PokemonState | null)[];
export type Reveal = 'possible' | 'in' | 'out';

export const SQUAD_SIZE = 6;

export function partySize(doubles: boolean): number {
  return doubles ? 4 : 3;
}

export function leadsCount(doubles: boolean): number {
  return doubles ? 2 : 1;
}

export function emptyTeam(size = SQUAD_SIZE): Team {
  return Array.from({length: size}, () => null);
}

export function emptyReveals(): Reveal[] {
  return Array.from({length: SQUAD_SIZE}, () => 'possible');
}

export function resizeTeam(team: Team, size = SQUAD_SIZE): Team {
  const next = team.slice(0, size);
  while (next.length < size) next.push(null);
  return next;
}

export function filledIndexes(team: Team): number[] {
  return team.flatMap((poke, index) => (poke ? [index] : []));
}

export function resolveReveals(reveals: Reveal[], squad: Team): Reveal[] {
  const next = [...reveals];
  const filled = filledIndexes(squad);
  for (let i = 0; i < next.length; i++) {
    if (!squad[i]) next[i] = 'possible';
  }
  const ins = filled.filter((i) => next[i] === 'in');
  const outs = filled.filter((i) => next[i] === 'out');
  const maybe = filled.filter((i) => next[i] === 'possible');
  if (filled.length <= 4) {
    for (const i of maybe) next[i] = 'in';
    return next;
  }
  if (ins.length >= 4) {
    for (const i of maybe) next[i] = 'out';
  } else if (outs.length >= filled.length - 4) {
    for (const i of maybe) next[i] = 'in';
  }
  return next;
}

export function markReveal(reveals: Reveal[], squad: Team, index: number, status: Reveal): Reveal[] {
  const next = [...reveals];
  next[index] = status;
  return resolveReveals(next, squad);
}

export function rosterFromTeams(
  p1: Team,
  p2: Team,
  p1Active: number[],
  p2Active: number[],
  doubles: boolean,
): VisualRoster {
  const at = (team: Team, index: number | undefined) =>
    index !== undefined && index >= 0 ? team[index] ?? null : null;
  return {
    allyA: at(p1, p1Active[0]),
    allyB: doubles ? at(p1, p1Active[1]) : null,
    foeA: at(p2, p2Active[0]),
    foeB: doubles ? at(p2, p2Active[1]) : null,
  };
}

export function slotToMember(
  slot: VisualSlot,
  p1Active: number[],
  p2Active: number[],
): {side: SideKey; index: number} {
  if (slot === 'allyA') return {side: 'p1', index: p1Active[0] ?? -1};
  if (slot === 'allyB') return {side: 'p1', index: p1Active[1] ?? -1};
  if (slot === 'foeA') return {side: 'p2', index: p2Active[0] ?? -1};
  return {side: 'p2', index: p2Active[1] ?? -1};
}

export function resetPokemon(gen: CalcGen, poke: PokemonState): PokemonState {
  const max = maxHP(gen, poke);
  return {
    ...poke,
    curHP: max,
    percentHP: 100,
    status: '',
    toxicCounter: 1,
    boosts: zeroStats(0),
    isDynamaxed: false,
    teraActive: false,
    alliesFainted: 0,
  };
}

export function resetBattleField(gameType: FieldState['gameType']): FieldState {
  const field = defaultField();
  field.gameType = gameType;
  return field;
}

function typeMatchup(gen: CalcGen, attack: string, types: [string, string]): number {
  const chart = TYPE_CHART[dexGen(gen)] ?? {};
  const row = chart[attack as keyof typeof chart] as Record<string, number> | undefined;
  if (!row) return 1;
  let mult = 1;
  for (const type of types) {
    if (!type) continue;
    mult *= row[type] ?? 1;
  }
  return mult;
}

function grounded(poke: PokemonState, field: FieldState): boolean {
  if (field.isGravity || poke.item === 'Iron Ball') return true;
  if (poke.types.includes('Flying')) return false;
  if (poke.ability === 'Levitate' && poke.abilityOn) return false;
  if (poke.item === 'Air Balloon') return false;
  return true;
}

export function applySwitchIn(
  poke: PokemonState,
  gen: CalcGen,
  field: FieldState,
  side: SideKey,
): {pokemon: PokemonState; field: FieldState} {
  if (poke.item === 'Heavy-Duty Boots' || poke.ability === 'Magic Guard') {
    return {pokemon: poke, field};
  }
  const hazards = field[side];
  let next = {...poke};
  const hp = maxHP(gen, poke);
  const onGround = grounded(poke, field);

  if (hazards.isSR) {
    const eff = typeMatchup(gen, 'Rock', poke.types);
    const dmg = Math.floor((hp * eff) / 8);
    next.curHP = Math.max(0, next.curHP - dmg);
  }
  if (hazards.steelsurge) {
    const eff = typeMatchup(gen, 'Steel', poke.types);
    const dmg = Math.floor((hp * eff) / 8);
    next.curHP = Math.max(0, next.curHP - dmg);
  }
  if (onGround && hazards.spikes > 0) {
    const denom = hazards.spikes === 1 ? 8 : hazards.spikes === 2 ? 6 : 4;
    next.curHP = Math.max(0, next.curHP - Math.max(1, Math.floor(hp / denom)));
  }

  let nextField = field;
  if (onGround && hazards.toxicSpikes > 0) {
    if (poke.types.includes('Poison')) {
      nextField = {...field, [side]: {...hazards, toxicSpikes: 0}};
    } else if (!poke.types.includes('Steel') && !next.status) {
      next = {
        ...next,
        status: hazards.toxicSpikes >= 2 ? 'tox' : 'psn',
        toxicCounter: 1,
      };
    }
  }

  const max = hp || 1;
  next.percentHP = Math.round((next.curHP * 1000) / max) / 10;
  return {pokemon: next, field: nextField};
}
