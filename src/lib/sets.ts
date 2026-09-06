import {availableSpeciesNames, filterSetdex, keepStandardFormat, relatedBattleFormes} from './availability';
import {speciesDex} from './dex';
import type {CalcGen, CalcSet, Setdex, StatsTable} from './types';

const cache = new Map<string, Setdex>();

if (import.meta.hot) {
  import.meta.hot.accept();
  cache.clear();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function first<T>(value: T | T[] | undefined): T | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function asStats(raw: unknown): Partial<StatsTable> | undefined {
  const pick = first(raw as Record<string, number> | Record<string, number>[]);
  if (!pick || typeof pick !== 'object') return undefined;
  const out: Partial<StatsTable> = {};
  const map: Record<string, keyof StatsTable> = {
    hp: 'hp',
    atk: 'atk',
    at: 'atk',
    def: 'def',
    df: 'def',
    spa: 'spa',
    sa: 'spa',
    spd: 'spd',
    sd: 'spd',
    spe: 'spe',
    sp: 'spe',
  };
  for (const [key, value] of Object.entries(pick)) {
    const stat = map[key];
    if (stat && typeof value === 'number') out[stat] = value;
  }
  return out;
}

function toCalcSet(raw: Record<string, unknown>): CalcSet {
  const movesRaw = Array.isArray(raw.moves) ? raw.moves : [];
  const moves = movesRaw.map((move) => first(move as string | string[]) ?? '(No Move)');
  while (moves.length < 4) moves.push('(No Move)');
  return {
    level: typeof raw.level === 'number' ? raw.level : undefined,
    ability: first(raw.ability as string | string[] | undefined),
    item: first(raw.item as string | string[] | undefined),
    nature: first(raw.nature as string | string[] | undefined),
    evs: asStats(raw.evs),
    ivs: asStats(raw.ivs),
    teraType: first(raw.teratypes as string | string[] | undefined) ?? first(raw.teraType as string | string[] | undefined),
    moves: moves.slice(0, 4),
  };
}

function flattenSets(payload: unknown, unrestricted: boolean): Setdex {
  const dex: Setdex = {};
  if (!isRecord(payload)) return dex;

  const add = (species: string, setName: string, raw: Record<string, unknown>) => {
    if (!dex[species]) dex[species] = {};
    dex[species][setName] = toCalcSet(raw);
  };

  const hasMoves = (value: unknown): value is Record<string, unknown> =>
    isRecord(value) && Array.isArray(value.moves);

  const isFormatId = (key: string) => key === key.toLowerCase() && !key.includes(' ');

  for (const [k1, v1] of Object.entries(payload)) {
    if (hasMoves(v1)) {
      add(k1, 'Set', v1);
      continue;
    }
    if (!isRecord(v1)) continue;
    for (const [k2, v2] of Object.entries(v1)) {
      if (hasMoves(v2)) {
        add(k1, k2, v2);
        continue;
      }
      if (!isRecord(v2)) continue;
      for (const [k3, v3] of Object.entries(v2)) {
        if (!hasMoves(v3)) continue;
        if (isFormatId(k1)) {
          if (!keepStandardFormat(k1, unrestricted)) continue;
          add(k2, `${k1.toUpperCase()} ${k3}`, v3);
        } else {
          if (!keepStandardFormat(k2, unrestricted)) continue;
          add(k1, `${k2.toUpperCase()} ${k3}`, v3);
        }
      }
    }
  }
  return dex;
}

function megaFormeFor(gen: CalcGen, species: string, item?: string): string | undefined {
  if (!item) return undefined;
  const lower = item.toLowerCase();
  const isMegaStone = /ite(?: [xyz])?$/.test(lower) && lower !== 'eviolite';
  const isPrimal = lower === 'red orb' || lower === 'blue orb';
  if (!isMegaStone && !isPrimal) return undefined;

  const candidates = new Set<string>([species, ...relatedBattleFormes(species)]);
  for (const name of [...candidates]) {
    const data = speciesDex(gen)[name];
    if (data?.baseSpecies) candidates.add(data.baseSpecies);
    for (const forme of data?.otherFormes ?? []) candidates.add(forme);
  }
  const formes = [...candidates].filter((name) => speciesDex(gen)[name]);
  if (lower === 'red orb') return formes.find((name) => name === 'Groudon-Primal');
  if (lower === 'blue orb') return formes.find((name) => name === 'Kyogre-Primal');
  if (item.endsWith(' X')) return formes.find((name) => name.endsWith('-Mega-X'));
  if (item.endsWith(' Y')) return formes.find((name) => name.endsWith('-Mega-Y'));
  if (item.endsWith(' Z') && isMegaStone) return formes.find((name) => name.endsWith('-Mega-Z'));
  return formes.find((name) => name.includes('-Mega') && !/-Mega-[XYZ]$/.test(name));
}

function copySets(dex: Setdex, fromSets: Record<string, CalcSet>, to: string) {
  if (!dex[to]) dex[to] = {};
  for (const [setName, set] of Object.entries(fromSets)) {
    if (!dex[to][setName]) dex[to][setName] = set;
  }
}

function expandSetdexFormes(dex: Setdex, gen: CalcGen): Setdex {
  const out: Setdex = {};
  for (const [species, sets] of Object.entries(dex)) {
    out[species] = {...sets};
  }
  for (const [species, sets] of Object.entries(dex)) {
    for (const forme of relatedBattleFormes(species)) {
      if (forme !== species && speciesDex(gen)[forme]) copySets(out, sets, forme);
    }
    for (const [setName, set] of Object.entries(sets)) {
      const mega = megaFormeFor(gen, species, set.item);
      if (mega) copySets(out, {[setName]: set}, mega);
    }
  }
  return out;
}

export async function loadSetdex(gen: CalcGen, unrestricted = false): Promise<Setdex> {
  const key = gen === 0 ? 'sets-champions' : `sets-${gen}-${unrestricted ? 'all' : 'game'}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const url =
      gen === 0
        ? 'https://data.pkmn.cc/sets/champions.json'
        : `https://data.pkmn.cc/sets/gen${gen}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    let dex = expandSetdexFormes(flattenSets(await res.json(), unrestricted || gen === 0), gen);
    if (!unrestricted) {
      const mode = gen === 0 ? 'champions' : 'one-vs-one';
      dex = filterSetdex(dex, new Set(availableSpeciesNames(gen, mode)));
    }
    cache.set(key, dex);
    return dex;
  } catch {
    return {};
  }
}

function flattenRandoms(payload: unknown): Setdex {
  const dex: Setdex = {};
  if (!payload || typeof payload !== 'object') return dex;
  for (const [species, raw] of Object.entries(payload as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue;
    const pokemon = raw as Record<string, unknown>;
    const roleMap = isRecord(pokemon.roles) ? pokemon.roles : undefined;
    const entries: [string, unknown][] = roleMap
      ? Object.entries(roleMap)
      : [['Random', pokemon]];
    for (const [role, roleRaw] of entries) {
      const extra = isRecord(roleRaw) ? roleRaw : {};
      const merged = {...pokemon, ...extra};
      const set = toCalcSet(merged);
      set.level = typeof pokemon.level === 'number' ? pokemon.level : set.level;
      if (!dex[species]) dex[species] = {};
      dex[species][role] = set;
    }
  }
  return dex;
}

export async function loadRandoms(gen: CalcGen): Promise<Setdex> {
  const n = gen === 0 ? 9 : gen;
  const key = `rand-${n}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const res = await fetch(`https://data.pkmn.cc/randbats/gen${n}randombattle.json`);
    if (!res.ok) throw new Error(String(res.status));
    const dex = flattenRandoms(await res.json());
    cache.set(key, dex);
    return dex;
  } catch {
    return {};
  }
}

export function mergeSetdex(base: Setdex, extra: Setdex): Setdex {
  const out: Setdex = {};
  for (const source of [base, extra]) {
    for (const [species, sets] of Object.entries(source)) {
      out[species] = {...out[species], ...sets};
    }
  }
  return out;
}

export function setOptions(dex: Setdex, speciesFilter?: string): {id: string; species: string; set: string}[] {
  const options: {id: string; species: string; set: string}[] = [];
  const names = Object.keys(dex).sort((a, b) => a.localeCompare(b));
  for (const species of names) {
    if (speciesFilter && !species.toLowerCase().includes(speciesFilter.toLowerCase())) continue;
    for (const set of Object.keys(dex[species] ?? {})) {
      options.push({id: `${species} (${set})`, species, set});
    }
  }
  return options;
}

export function parseSetId(id: string): {species: string; set: string} | undefined {
  const open = id.indexOf(' (');
  const close = id.lastIndexOf(')');
  if (open === -1 || close === -1) return undefined;
  return {species: id.slice(0, open), set: id.slice(open + 2, close)};
}

export function tiersFromDex(dex: Setdex): string[] {
  const tiers = new Set<string>();
  for (const sets of Object.values(dex)) {
    for (const name of Object.keys(sets)) {
      const tier = name.split(' ')[0];
      if (tier) tiers.add(tier);
    }
  }
  return [...tiers].sort((a, b) => a.localeCompare(b));
}
