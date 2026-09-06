# Pokémon Damage Calculator (React)

A React rebuild of the [Pokémon Showdown damage calculator](https://calc.pokemonshowdown.com/). Damage math comes from [`@smogon/calc`](https://www.npmjs.com/package/@smogon/calc) via npm. This repo does not vendor the engine source.

Smogon analysis sets and Random Battle data are fetched at runtime from [data.pkmn.cc](https://data.pkmn.cc).

## Scripts

```sh
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

`npm run build` typechecks and emits a production bundle.

## Modes

- One vs One
- One vs All / All vs One
- Champions (gen 0 mechanics in `@smogon/calc`; species lists fall back to gen 9 because the published package has no Champions dex)
- Random Battles
- Other Metagames (same calculator with fully editable types, stats, abilities, items, and moves)
