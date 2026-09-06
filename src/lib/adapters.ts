import {Field, Move, Pokemon, Side} from '@smogon/calc';
import type {CalcGen, FieldState, MoveSlot, PokemonState, SideState, StatsTable} from './types';
import {STAT_IDS} from './types';
import {dexGen, parseTerrain, parseType, parseWeather} from './dex';

export function engineGen(gen: CalcGen): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
  return dexGen(gen);
}

export function evsForEngine(gen: CalcGen, evs: StatsTable): StatsTable {
  if (gen !== 0) return evs;
  const out = {...evs};
  for (const stat of STAT_IDS) {
    const sp = evs[stat];
    out[stat] = sp === 1 ? 4 : Math.min(252, sp * 8);
  }
  return out;
}

function boostsFor(poke: PokemonState, plusOneAll: boolean): Partial<StatsTable> {
  const boosts: Partial<StatsTable> = {};
  for (const stat of STAT_IDS) {
    if (stat === 'hp') continue;
    const value = poke.boosts[stat] + (plusOneAll ? 1 : 0);
    boosts[stat] = Math.max(-6, Math.min(6, value));
  }
  return boosts;
}

export function toPokemon(gen: CalcGen, poke: PokemonState, plusOneAll: boolean): Pokemon {
  const type1 = parseType(poke.types[0]) ?? 'Normal';
  const type2 = poke.types[1] ? parseType(poke.types[1]) : undefined;
  const types: [typeof type1] | [typeof type1, typeof type1] = type2
    ? [type1, type2]
    : [type1];
  return new Pokemon(engineGen(gen), poke.species, {
    level: poke.level,
    ability: poke.ability || undefined,
    abilityOn: poke.abilityOn,
    item: poke.item || undefined,
    gender: poke.gender === '' ? undefined : poke.gender,
    nature: poke.nature,
    ivs: poke.ivs,
    evs: evsForEngine(gen, poke.evs),
    boosts: boostsFor(poke, plusOneAll),
    curHP: poke.curHP,
    status: poke.status,
    toxicCounter: poke.status === 'tox' ? poke.toxicCounter : 0,
    teraType: poke.teraActive ? parseType(poke.teraType) : undefined,
    isDynamaxed: poke.isDynamaxed || poke.gmax,
    alliesFainted: poke.alliesFainted,
    boostedStat: poke.boostedStat === '' ? undefined : poke.boostedStat,
    overrides: {
      baseStats: poke.baseStats,
      types,
    },
  });
}

export function toMove(gen: CalcGen, poke: PokemonState, slot: MoveSlot): Move {
  return new Move(engineGen(gen), slot.name, {
    ability: poke.ability || undefined,
    item: poke.item || undefined,
    useZ: slot.useZ,
    useMax: poke.isDynamaxed || poke.gmax,
    isCrit: slot.isCrit,
    isStellarFirstUse: slot.isStellarFirstUse,
    hits: slot.hits,
    timesUsed: slot.timesUsed,
    timesUsedWithMetronome: slot.timesUsedWithMetronome,
    overrides: {
      basePower: slot.bp,
      type: parseType(slot.type),
      category: slot.category,
    },
  });
}

function toSide(side: SideState): Side {
  return new Side({
    spikes: side.spikes,
    isSR: side.isSR,
    steelsurge: side.steelsurge,
    vinelash: side.vinelash,
    wildfire: side.wildfire,
    cannonade: side.cannonade,
    volcalith: side.volcalith,
    isReflect: side.isReflect,
    isLightScreen: side.isLightScreen,
    isProtected: side.isProtected,
    isSeeded: side.isSeeded,
    isSaltCured: side.isSaltCured,
    isForesight: side.isForesight,
    isHelpingHand: side.isHelpingHand,
    isTailwind: side.isTailwind,
    isFlowerGift: side.isFlowerGift,
    isPowerTrick: side.isPowerTrick,
    isSteelySpirit: side.isSteelySpirit,
    isFriendGuard: side.isFriendGuard,
    isAuroraVeil: side.isAuroraVeil,
    isBattery: side.isBattery,
    isPowerSpot: side.isPowerSpot,
    isSwitching: side.isSwitchingOut ? 'out' : undefined,
  });
}

export function toField(field: FieldState, swap = false): Field {
  const attacker = swap ? field.p2 : field.p1;
  const defender = swap ? field.p1 : field.p2;
  return new Field({
    gameType: field.gameType,
    weather: parseWeather(field.weather),
    terrain: parseTerrain(field.terrain),
    isMagicRoom: field.isMagicRoom,
    isWonderRoom: field.isWonderRoom,
    isGravity: field.isGravity,
    isBeadsOfRuin: field.isBeadsOfRuin,
    isSwordOfRuin: field.isSwordOfRuin,
    isTabletsOfRuin: field.isTabletsOfRuin,
    isVesselOfRuin: field.isVesselOfRuin,
    attackerSide: toSide(attacker),
    defenderSide: toSide(defender),
  });
}
