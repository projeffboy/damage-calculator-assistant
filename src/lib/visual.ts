import {calculateMove, type MoveResult} from './calculate';
import {moveTarget} from './dex';
import {defaultSide} from './field';
import {maxHP} from './pokemon';
import type {CalcGen, FieldState, Notation, PokemonState, SideState} from './types';

export type VisualSlot = 'allyA' | 'allyB' | 'foeA' | 'foeB';
export type VisualRoster = Record<VisualSlot, PokemonState | null>;

export const ALLY_SLOTS: VisualSlot[] = ['allyA', 'allyB'];
export const FOE_SLOTS: VisualSlot[] = ['foeA', 'foeB'];

export function teamOf(slot: VisualSlot): 'p1' | 'p2' {
  return slot.startsWith('ally') ? 'p1' : 'p2';
}

export function visibleSlots(doubles: boolean): VisualSlot[] {
  return doubles ? ['allyA', 'allyB', 'foeA', 'foeB'] : ['allyA', 'foeA'];
}

export function defaultTarget(attacker: VisualSlot, doubles: boolean): VisualSlot {
  if (attacker === 'allyA') return 'foeA';
  if (attacker === 'allyB') return doubles ? 'foeB' : 'foeA';
  if (attacker === 'foeA') return 'allyA';
  return doubles ? 'allyB' : 'allyA';
}

export function defaultTargetMap(doubles: boolean): Record<VisualSlot, VisualSlot> {
  return {
    allyA: defaultTarget('allyA', doubles),
    allyB: defaultTarget('allyB', doubles),
    foeA: defaultTarget('foeA', doubles),
    foeB: defaultTarget('foeB', doubles),
  };
}

export function slotsOnTeam(team: 'p1' | 'p2', doubles: boolean): VisualSlot[] {
  return visibleSlots(doubles).filter((slot) => teamOf(slot) === team);
}

const PROTECT_BREAKERS = new Set([
  'Feint',
  'Shadow Force',
  'Phantom Force',
  'Hyperspace Fury',
  'Hyperspace Hole',
  'G-Max One Blow',
]);

export function affectedSlots(
  attacker: VisualSlot,
  moveName: string,
  gen: CalcGen,
  chosen: VisualSlot,
  doubles: boolean,
  roster?: VisualRoster,
): VisualSlot[] {
  const vis = visibleSlots(doubles);
  const target = moveTarget(gen, moveName);
  let slots: VisualSlot[] = [];
  if (target === 'allAdjacent') slots = vis.filter((slot) => slot !== attacker);
  else if (target === 'allAdjacentFoes') slots = vis.filter((slot) => teamOf(slot) !== teamOf(attacker));
  else {
    const next = vis.includes(chosen) && chosen !== attacker ? chosen : defaultTarget(attacker, doubles);
    slots = next === attacker ? [] : [next];
  }
  if (!roster) return slots;
  return slots.filter((slot) => roster[slot]);
}

export interface HitPreview {
  slot: VisualSlot;
  median: number;
  remain: number;
  remainPct: number;
  maxHP: number;
  minPct: number;
  maxPct: number;
  ko: string;
  desc: string;
  result: MoveResult;
}

function abilityActive(poke: PokemonState | null, name: string): boolean {
  return Boolean(poke?.abilityOn && poke.ability === name);
}

function occupiedPokemon(roster: VisualRoster): PokemonState[] {
  return (Object.values(roster) as (PokemonState | null)[]).filter(
    (poke): poke is PokemonState => Boolean(poke),
  );
}

function fieldWithRosterEffects(field: FieldState, roster: VisualRoster): FieldState {
  const occupied = occupiedPokemon(roster);
  const has = (name: string) => occupied.some((poke) => abilityActive(poke, name));
  return {
    ...field,
    isFairyAura: field.isFairyAura || has('Fairy Aura'),
    isDarkAura: field.isDarkAura || has('Dark Aura'),
    isAuraBreak: field.isAuraBreak || has('Aura Break'),
    isBeadsOfRuin: field.isBeadsOfRuin || has('Beads of Ruin'),
    isSwordOfRuin: field.isSwordOfRuin || has('Sword of Ruin'),
    isTabletsOfRuin: field.isTabletsOfRuin || has('Tablets of Ruin'),
    isVesselOfRuin: field.isVesselOfRuin || has('Vessel of Ruin'),
  };
}

function mergeSide(base: SideState, extra: Partial<SideState>): SideState {
  return {
    ...base,
    isFriendGuard: base.isFriendGuard || Boolean(extra.isFriendGuard),
    isBattery: base.isBattery || Boolean(extra.isBattery),
    isPowerSpot: base.isPowerSpot || Boolean(extra.isPowerSpot),
    isSteelySpirit: base.isSteelySpirit || Boolean(extra.isSteelySpirit),
    isFlowerGift: base.isFlowerGift || Boolean(extra.isFlowerGift),
  };
}

function partnerFlags(roster: VisualRoster, slot: VisualSlot): Partial<SideState> {
  const team = teamOf(slot);
  const flags: Partial<SideState> = {};
  for (const [other, poke] of Object.entries(roster) as [VisualSlot, PokemonState | null][]) {
    if (!poke || other === slot || teamOf(other) !== team) continue;
    if (abilityActive(poke, 'Friend Guard')) flags.isFriendGuard = true;
    if (abilityActive(poke, 'Battery')) flags.isBattery = true;
    if (abilityActive(poke, 'Power Spot')) flags.isPowerSpot = true;
    if (abilityActive(poke, 'Steely Spirit')) flags.isSteelySpirit = true;
    if (abilityActive(poke, 'Flower Gift')) flags.isFlowerGift = true;
  }
  return flags;
}

function fieldForHit(
  field: FieldState,
  roster: VisualRoster,
  attacker: VisualSlot,
  defender: VisualSlot,
): {
  field: FieldState;
  attackerIsP1: boolean;
} {
  const atkTeam = teamOf(attacker);
  const defTeam = teamOf(defender);
  if (atkTeam === defTeam) {
    const teamSide = atkTeam === 'p1' ? field.p1 : field.p2;
    return {
      attackerIsP1: true,
      field: {
        ...field,
        p1: mergeSide(teamSide, partnerFlags(roster, attacker)),
        p2: mergeSide(defaultSide(), partnerFlags(roster, defender)),
      },
    };
  }
  return {
    attackerIsP1: atkTeam === 'p1',
    field: {
      ...field,
      p1: mergeSide(field.p1, partnerFlags(roster, atkTeam === 'p1' ? attacker : defender)),
      p2: mergeSide(field.p2, partnerFlags(roster, atkTeam === 'p2' ? attacker : defender)),
    },
  };
}

function isSpreadMove(gen: CalcGen, moveName: string): boolean {
  const target = moveTarget(gen, moveName);
  return target === 'allAdjacent' || target === 'allAdjacentFoes';
}

export function previewAttack(
  gen: CalcGen,
  roster: VisualRoster,
  attacker: VisualSlot,
  moveIndex: number,
  chosen: VisualSlot,
  field: FieldState,
  notation: Notation,
): HitPreview[] {
  const attackerPoke = roster[attacker];
  if (!attackerPoke) return [];
  const doubles = field.gameType === 'Doubles';
  const moveName = attackerPoke.moves[moveIndex]?.name ?? '(No Move)';
  const hitSlots = affectedSlots(attacker, moveName, gen, chosen, doubles, roster);
  const spread = isSpreadMove(gen, moveName);
  const baseField = fieldWithRosterEffects(field, roster);
  const singlesField = spread ? {...baseField, gameType: 'Singles' as const} : baseField;

  const probes: {slot: VisualSlot; result: ReturnType<typeof calculateMove> | null}[] = [];
  for (const slot of hitSlots) {
    const defender = roster[slot];
    if (!defender) continue;
    const {field: hitField, attackerIsP1} = fieldForHit(singlesField, roster, attacker, slot);
    try {
      probes.push({
        slot,
        result: calculateMove(gen, attackerPoke, defender, moveIndex, hitField, attackerIsP1, notation),
      });
    } catch {
      probes.push({slot, result: null});
    }
  }

  const damaging = probes.filter((probe) => probe.result && probe.result.range[1] > 0).length;
  const spreadPenalty = doubles && spread && damaging > 1;

  const hits: HitPreview[] = [];
  for (const probe of probes) {
    const defender = roster[probe.slot];
    if (!defender || !probe.result) continue;
    let result = probe.result;
    if (spreadPenalty && result.range[1] > 0) {
      const {field: hitField, attackerIsP1} = fieldForHit(baseField, roster, attacker, probe.slot);
      try {
        result = calculateMove(gen, attackerPoke, defender, moveIndex, hitField, attackerIsP1, notation);
      } catch {
        continue;
      }
    }
    const hp = result.maxHP || maxHP(gen, defender);
    const remain = Math.max(0, defender.curHP - result.median);
    const remainPct = hp === 0 ? 0 : Math.round((remain * 1000) / hp) / 10;
    const minPct = hp === 0 ? 0 : Math.floor((result.range[0] * 1000) / hp) / 10;
    const maxPct = hp === 0 ? 0 : Math.floor((result.range[1] * 1000) / hp) / 10;
    hits.push({
      slot: probe.slot,
      median: result.median,
      remain,
      remainPct,
      maxHP: hp,
      minPct,
      maxPct,
      ko: result.ko,
      desc: result.desc,
      result,
    });
  }
  return hits;
}

export interface ArmedAction {
  slot: VisualSlot;
  moveIndex: number;
  target: VisualSlot;
}

export interface ComboPart {
  from: VisualSlot;
  move: string;
  median: number;
}

export interface ComboHit {
  slot: VisualSlot;
  median: number;
  remain: number;
  remainPct: number;
  maxHP: number;
  minDmg: number;
  maxDmg: number;
  minPct: number;
  maxPct: number;
  ko: string;
  parts: ComboPart[];
}

function cloneRoster(roster: VisualRoster): VisualRoster {
  return {
    allyA: roster.allyA ? {...roster.allyA} : null,
    allyB: roster.allyB ? {...roster.allyB} : null,
    foeA: roster.foeA ? {...roster.foeA} : null,
    foeB: roster.foeB ? {...roster.foeB} : null,
  };
}

export function previewCombo(
  gen: CalcGen,
  roster: VisualRoster,
  actions: ArmedAction[],
  field: FieldState,
  notation: Notation,
): ComboHit[] {
  const doubles = field.gameType === 'Doubles';
  // Slot order for now; speed / Trick Room / Tailwind / Icy Wind come later.
  const ordered = visibleSlots(doubles)
    .map((slot) => actions.find((action) => action.slot === slot))
    .filter((action): action is ArmedAction => Boolean(action && roster[action.slot]));

  const live = cloneRoster(roster);
  let liveField = field;
  const bySlot = new Map<VisualSlot, ComboHit>();

  for (const action of ordered) {
    const attacker = live[action.slot];
    if (!attacker) continue;
    const moveName = attacker.moves[action.moveIndex]?.name ?? '(No Move)';
    const hits = previewAttack(
      gen,
      live,
      action.slot,
      action.moveIndex,
      action.target,
      liveField,
      notation,
    );
    for (const hit of hits) {
      const defender = live[hit.slot];
      if (!defender) continue;
      const hp = hit.maxHP || maxHP(gen, defender);
      const combo = bySlot.get(hit.slot) ?? {
        slot: hit.slot,
        median: 0,
        remain: defender.curHP,
        remainPct: defender.percentHP,
        maxHP: hp,
        minDmg: 0,
        maxDmg: 0,
        minPct: 0,
        maxPct: 0,
        ko: '',
        parts: [],
      };
      combo.median += hit.median;
      combo.minDmg += hit.result.range[0];
      combo.maxDmg += hit.result.range[1];
      combo.parts.push({from: action.slot, move: moveName, median: hit.median});
      const remain = Math.max(0, defender.curHP - hit.median);
      defender.curHP = remain;
      defender.percentHP = hp === 0 ? 0 : Math.round((remain * 100) / hp);
      combo.remain = remain;
      combo.remainPct = hp === 0 ? 0 : Math.round((remain * 1000) / hp) / 10;
      combo.minPct = hp === 0 ? 0 : Math.min(100, Math.floor((combo.minDmg * 1000) / hp) / 10);
      combo.maxPct = hp === 0 ? 0 : Math.min(100, Math.floor((combo.maxDmg * 1000) / hp) / 10);
      combo.ko =
        remain <= 0
          ? combo.parts.length > 1
            ? 'combo KO'
            : hit.ko || 'KO'
          : combo.parts.length > 1
            ? ''
            : hit.ko;
      bySlot.set(hit.slot, combo);
    }
    if (PROTECT_BREAKERS.has(moveName) && hits.length > 0) {
      const sides = new Set(hits.map((hit) => teamOf(hit.slot)));
      liveField = {
        ...liveField,
        p1: sides.has('p1') ? {...liveField.p1, isProtected: false} : liveField.p1,
        p2: sides.has('p2') ? {...liveField.p2, isProtected: false} : liveField.p2,
      };
    }
  }
  return [...bySlot.values()];
}

export const STATUS_LABEL: Record<string, string> = {
  psn: 'PSN',
  tox: 'TOX',
  brn: 'BRN',
  par: 'PAR',
  slp: 'SLP',
  frz: 'FRZ',
};
