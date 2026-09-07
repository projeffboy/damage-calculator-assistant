import {Stats} from '@smogon/calc';
import type {CalcGen, CalcSet, PokemonState, Setdex, StatID, StatsTable} from './types';
import {STAT_IDS} from './types';
import {itemNames, speciesDex} from './dex';
import {evsForEngine} from './adapters';

const STAT_PARSE: Record<string, StatID> = {
  hp: 'hp',
  atk: 'atk',
  attack: 'atk',
  def: 'def',
  defense: 'def',
  spa: 'spa',
  spatk: 'spa',
  'sp. atk': 'spa',
  'special attack': 'spa',
  spc: 'spa',
  special: 'spa',
  spd: 'spd',
  spdef: 'spd',
  'sp. def': 'spd',
  'special defense': 'spd',
  spe: 'spe',
  speed: 'spe',
};

function parseStatLine(line: string): Partial<StatsTable> {
  const out: Partial<StatsTable> = {};
  const body = line.replace(/^(EVs|IVs):\s*/i, '');
  for (const part of body.split('/')) {
    const match = part.trim().match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    const stat = STAT_PARSE[match[2].trim().toLowerCase()];
    if (stat) out[stat] = Number(match[1]);
  }
  return out;
}

function findSpecies(line: string, gen: CalcGen): {name: string; rest: string} | undefined {
  const dex = speciesDex(gen);
  const cleaned = line.replace(/\s+@\s+.+$/, '').trim();
  const parts = cleaned.split(/[()]/).map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    if (dex[part]) return {name: part, rest: line};
  }
  const at = line.split('@')[0]?.trim() ?? line;
  if (dex[at]) return {name: at, rest: line};
  return undefined;
}

function parseBlock(block: string, gen: CalcGen): {species: string; set: CalcSet} | undefined {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return undefined;
  const header = findSpecies(lines[0], gen);
  if (!header) return undefined;
  const species = header.name;
  const set: CalcSet = {moves: ['(No Move)', '(No Move)', '(No Move)', '(No Move)']};
  const at = lines[0].split('@')[1];
  if (at) {
    const item = at.trim();
    if (itemNames(gen).includes(item) || item) set.item = item;
  }
  const genderMatch = lines[0].match(/\(([MFN])\)/);
  if (genderMatch) set.gender = genderMatch[1] as 'M' | 'F' | 'N';
  const moves: string[] = [];
  for (const line of lines.slice(1)) {
    if (line.startsWith('- ')) {
      moves.push(line.slice(2).replace(/\s*\/.+$/, '').trim());
      continue;
    }
    if (line.startsWith('Ability:')) set.ability = line.slice(8).trim();
    else if (line.startsWith('Level:')) set.level = Number(line.slice(6).trim());
    else if (line.startsWith('Tera Type:')) set.teraType = line.slice(10).trim();
    else if (line.startsWith('EVs:')) set.evs = parseStatLine(line);
    else if (line.startsWith('IVs:')) set.ivs = parseStatLine(line);
    else if (line.endsWith('Nature')) set.nature = line.replace('Nature', '').trim();
  }
  set.moves = [...moves, '(No Move)', '(No Move)', '(No Move)', '(No Move)'].slice(0, 4);
  return {species, set};
}

export function importOrderedSets(text: string, gen: CalcGen): {species: string; set: CalcSet}[] {
  return text.replace(/\r/g, '').split(/\n{2,}/).flatMap((block) => {
    const parsed = parseBlock(block, gen);
    return parsed ? [parsed] : [];
  });
}

export function importSets(text: string, gen: CalcGen, setName = 'Custom Set'): Setdex {
  const dex: Setdex = {};
  let index = 1;
  for (const {species, set} of importOrderedSets(text, gen)) {
    if (!dex[species]) dex[species] = {};
    const name = index === 1 ? setName : `${setName} ${index}`;
    dex[species][name] = set;
    index += 1;
  }
  return dex;
}

export function exportPokemon(gen: CalcGen, poke: PokemonState): string {
  const lines: string[] = [];
  let header = poke.species;
  if (poke.gender === 'M' || poke.gender === 'F') header += ` (${poke.gender})`;
  if (poke.item) header += ` @ ${poke.item}`;
  lines.push(header);
  if (poke.ability) lines.push(`Ability: ${poke.ability}`);
  if (poke.level !== 100) lines.push(`Level: ${poke.level}`);
  if ((gen === 9 || gen === 0) && poke.teraType) lines.push(`Tera Type: ${poke.teraType}`);
  if (poke.gmax) lines.push('Gigantamax: Yes');
  const evs = gen === 0 ? evsForEngine(gen, poke.evs) : poke.evs;
  const evParts: string[] = [];
  for (const stat of STAT_IDS) {
    if (evs[stat] > 0) evParts.push(`${evs[stat]} ${Stats.displayStat(stat)}`);
  }
  if (evParts.length > 0) lines.push(`EVs: ${evParts.join(' / ')}`);
  if (poke.nature) lines.push(`${poke.nature} Nature`);
  const ivParts: string[] = [];
  for (const stat of STAT_IDS) {
    if (poke.ivs[stat] < 31) ivParts.push(`${poke.ivs[stat]} ${Stats.displayStat(stat)}`);
  }
  if (ivParts.length > 0) lines.push(`IVs: ${ivParts.join(' / ')}`);
  for (const move of poke.moves) {
    if (move.name && move.name !== '(No Move)') lines.push(`- ${move.name}`);
  }
  return lines.join('\n');
}

export function exportTeam(gen: CalcGen, team: (PokemonState | null)[]): string {
  return team
    .filter((poke): poke is PokemonState => Boolean(poke))
    .map((poke) => exportPokemon(gen, poke))
    .join('\n\n');
}
