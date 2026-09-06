import {
  ABILITIES,
  ITEMS,
  MOVES,
  NATURES,
  SPECIES,
  Stats,
  TYPE_CHART,
} from '@smogon/calc';
import type {CalcGen, GenerationNum, MoveCategory, StatsTable} from './types';

export function dexGen(gen: CalcGen): GenerationNum {
  return gen === 0 ? 9 : gen;
}

export function speciesDex(gen: CalcGen) {
  return SPECIES[dexGen(gen)] ?? {};
}

export function speciesNames(gen: CalcGen): string[] {
  return Object.keys(speciesDex(gen)).sort((a, b) => a.localeCompare(b));
}

export function moveDex(gen: CalcGen) {
  return MOVES[dexGen(gen)] ?? {};
}

export function moveNames(gen: CalcGen): string[] {
  return Object.keys(moveDex(gen)).sort((a, b) => a.localeCompare(b));
}

export function abilityNames(gen: CalcGen): string[] {
  return [...(ABILITIES[dexGen(gen)] ?? [])].sort((a, b) => a.localeCompare(b));
}

export function itemNames(gen: CalcGen): string[] {
  return [...(ITEMS[dexGen(gen)] ?? [])].sort((a, b) => a.localeCompare(b));
}

export function typeNames(gen: CalcGen): string[] {
  return Object.keys(TYPE_CHART[dexGen(gen)] ?? {});
}

export function teraTypeNames(gen: CalcGen): string[] {
  return typeNames(gen).filter((type) => type !== '???');
}

export function natureNames(): string[] {
  return Object.keys(NATURES);
}

export function natureLabel(name: string): string {
  const pair = NATURES[name];
  if (!pair || pair[0] === pair[1]) return name;
  return `${name} (+${Stats.displayStat(pair[0])}, -${Stats.displayStat(pair[1])})`;
}

export function baseStatsFromSpecies(gen: CalcGen, name: string): StatsTable | undefined {
  const data = speciesDex(gen)[name];
  if (!data) return undefined;
  const spa = data.bs.sa ?? data.bs.sl ?? 0;
  const spd = data.bs.sd ?? data.bs.sl ?? spa;
  return {
    hp: data.bs.hp,
    atk: data.bs.at,
    def: data.bs.df,
    spa,
    spd,
    spe: data.bs.sp,
  };
}

export function speciesTypes(gen: CalcGen, name: string): [string, string] {
  const data = speciesDex(gen)[name];
  if (!data) return ['Normal', ''];
  return [data.types[0], data.types[1] ?? ''];
}

export function speciesAbility(gen: CalcGen, name: string): string {
  return speciesDex(gen)[name]?.abilities?.[0] ?? '';
}

export function speciesWeight(gen: CalcGen, name: string): number {
  return speciesDex(gen)[name]?.weightkg ?? 0;
}

export function speciesGender(gen: CalcGen, name: string): '' | 'M' | 'F' | 'N' {
  return speciesDex(gen)[name]?.gender ?? '';
}

export function otherFormes(gen: CalcGen, name: string): string[] {
  const data = speciesDex(gen)[name];
  if (!data) return [];
  const formes = data.otherFormes ?? [];
  if (data.baseSpecies && data.baseSpecies !== name) {
    const base = speciesDex(gen)[data.baseSpecies];
    return [data.baseSpecies, ...(base?.otherFormes ?? [])];
  }
  return formes;
}

export function moveDefaults(
  gen: CalcGen,
  name: string,
): {bp: number; type: string; category: MoveCategory; hits: number} {
  const data = moveDex(gen)[name];
  if (!data) {
    return {bp: 0, type: 'Normal', category: 'Status', hits: 1};
  }
  let category: MoveCategory = data.category ?? 'Status';
  if (!data.category && dexGen(gen) < 4) {
    const special = new Set([
      'Fire',
      'Water',
      'Grass',
      'Electric',
      'Ice',
      'Psychic',
      'Dark',
      'Dragon',
    ]);
    category = special.has(data.type) ? 'Special' : 'Physical';
  }
  const hits = Array.isArray(data.multihit) ? data.multihit[0] + 1 : data.multihit ?? 1;
  return {bp: data.bp, type: data.type, category, hits: typeof hits === 'number' ? hits : 1};
}

export function isMultiHit(gen: CalcGen, name: string): boolean {
  const data = moveDex(gen)[name];
  return Boolean(data?.multihit);
}

export function genSupports(feature: string, gen: CalcGen): boolean {
  switch (feature) {
    case 'dvs':
      return gen === 1 || gen === 2;
    case 'ivs':
    case 'evs':
    case 'natures':
      return gen === 0 || gen >= 3;
    case 'sps':
      return gen === 0;
    case 'abilities':
      return gen === 0 || gen >= 3;
    case 'items':
      return gen === 0 || gen >= 2;
    case 'gender':
      return gen === 0 || gen >= 2;
    case 'split':
      return gen === 0 || gen >= 4;
    case 'tera':
      return gen === 9;
    case 'z':
      return gen >= 7;
    case 'dynamax':
      return gen === 8;
    case 'terrain':
      return gen >= 6;
    case 'fairy':
      return gen === 0 || gen >= 6;
    case 'snow':
      return gen === 9;
    case 'hail':
      return gen >= 2 && gen < 9;
    case 'primal':
      return gen >= 6 && gen <= 7;
    case 'ruin':
      return gen === 9;
    case 'gmax':
      return gen === 8;
    case 'steelsurge':
      return gen >= 8;
    case 'gmaxHazards':
      return gen === 8;
    case 'saltCure':
      return gen === 9;
    case 'auroraVeil':
      return gen >= 7;
    case 'battery':
      return gen >= 7;
    case 'powerSpot':
    case 'steelySpirit':
      return gen >= 8;
    case 'foresight':
      return gen >= 2 && gen <= 5;
    default:
      return true;
  }
}

export const WEATHER_NAMES = [
  'Sand',
  'Sun',
  'Rain',
  'Hail',
  'Snow',
  'Harsh Sunshine',
  'Heavy Rain',
  'Strong Winds',
] as const;

export const TERRAIN_NAMES = ['Electric', 'Grassy', 'Psychic', 'Misty'] as const;

export const TYPE_NAMES = [
  'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel',
  'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy',
  'Stellar', '???',
] as const;

export type WeatherName = (typeof WEATHER_NAMES)[number];
export type TerrainName = (typeof TERRAIN_NAMES)[number];
export type TypeName = (typeof TYPE_NAMES)[number];

export function parseWeather(value: string): WeatherName | undefined {
  return WEATHER_NAMES.find((name) => name === value);
}

export function parseTerrain(value: string): TerrainName | undefined {
  return TERRAIN_NAMES.find((name) => name === value);
}

export function parseType(value: string): TypeName | undefined {
  return TYPE_NAMES.find((name) => name === value);
}

export const GEN_BUTTONS: {gen: GenerationNum; label: string}[] = [
  {gen: 1, label: 'RBY'},
  {gen: 2, label: 'GSC'},
  {gen: 3, label: 'ADV'},
  {gen: 4, label: 'DPP'},
  {gen: 5, label: 'B/W'},
  {gen: 6, label: 'X/Y'},
  {gen: 7, label: 'S/M'},
  {gen: 8, label: 'S/S'},
  {gen: 9, label: 'S/V'},
];
