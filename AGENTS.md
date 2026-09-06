# Pokémon damage calculator

This repo is a React UI for [calc.pokemonshowdown.com](https://calc.pokemonshowdown.com/). Damage math comes from [`@smogon/calc`](https://www.npmjs.com/package/@smogon/calc) on npm. Import the engine. Do not copy its source into this tree.

## Stack

Vite, React 19, TypeScript. Lint with oxlint. The only calc dependency is `@smogon/calc` `^0.11.0`.

UI state lives in `src/`. `src/lib/adapters.ts` turns that state into `Pokemon`, `Move`, `Field`, and `Side`. `src/lib/calculate.ts` is the only place that should call `calculate()`.

Dex tables (`SPECIES`, `MOVES`, `ITEMS`, `ABILITIES`, `NATURES`, `TYPE_CHART`) also come from the package. `src/lib/dex.ts` wraps them and applies gen-specific UI rules through `genSupports()`.

## Showdown and the official calculator

[Pokémon Showdown](https://pokemonshowdown.com/) is the battle simulator. The damage calculator is a sibling tool in [smogon/damage-calc](https://github.com/smogon/damage-calc). That repo publishes `@smogon/calc` and ships the vanilla UI at calc.pokemonshowdown.com.

This project rebuilds that UI in React. It is not Showdown, and it is not a fork of the engine. Match the official calc's information architecture: the same modes, the same fields, the same results. Pixel-perfect CSS is not the goal.

Import/export uses Showdown paste format (species `@` item, Ability, EVs or SPs, nature, IVs, four moves).

Gens 1–9 analysis sets and Random Battle data load at runtime from [data.pkmn.cc](https://data.pkmn.cc). Champions sets are bundled in `src/data/champions-sets.json` because that endpoint has no gen 0 dump.

## Champions vs published npm

Published `@smogon/calc` 0.11.0 types `GenerationNum` as `1 | 2 | … | 9`. GitHub master treats Pokémon Champions as gen 0, with `SPECIES[0]` as the Champions dex. The npm package still exports `SPECIES[0]` as `{}`.

Until npm ships that, Champions in this app:

- Runs gen 9 mechanics through `engineGen()` / `dexGen()`.
- Shows Stat Points in the UI and converts them for the engine (`32 SP → 252 EV`, `1 SP → 4 EV`, otherwise `SP * 8`).
- Filters the species dropdown with `src/lib/championsSpecies.ts` (the official `CHAMPIONS_LIST`). Champions is a subset of Scarlet/Violet, not the full gen 9 dex. Amoonguss is in SV and not in Champions.

## Pokémon domain this calc uses

A **set** is one species plus ability, item, nature, moves, and investment. Dropdown ids look like `Gengar (RU Nasty Plot)`. **Blank Set** is species defaults with empty moves.

The six stats are `hp atk def spa spd spe`. Gen 1 labels both special stats as Special. Investment depends on gen:

- Gens 1–2: DVs 0–15 in the UI, stored as IVs.
- Gens 3–9: IVs 0–31, EVs 0–252 per stat (510 total).
- Champions: Stat Points in the UI, mapped to EVs only when calling the engine.

Default level is 100. Champions defaults to level 50 and Doubles.

Damage is a **range**, not one number. The engine applies a random factor (typically 16 rolls). Notation is percent of the defender's HP (`%`) or 48ths (`px`).

Move category is Physical, Special, or Status. Before gen 4 there is no physical/special split: category follows the move's type. STAB is 1.5× when the move type matches the attacker. Effectiveness is a multiplier from that gen's type chart.

The **field** is weather, terrain, Trick Room / Magic Room / Wonder Room, Gravity, and per-side hazards, screens, and support (Helping Hand, Friend Guard, Tailwind, and the rest). Gen-locked buttons (Tera, Z-Moves, Dynamax, ruin abilities) belong behind `genSupports()`.

When you add a name to a dropdown, it must exist in that mode's dex. Other Metagames keeps the same 1v1 UI and leaves types, stats, abilities, items, and moves editable.
