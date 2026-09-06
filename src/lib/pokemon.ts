import {calcStat, Stats} from '@smogon/calc';
import type {CalcGen, CalcSet, MoveSlot, PokemonState, StatID, StatsTable} from './types';
import {STAT_IDS} from './types';
import {
  baseStatsFromSpecies,
  moveDefaults,
  speciesAbility,
  speciesDex,
  speciesGender,
  speciesNames,
  speciesTypes,
  speciesWeight,
} from './dex';
import {engineGen, evsForEngine} from './adapters';

export function emptyMove(): MoveSlot {
  return {
    name: '(No Move)',
    bp: 0,
    type: 'Normal',
    category: 'Status',
    isCrit: false,
    useZ: false,
    isStellarFirstUse: false,
    hits: 1,
    timesUsed: 1,
    timesUsedWithMetronome: 0,
  };
}

export function zeroStats(value: number): StatsTable {
  return {hp: value, atk: value, def: value, spa: value, spd: value, spe: value};
}

export function defaultPokemon(gen: CalcGen, species?: string): PokemonState {
  const name = species && speciesDex(gen)[species] ? species : speciesNames(gen)[0] ?? 'Abra';
  const baseStats = baseStatsFromSpecies(gen, name) ?? zeroStats(100);
  const types = speciesTypes(gen, name);
  const level = gen === 0 ? 50 : 100;
  const ivs = zeroStats(31);
  const evs = zeroStats(0);
  const state: PokemonState = {
    species: name,
    types,
    teraType: types[0],
    teraActive: false,
    gender: speciesGender(gen, name),
    gmax: false,
    level,
    weightkg: speciesWeight(gen, name),
    baseStats,
    ivs,
    evs,
    boosts: zeroStats(0),
    nature: 'Serious',
    ability: speciesAbility(gen, name),
    abilityOn: true,
    item: '',
    status: '',
    toxicCounter: 1,
    curHP: 0,
    percentHP: 100,
    isDynamaxed: false,
    alliesFainted: 0,
    boostedStat: '',
    moves: [emptyMove(), emptyMove(), emptyMove(), emptyMove()],
  };
  const max = maxHP(gen, state);
  return {...state, curHP: max};
}

export function applySpecies(state: PokemonState, name: string, gen: CalcGen): PokemonState {
  const data = speciesDex(gen)[name];
  if (!data) return {...state, species: name};
  const baseStats = baseStatsFromSpecies(gen, name) ?? state.baseStats;
  const types = speciesTypes(gen, name);
  const next: PokemonState = {
    ...state,
    species: name,
    types,
    teraType: types[0],
    gender: speciesGender(gen, name),
    weightkg: speciesWeight(gen, name),
    baseStats,
    ability: speciesAbility(gen, name),
  };
  const max = maxHP(gen, next);
  const curHP = Math.round((state.percentHP / 100) * max);
  return {...next, curHP, percentHP: max === 0 ? 0 : Math.round((curHP / max) * 100)};
}

function firstOption<T>(value: T | T[] | undefined): T | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function asStatTable(raw: Record<string, number> | undefined): Partial<StatsTable> {
  if (!raw) return {};
  const aliases: Record<string, StatID> = {
    hp: 'hp',
    atk: 'atk',
    at: 'atk',
    def: 'def',
    df: 'def',
    spa: 'spa',
    sa: 'spa',
    spc: 'spa',
    sl: 'spa',
    spd: 'spd',
    sd: 'spd',
    spe: 'spe',
    sp: 'spe',
  };
  const out: Partial<StatsTable> = {};
  for (const [key, value] of Object.entries(raw)) {
    const stat = aliases[key];
    if (stat) out[stat] = value;
  }
  return out;
}

export function applySet(state: PokemonState, species: string, set: CalcSet, gen: CalcGen): PokemonState {
  let next = applySpecies(state, species, gen);
  const evs = {...next.evs, ...asStatTable(set.evs as Record<string, number> | undefined)};
  const ivs = {...next.ivs, ...asStatTable(set.ivs as Record<string, number> | undefined)};
  const moves: PokemonState['moves'] = [emptyMove(), emptyMove(), emptyMove(), emptyMove()];
  for (let i = 0; i < 4; i++) {
    const raw = set.moves[i];
    const name = firstOption(raw as string | string[]) ?? '(No Move)';
    const defaults = moveDefaults(gen, name);
    moves[i] = {
      ...emptyMove(),
      name,
      bp: defaults.bp,
      type: defaults.type,
      category: defaults.category,
      hits: defaults.hits,
    };
  }
  next = {
    ...next,
    level: set.level ?? (gen === 0 ? 50 : next.level),
    ability: set.ability ?? next.ability,
    item: set.item ?? '',
    nature: set.nature ?? next.nature,
    gender: set.gender ?? next.gender,
    evs,
    ivs,
    teraType: set.teraType ?? next.teraType,
    moves,
  };
  const max = maxHP(gen, next);
  return {...next, curHP: max, percentHP: 100};
}

export function computedStat(gen: CalcGen, poke: PokemonState, stat: StatID): number {
  const iv = gen === 1 || gen === 2 ? Stats.DVToIV(Stats.IVToDV(poke.ivs[stat])) : poke.ivs[stat];
  return calcStat(
    engineGen(gen),
    stat,
    poke.baseStats[stat],
    gen === 0 ? 31 : iv,
    evsForEngine(gen, poke.evs)[stat],
    poke.level,
    poke.nature,
  );
}

export function computedStats(gen: CalcGen, poke: PokemonState): StatsTable {
  const stats = zeroStats(0);
  for (const stat of STAT_IDS) {
    if (gen === 1 && stat === 'spd') {
      stats.spd = computedStat(gen, poke, 'spa');
    } else {
      stats[stat] = computedStat(gen, poke, stat);
    }
  }
  return stats;
}

export function maxHP(gen: CalcGen, poke: PokemonState): number {
  const hp = computedStat(gen, poke, 'hp');
  if (poke.isDynamaxed && poke.baseStats.hp !== 1) {
    return Math.floor((hp * (150 + 5 * 10)) / 100);
  }
  return hp;
}

export function totalInvestment(poke: PokemonState): number {
  return STAT_IDS.reduce((sum, stat) => sum + poke.evs[stat], 0);
}

export function analysisUrl(gen: CalcGen, species: string): string {
  const slug = species.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const genPath =
    gen === 1 ? 'rb' :
    gen === 2 ? 'gs' :
    gen === 3 ? 'rs' :
    gen === 4 ? 'dp' :
    gen === 5 ? 'bw' :
    gen === 6 ? 'xy' :
    gen === 7 ? 'sm' :
    gen === 8 ? 'ss' :
    'sv';
  return `https://www.smogon.com/dex/${genPath}/pokemon/${slug}/`;
}
