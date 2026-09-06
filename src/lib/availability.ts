import {useEffect, useMemo, useState} from 'react';
import {Dex} from '@pkmn/dex';
import {Generations} from '@pkmn/data';
import {CHAMPIONS_ITEMS} from './championsItems';
import {CHAMPIONS_SPECIES} from './championsSpecies';
import {itemNames, moveNames, speciesDex, speciesNames} from './dex';
import type {CalcGen, GenerationNum, Mode, Setdex} from './types';

const gens = new Generations(Dex);
const speciesCache = new Map<GenerationNum, string[]>();
const itemCache = new Map<GenerationNum, string[]>();

type GameRestriction = 'Pentagon' | 'Plus' | 'Galar' | 'Paldea';

const SKIP_FORMAT =
  /^(nationaldex|letsgo|bdsp|cap|balancedhackmons|purehackmons|almostanyability|godlygift|mixandmega|stabmons|partnersincrime|inheritance|camomons)/;

// Smogon/data.pkmn.cc use "Aegislash"; @smogon/calc uses Blade/Shield/Both.
export const BATTLE_FORMES: Record<string, readonly string[]> = {
  Aegislash: ['Aegislash-Blade', 'Aegislash-Shield', 'Aegislash-Both'],
  Keldeo: ['Keldeo-Resolute'],
  Minior: ['Minior-Meteor'],
  Palafin: ['Palafin-Hero'],
  Terapagos: ['Terapagos-Stellar', 'Terapagos-Terastal'],
  Wishiwashi: ['Wishiwashi-School'],
  'Darmanitan-Galar': ['Darmanitan-Galar-Zen'],
  Meloetta: ['Meloetta-Pirouette'],
};

export function relatedBattleFormes(name: string): string[] {
  for (const [base, formes] of Object.entries(BATTLE_FORMES)) {
    if (name === base || formes.includes(name)) return [base, ...formes];
  }
  return [];
}

export function calcSpeciesAliases(gen: CalcGen, name: string): string[] {
  const dex = speciesDex(gen);
  const names = new Set<string>();
  if (dex[name]) names.add(name);
  for (const forme of relatedBattleFormes(name)) {
    if (dex[forme]) names.add(forme);
  }
  return [...names];
}

const CHAMPIONS_LEARNSETS_URL =
  'https://cdn.jsdelivr.net/gh/otterlyclueless/pokemon-champions-data@main/learnsets/learnsets.json';

let championsMoves: Record<string, string[]> | undefined;

function restrictionFor(gen: GenerationNum): GameRestriction | undefined {
  if (gen === 6) return 'Pentagon';
  if (gen === 7) return 'Plus';
  if (gen === 8) return 'Galar';
  if (gen === 9) return 'Paldea';
  return undefined;
}

export function keepStandardFormat(formatId: string, unrestricted: boolean): boolean {
  if (unrestricted) return true;
  return !SKIP_FORMAT.test(formatId.toLowerCase());
}

export function inGameSpecies(gen: GenerationNum): string[] {
  const hit = speciesCache.get(gen);
  if (hit) return hit;
  const names: string[] = [];
  const seen = new Set<string>();
  for (const specie of gens.get(gen).species) {
    for (const name of calcSpeciesAliases(gen, specie.name)) {
      if (seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  names.sort((a, b) => a.localeCompare(b));
  speciesCache.set(gen, names);
  return names;
}

export function availableSpeciesNames(gen: CalcGen, mode: Mode, setdex: Setdex = {}): string[] {
  if (mode === 'oms') return speciesNames(gen);
  if (mode === 'randoms') {
    return Object.keys(setdex).sort((a, b) => a.localeCompare(b));
  }
  if (mode === 'champions' || gen === 0) return [...CHAMPIONS_SPECIES];
  return inGameSpecies(gen);
}

export function inGameItems(gen: GenerationNum): string[] {
  const hit = itemCache.get(gen);
  if (hit) return hit;
  const calc = new Set(itemNames(gen));
  const names: string[] = [];
  for (const item of gens.get(gen).items) {
    if (calc.has(item.name)) names.push(item.name);
  }
  names.sort((a, b) => a.localeCompare(b));
  itemCache.set(gen, names);
  return names;
}

function withCurrentItem(names: string[], extra?: string): string[] {
  if (!extra || names.includes(extra)) return names;
  return [...names, extra];
}

export function availableItemNames(gen: CalcGen, unrestricted: boolean, extra = ''): string[] {
  if (unrestricted) return withCurrentItem(itemNames(gen), extra);
  if (gen === 0) return withCurrentItem([...CHAMPIONS_ITEMS], extra);
  return withCurrentItem(inGameItems(gen), extra);
}

export function filterSetdex(dex: Setdex, allowed: ReadonlySet<string> | undefined): Setdex {
  if (!allowed) return dex;
  const out: Setdex = {};
  for (const [species, sets] of Object.entries(dex)) {
    if (allowed.has(species)) out[species] = sets;
  }
  return out;
}

function withLegalMoves(names: string[], gen: CalcGen, extra: string[] = []): string[] {
  const legal = new Set(moveNames(gen));
  const out = ['(No Move)'];
  const seen = new Set(out);
  for (const name of [...names, ...extra]) {
    if (!name || seen.has(name) || (name !== '(No Move)' && !legal.has(name))) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

async function loadChampionsMoves(): Promise<Record<string, string[]>> {
  if (championsMoves) return championsMoves;
  const res = await fetch(CHAMPIONS_LEARNSETS_URL);
  if (!res.ok) throw new Error(String(res.status));
  const payload = (await res.json()) as Record<string, {moves?: {name: string}[]}>;
  const out: Record<string, string[]> = {};
  for (const [species, raw] of Object.entries(payload)) {
    out[species] = (raw.moves ?? []).map((move) => move.name);
  }
  championsMoves = out;
  return out;
}

async function learnableFromDex(gen: GenerationNum, species: string): Promise<string[] | undefined> {
  const learned = await gens.get(gen).learnsets.learnable(species, restrictionFor(gen));
  if (!learned) return undefined;
  const names: string[] = [];
  for (const id of Object.keys(learned)) {
    const move = gens.get(gen).moves.get(id);
    if (move) names.push(move.name);
  }
  return names;
}

export async function loadLearnableMoves(gen: CalcGen, species: string, extra: string[] = []): Promise<string[]> {
  const all = withLegalMoves(moveNames(gen), gen, extra);
  try {
    if (gen === 0) {
      const dex = await loadChampionsMoves();
      const names = dex[species] ?? dex[species.replace(/-Mega.*$/, '')];
      if (names) return withLegalMoves(names, gen, extra);
      const fallback = await learnableFromDex(9, species);
      return fallback ? withLegalMoves(fallback, gen, extra) : all;
    }
    const learned = await learnableFromDex(gen, species);
    return learned ? withLegalMoves(learned, gen, extra) : all;
  } catch {
    return all;
  }
}

export function useMoveOptions(
  gen: CalcGen,
  species: string,
  extra: string[] = [],
  unrestricted: boolean,
): string[] {
  const extraKey = extra.join('\0');
  const lookupKey = `${gen}:${species}:${extraKey}:${unrestricted}`;
  const all = useMemo(
    () => withLegalMoves(moveNames(gen), gen, extraKey ? extraKey.split('\0') : []),
    [gen, extraKey],
  );
  const [learned, setLearned] = useState<{key: string; names: string[]} | null>(null);

  useEffect(() => {
    if (unrestricted) return;
    const extras = extraKey ? extraKey.split('\0') : [];
    let cancelled = false;
    void loadLearnableMoves(gen, species, extras).then((next) => {
      if (!cancelled) setLearned({key: lookupKey, names: next});
    });
    return () => {
      cancelled = true;
    };
  }, [gen, species, extraKey, unrestricted, lookupKey]);

  return unrestricted || learned?.key !== lookupKey ? all : learned.names;
}
