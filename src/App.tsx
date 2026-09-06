import {useEffect, useMemo, useState} from 'react';
import {Toolbar} from './components/Toolbar';
import {Results} from './components/Results';
import {PokemonPanel} from './components/PokemonPanel';
import {FieldPanel} from './components/FieldPanel';
import {ImportExport} from './components/ImportExport';
import {Honkalculate} from './components/Honkalculate';
import type {CalcGen, GenerationNum, Mode, Notation, PokemonState, Setdex, Theme} from './lib/types';
import {speciesNames} from './lib/dex';
import {applySet, applySpecies, defaultPokemon} from './lib/pokemon';
import {defaultField} from './lib/field';
import {calculateBulk, calculateSides} from './lib/calculate';
import {loadRandoms, loadSetdex, mergeSetdex, parseSetId, setOptions, tiersFromDex} from './lib/sets';
import {exportPokemon, importSets} from './lib/importExport';

function calcGenFor(mode: Mode, gen: GenerationNum): CalcGen {
  return mode === 'champions' ? 0 : gen;
}

function blankId(species: string): string {
  return `${species} (Blank Set)`;
}

function buildOptions(species: string[], dex: Setdex, imported: Setdex, onlyImported: boolean): {id: string}[] {
  if (onlyImported) {
    return setOptions(imported).map((option) => ({id: option.id}));
  }
  const options: {id: string}[] = [];
  for (const name of species) {
    options.push({id: blankId(name)});
    const sets = {...dex[name], ...imported[name]};
    for (const setName of Object.keys(sets)) {
      options.push({id: `${name} (${setName})`});
    }
  }
  return options;
}

function pokemonFromSetId(id: string, gen: CalcGen, dex: Setdex, current: PokemonState): PokemonState {
  const parsed = parseSetId(id);
  if (!parsed) return current;
  if (parsed.set === 'Blank Set') return applySpecies(current, parsed.species, gen);
  const set = dex[parsed.species]?.[parsed.set];
  if (!set) return applySpecies(current, parsed.species, gen);
  return applySet(current, parsed.species, set, gen);
}

function readParams(): {gen: GenerationNum; mode: Mode} {
  const params = new URLSearchParams(window.location.search);
  const genRaw = Number(params.get('gen'));
  const gen = genRaw >= 1 && genRaw <= 9 ? (genRaw as GenerationNum) : 9;
  const modeRaw = params.get('mode');
  const modes: Mode[] = ['one-vs-one', 'one-vs-all', 'all-vs-one', 'champions', 'randoms', 'oms'];
  const mode = modes.includes(modeRaw as Mode) ? (modeRaw as Mode) : 'one-vs-one';
  return {gen, mode};
}

export default function App() {
  const initial = readParams();
  const [gen, setGen] = useState<GenerationNum>(initial.mode === 'champions' ? 9 : initial.gen);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [notation, setNotation] = useState<Notation>('%');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'auto');
  const calcGen = calcGenFor(mode, gen);

  const [p1, setP1] = useState(() => defaultPokemon(calcGen));
  const [p2, setP2] = useState(() => defaultPokemon(calcGen));
  const [p1Id, setP1Id] = useState(() => blankId(defaultPokemon(calcGen).species));
  const [p2Id, setP2Id] = useState(() => blankId(defaultPokemon(calcGen).species));
  const [field, setField] = useState(() => {
    const next = defaultField();
    if (initial.mode === 'champions') next.gameType = 'Doubles';
    return next;
  });
  const [selected, setSelected] = useState<{side: 0 | 1; move: number}>({side: 0, move: 0});
  const [setdex, setSetdex] = useState<Setdex>({});
  const [imported, setImported] = useState<Setdex>({});
  const [onlyImported, setOnlyImported] = useState(false);
  const [importText, setImportText] = useState('');
  const [importName, setImportName] = useState('Custom Set');
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (mode !== 'champions' && gen !== 9) params.set('gen', String(gen));
    if (mode !== 'one-vs-one') params.set('mode', mode);
    const qs = params.toString();
    window.history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname);
  }, [gen, mode]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const dark =
      theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    const load = mode === 'randoms' ? loadRandoms : loadSetdex;
    void load(calcGen).then((dex) => {
      if (cancelled) return;
      setSetdex(dex);
      const loaded = setOptions(dex);
      if (loaded.length === 0) return;
      const first = loaded[0];
      const second = loaded[1] ?? loaded[0];
      setP1Id(first.id);
      setP2Id(second.id);
      setP1(pokemonFromSetId(first.id, calcGen, dex, defaultPokemon(calcGen, first.species)));
      setP2(pokemonFromSetId(second.id, calcGen, dex, defaultPokemon(calcGen, second.species)));
    });
    return () => {
      cancelled = true;
    };
  }, [calcGen, mode]);

  const species = useMemo(() => speciesNames(calcGen), [calcGen]);
  const combinedDex = useMemo(() => mergeSetdex(setdex, imported), [setdex, imported]);
  const options = useMemo(
    () => buildOptions(species, setdex, imported, onlyImported),
    [species, setdex, imported, onlyImported],
  );
  const hasImported = Object.keys(imported).length > 0;
  const bulk = mode === 'one-vs-all' || mode === 'all-vs-one';
  const dual = !bulk;

  const resultState = useMemo(() => {
    if (!dual) return undefined;
    try {
      return {ok: true as const, value: calculateSides(calcGen, p1, p2, field, notation)};
    } catch (err) {
      return {ok: false as const, error: err instanceof Error ? err.message : 'Calculation failed'};
    }
  }, [calcGen, p1, p2, field, notation, dual]);
  const results = resultState?.ok ? resultState.value : undefined;
  const calcError = resultState && !resultState.ok ? resultState.error : '';

  const tiers = useMemo(() => tiersFromDex(setdex), [setdex]);
  const bulkRows = useMemo(() => {
    if (!bulk || selectedTiers.length === 0) return [];
    const targets = [];
    for (const option of setOptions(setdex)) {
      const tier = option.set.split(' ')[0] ?? '';
      if (!selectedTiers.includes(tier)) continue;
      const set = setdex[option.species]?.[option.set];
      if (!set) continue;
      targets.push({
        id: option.id,
        pokemon: applySet(defaultPokemon(calcGen, option.species), option.species, set, calcGen),
      });
    }
    try {
      return calculateBulk(calcGen, p1, targets, field, mode);
    } catch {
      return [];
    }
  }, [bulk, selectedTiers, setdex, calcGen, p1, field, mode]);

  function changeGen(next: GenerationNum) {
    setGen(next);
    const g = calcGenFor(mode, next);
    const poke = defaultPokemon(g);
    setP1(poke);
    setP2(defaultPokemon(g));
    setP1Id(blankId(poke.species));
    setP2Id(blankId(poke.species));
    setField(defaultField());
    setSelectedTiers([]);
  }

  function changeMode(next: Mode) {
    setMode(next);
    const g = calcGenFor(next, gen);
    const poke = defaultPokemon(g);
    setP1(poke);
    setP2(defaultPokemon(g));
    setP1Id(blankId(poke.species));
    setP2Id(blankId(poke.species));
    const nextField = defaultField();
    if (next === 'champions') nextField.gameType = 'Doubles';
    setField(nextField);
    setSelectedTiers([]);
  }

  function selectP1(id: string) {
    setP1Id(id);
    setP1(pokemonFromSetId(id, calcGen, combinedDex, p1));
  }

  function selectP2(id: string) {
    setP2Id(id);
    setP2(pokemonFromSetId(id, calcGen, combinedDex, p2));
  }

  function doImport() {
    const extra = importSets(importText, calcGen, importName.trim() || 'Custom Set');
    setImported(mergeSetdex(imported, extra));
  }

  function exportSide(side: 0 | 1) {
    const poke = side === 0 ? p1 : p2;
    setImportText(exportPokemon(calcGen, poke));
  }

  return (
    <div className="page">
      <header className="topbar">
        <strong>Pokémon Damage Calculator</strong>
        <span className="credit">Powered by @smogon/calc</span>
      </header>
      <main className="wrapper">
        <h1 className="title-text">Pokémon Damage Calculator</h1>
        {mode === 'champions' && (
          <p className="om-note">
            Champions uses Stat Points in the UI. The published @smogon/calc engine has no Champions
            formula yet, so those points are converted to gen 9 EVs (32 SP → 252 EV) for damage math.
          </p>
        )}
        <Toolbar
          gen={calcGen === 0 ? 0 : gen}
          mode={mode}
          notation={notation}
          theme={theme}
          onGen={changeGen}
          onMode={changeMode}
          onNotation={setNotation}
          onTheme={setTheme}
        />
        {calcError && <p className="error">{calcError}</p>}
        {dual && results && (
          <Results
            left={results.left}
            right={results.right}
            selected={selected}
            onSelect={(side, move) => setSelected({side, move})}
            p1Speed={results.p1Speed}
            p2Speed={results.p2Speed}
          />
        )}
        <div className={bulk ? 'columns bulk' : 'columns'}>
          <PokemonPanel
            gen={calcGen}
            title={bulk && mode === 'all-vs-one' ? 'Pokémon 2' : 'Pokémon 1'}
            pokemon={p1}
            setId={p1Id}
            options={options}
            onlyImported={onlyImported}
            hasImported={hasImported}
            onOnlyImported={setOnlyImported}
            onClearImported={() => setImported({})}
            onChange={setP1}
            onSelectSet={selectP1}
          />
          {dual && (
            <>
              <FieldPanel
                gen={calcGen}
                field={field}
                onChange={setField}
                onExportLeft={() => exportSide(0)}
                onExportRight={() => exportSide(1)}
              />
              <PokemonPanel
                gen={calcGen}
                title="Pokémon 2"
                pokemon={p2}
                setId={p2Id}
                options={options}
                onlyImported={onlyImported}
                hasImported={hasImported}
                onOnlyImported={setOnlyImported}
                onClearImported={() => setImported({})}
                onChange={setP2}
                onSelectSet={selectP2}
              />
            </>
          )}
          {bulk && (
            <FieldPanel
              gen={calcGen}
              field={field}
              onChange={setField}
              onExportLeft={() => exportSide(0)}
              onExportRight={() => exportSide(0)}
            />
          )}
        </div>
        {bulk && (
          <Honkalculate
            mode={mode}
            tiers={tiers}
            selected={selectedTiers}
            onToggle={(tier) =>
              setSelectedTiers((current) =>
                current.includes(tier) ? current.filter((item) => item !== tier) : [...current, tier],
              )
            }
            rows={bulkRows}
            loading={false}
          />
        )}
        <ImportExport
          text={importText}
          name={importName}
          onText={setImportText}
          onName={setImportName}
          onImport={doImport}
        />
        <footer className="footer">
          Created as a React UI on top of <a href="https://github.com/smogon/damage-calc">@smogon/calc</a>.
          Original calculator by Honko, Austin, Kris, and others.
        </footer>
      </main>
    </div>
  );
}
