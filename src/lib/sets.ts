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

function flattenSets(payload: unknown): Setdex {
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
        if (isFormatId(k1)) add(k2, `${k1.toUpperCase()} ${k3}`, v3);
        else add(k1, `${k2.toUpperCase()} ${k3}`, v3);
      }
    }
  }
  return dex;
}

export async function loadSetdex(gen: CalcGen): Promise<Setdex> {
  const n = gen === 0 ? 9 : gen;
  const key = `sets-${n}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const res = await fetch(`https://data.pkmn.cc/sets/gen${n}.json`);
    if (!res.ok) throw new Error(String(res.status));
    const dex = flattenSets(await res.json());
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
