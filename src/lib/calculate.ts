import {calculate} from '@smogon/calc';
import type {Result} from '@smogon/calc';
import type {CalcGen, FieldState, Notation, PokemonState} from './types';
import {engineGen, toField, toMove, toPokemon} from './adapters';

export interface MoveResult {
  name: string;
  desc: string;
  fullDesc: string;
  range: [number, number];
  rolls: string;
  ko: string;
}

export interface DualResults {
  left: MoveResult[];
  right: MoveResult[];
  p1Speed: number;
  p2Speed: number;
}

function rollsText(damage: Result['damage']): string {
  if (typeof damage === 'number') return String(damage);
  if (damage.length === 0) return '';
  if (typeof damage[0] === 'number') {
    return damage.filter((n): n is number => typeof n === 'number').join(', ');
  }
  return damage
    .filter((hit): hit is number[] => Array.isArray(hit))
    .map((hit) => hit.join(', '))
    .join('\n');
}

function moveResult(result: Result, notation: Notation): MoveResult {
  return {
    name: result.move.name,
    desc: result.moveDesc(notation),
    fullDesc: result.fullDesc(notation, false),
    range: result.range(),
    rolls: rollsText(result.damage),
    ko: result.kochance(false).text,
  };
}

export function calculateSides(
  gen: CalcGen,
  p1: PokemonState,
  p2: PokemonState,
  field: FieldState,
  notation: Notation,
): DualResults {
  const generation = engineGen(gen);
  const attacker = toPokemon(gen, p1, field.p1.plusOneAll);
  const defender = toPokemon(gen, p2, field.p2.plusOneAll);
  const p1Field = toField(field, false);
  const p2Field = toField(field, true);
  const left: MoveResult[] = [];
  const right: MoveResult[] = [];
  for (let i = 0; i < 4; i++) {
    left.push(
      moveResult(
        calculate(generation, attacker, defender, toMove(gen, p1, p1.moves[i]), p1Field),
        notation,
      ),
    );
    right.push(
      moveResult(
        calculate(generation, defender, attacker, toMove(gen, p2, p2.moves[i]), p2Field),
        notation,
      ),
    );
  }
  return {
    left,
    right,
    p1Speed: attacker.stats.spe,
    p2Speed: defender.stats.spe,
  };
}

export interface BulkRow {
  id: string;
  move: string;
  damage: string;
  pixels: string;
  ko: string;
  type1: string;
  type2: string;
  ability: string;
  item: string;
}

export function calculateBulk(
  gen: CalcGen,
  subject: PokemonState,
  targets: {id: string; pokemon: PokemonState}[],
  field: FieldState,
  mode: 'one-vs-all' | 'all-vs-one',
): BulkRow[] {
  const generation = engineGen(gen);
  const rows: BulkRow[] = [];
  for (const target of targets) {
    const attackerState = mode === 'one-vs-all' ? subject : target.pokemon;
    const defenderState = mode === 'one-vs-all' ? target.pokemon : subject;
    const attacker = toPokemon(gen, attackerState, field.p1.plusOneAll);
    const defender = toPokemon(gen, defenderState, field.p2.plusOneAll);
    const calcField = toField(field, mode === 'all-vs-one');
    let best: BulkRow | undefined;
    let highest = -1;
    for (let i = 0; i < 4; i++) {
      const result = calculate(
        generation,
        attacker,
        defender,
        toMove(gen, attackerState, attackerState.moves[i]),
        calcField,
      );
      const [min, max] = result.range();
      if (max <= highest) continue;
      highest = max;
      const hp = defender.maxHP();
      const minPct = Math.floor((min * 1000) / hp) / 10;
      const maxPct = Math.floor((max * 1000) / hp) / 10;
      const minPx = Math.floor((min * 48) / hp);
      const maxPx = Math.floor((max * 48) / hp);
      const focus = mode === 'one-vs-all' ? defender : attacker;
      best = {
        id: target.id,
        move: result.move.name.replace('Hidden Power', 'HP'),
        damage: `${minPct} - ${maxPct}%`,
        pixels: `${minPx} - ${maxPx}px`,
        ko: result.kochance(false).text || '',
        type1: focus.types[0],
        type2: focus.types[1] ?? '',
        ability: focus.ability ?? '',
        item: focus.item ?? '',
      };
    }
    if (best) rows.push(best);
  }
  return rows;
}
