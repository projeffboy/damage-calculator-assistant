import {Stats} from '@smogon/calc';
import type {CalcGen, MoveSlot, PokemonState, StatID} from '../lib/types';
import {GEN1_STAT_LABELS, STAT_IDS, STAT_LABELS} from '../lib/types';
import {
  abilityNames,
  genSupports,
  isMultiHit,
  moveDefaults,
  natureLabel,
  natureNames,
  otherFormes,
  teraTypeNames,
  typeNames,
} from '../lib/dex';
import {availableItemNames, useMoveOptions} from '../lib/availability';
import {analysisUrl, computedStats, maxHP, totalInvestment} from '../lib/pokemon';
import {parseSetId} from '../lib/sets';

interface PokemonPanelProps {
  gen: CalcGen;
  title: string;
  pokemon: PokemonState;
  setId: string;
  options: {id: string}[];
  availableSpecies: string[];
  unrestricted: boolean;
  onlyImported: boolean;
  hasImported: boolean;
  onOnlyImported: (value: boolean) => void;
  onClearImported: () => void;
  onChange: (pokemon: PokemonState) => void;
  onSelectSet: (id: string) => void;
}

export function PokemonPanel({
  gen,
  title,
  pokemon,
  setId,
  options,
  availableSpecies,
  unrestricted,
  onlyImported,
  hasImported,
  onOnlyImported,
  onClearImported,
  onChange,
  onSelectSet,
}: PokemonPanelProps) {
  const stats = computedStats(gen, pokemon);
  const max = maxHP(gen, pokemon);
  const hpColor = pokemon.percentHP > 50 ? 'hp-green' : pokemon.percentHP > 20 ? 'hp-yellow' : 'hp-red';
  const allowed = unrestricted ? undefined : new Set(availableSpecies);
  const formes = otherFormes(gen, pokemon.species, allowed);
  const extraMoves = pokemon.moves.map((slot) => slot.name);
  const moveOptions = useMoveOptions(gen, pokemon.species, extraMoves, unrestricted);
  const types = typeNames(gen);
  const labels = gen === 1 ? GEN1_STAT_LABELS : STAT_LABELS;
  const showSps = genSupports('sps', gen);
  const showIvs = genSupports('ivs', gen);
  const showDvs = genSupports('dvs', gen);
  const showEvs = genSupports('evs', gen) && !showSps;

  const set = (patch: Partial<PokemonState>) => onChange({...pokemon, ...patch});
  const setMove = (index: number, patch: Partial<MoveSlot>) => {
    const moves = [...pokemon.moves] as PokemonState['moves'];
    moves[index] = {...moves[index], ...patch};
    onChange({...pokemon, moves});
  };

  const setStat = (stat: StatID, field: 'baseStats' | 'ivs' | 'evs' | 'boosts', value: number) => {
    const next = {
      ...pokemon,
      [field]: {...pokemon[field], [stat]: value},
    };
    if (field === 'baseStats' || field === 'ivs' || field === 'evs') {
      const newMax = maxHP(gen, next);
      next.curHP = Math.round((pokemon.percentHP / 100) * newMax);
    }
    onChange(next);
  };

  const setHP = (curHP: number) => {
    const clamped = Math.max(0, Math.min(max, curHP));
    onChange({
      ...pokemon,
      curHP: clamped,
      percentHP: max === 0 ? 0 : Math.round((clamped / max) * 1000) / 10,
    });
  };

  const setPercent = (percent: number) => {
    const clamped = Math.max(0, Math.min(100, percent));
    onChange({
      ...pokemon,
      percentHP: clamped,
      curHP: Math.round((clamped / 100) * max),
    });
  };

  return (
    <section className="panel" aria-label={title}>
      <fieldset className="poke-info">
        <legend>{title}</legend>
        <select className="set-selector" value={setId} onChange={(e) => onSelectSet(e.target.value)}>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.id}</option>
          ))}
        </select>
        {hasImported && (
          <div className="imported-opts">
            <label>
              <input type="checkbox" checked={onlyImported} onChange={(e) => onOnlyImported(e.target.checked)} />
              {' '}Only show imported sets
            </label>
            <button type="button" className="bs-btn" onClick={onClearImported}>Clear Imported Sets</button>
          </div>
        )}

        <div className="info-group">
          <div className="row">
            <label>Type</label>
            <select value={pokemon.types[0]} onChange={(e) => set({types: [e.target.value, pokemon.types[1]]})}>
              {types.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select value={pokemon.types[1]} onChange={(e) => set({types: [pokemon.types[0], e.target.value]})}>
              <option value="">(none)</option>
              {types.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <small className="analysis">
              <a href={analysisUrl(gen, pokemon.species)} target="_blank" rel="noreferrer">Smogon analysis</a>
            </small>
          </div>
          {genSupports('tera', gen) && (
            <div className="row">
              <label>Tera Type</label>
              <select value={pokemon.teraType} onChange={(e) => set({teraType: e.target.value})}>
                {teraTypeNames(gen).map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <input type="checkbox" checked={pokemon.teraActive} onChange={(e) => set({teraActive: e.target.checked})} title="Terastallized?" />
            </div>
          )}
          {formes.length > 0 && (
            <div className="row">
              <label>Forme</label>
              <select
                value={pokemon.species}
                onChange={(e) => {
                  const id = parseSetId(setId);
                  onSelectSet(`${e.target.value} (${id?.set ?? 'Blank Set'})`);
                }}
              >
                {formes.map((forme) => <option key={forme} value={forme}>{forme}</option>)}
              </select>
            </div>
          )}
          {genSupports('gender', gen) && (
            <div className="row">
              <label>Gender</label>
              <select value={pokemon.gender} onChange={(e) => set({gender: e.target.value as PokemonState['gender']})}>
                <option value="">(Select)</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="N">Genderless</option>
              </select>
            </div>
          )}
          {genSupports('gmax', gen) && (
            <div className="row">
              <label>G-Max</label>
              <input type="checkbox" checked={pokemon.gmax} onChange={(e) => set({gmax: e.target.checked})} />
            </div>
          )}
          <div className="row">
            <label>Level</label>
            <input type="number" className="narrow" value={pokemon.level} min={1} max={100} onChange={(e) => set({level: Number(e.target.value)})} />
          </div>
        </div>

        <table className="stat-table">
          <thead>
            <tr>
              <th></th>
              <th>Base</th>
              {showIvs && <th>IVs</th>}
              {showEvs && <th>EVs</th>}
              {showSps && <th>SPs</th>}
              {showDvs && <th>DVs</th>}
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {STAT_IDS.filter((stat) => !(gen === 1 && stat === 'spd')).map((stat) => (
              <tr key={stat}>
                <th>{labels[stat]}</th>
                <td>
                  <input
                    type="number"
                    className="narrow"
                    value={pokemon.baseStats[stat]}
                    onChange={(e) => setStat(stat, 'baseStats', Number(e.target.value))}
                  />
                </td>
                {showIvs && (
                  <td>
                    <input
                      type="number"
                      className="narrow"
                      min={0}
                      max={31}
                      value={pokemon.ivs[stat]}
                      onChange={(e) => setStat(stat, 'ivs', Number(e.target.value))}
                    />
                  </td>
                )}
                {(showEvs || showSps) && (
                  <td>
                    <input
                      type="number"
                      className="narrow"
                      min={0}
                      max={showSps ? 32 : 252}
                      value={pokemon.evs[stat]}
                      onChange={(e) => setStat(stat, 'evs', Number(e.target.value))}
                    />
                  </td>
                )}
                {showDvs && (
                  <td>
                    <input
                      type="number"
                      className="narrow"
                      min={0}
                      max={15}
                      disabled={stat === 'hp'}
                      value={stat === 'hp'
                        ? Stats.getHPDV({
                          atk: pokemon.ivs.atk,
                          def: pokemon.ivs.def,
                          spe: pokemon.ivs.spe,
                          spc: pokemon.ivs.spa,
                        })
                        : Stats.IVToDV(pokemon.ivs[stat])}
                      onChange={(e) => setStat(stat, 'ivs', Stats.DVToIV(Number(e.target.value)))}
                    />
                  </td>
                )}
                <td><span className="total">{stats[stat]}</span></td>
                <td>
                  {stat !== 'hp' && (
                    <select value={pokemon.boosts[stat]} onChange={(e) => setStat(stat, 'boosts', Number(e.target.value))}>
                      {[6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6].map((boost) => (
                        <option key={boost} value={boost}>{boost === 0 ? '--' : boost > 0 ? `+${boost}` : String(boost)}</option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
            <tr>
              <th>Total</th>
              <td></td>
              {showIvs && <td></td>}
              {(showEvs || showSps) && <td>{totalInvestment(pokemon)}</td>}
              {showDvs && <td></td>}
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {genSupports('natures', gen) && (
          <div className="row">
            <label>Nature</label>
            <select value={pokemon.nature} onChange={(e) => set({nature: e.target.value})}>
              {natureNames().map((nature) => (
                <option key={nature} value={nature}>{natureLabel(nature)}</option>
              ))}
            </select>
          </div>
        )}
        {genSupports('abilities', gen) && (
          <div className="row">
            <label>Ability</label>
            <select value={pokemon.ability} onChange={(e) => set({ability: e.target.value})}>
              <option value="">(other)</option>
              {abilityNames(gen).map((ability) => <option key={ability} value={ability}>{ability}</option>)}
            </select>
            <input type="checkbox" checked={pokemon.abilityOn} onChange={(e) => set({abilityOn: e.target.checked})} title="Ability active?" />
          </div>
        )}
        {genSupports('items', gen) && (
          <div className="row">
            <label>Item</label>
            <select value={pokemon.item} onChange={(e) => set({item: e.target.value})}>
              <option value="">(none)</option>
              {availableItemNames(gen, unrestricted, pokemon.item).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        )}
        <div className="row">
          <label>Status</label>
          <select
            value={pokemon.status}
            onChange={(e) => set({status: e.target.value as PokemonState['status']})}
          >
            <option value="">Healthy</option>
            <option value="psn">Poisoned</option>
            <option value="tox">Badly Poisoned</option>
            <option value="brn">Burned</option>
            <option value="par">Paralyzed</option>
            <option value="slp">Asleep</option>
            <option value="frz">Frozen</option>
          </select>
          {pokemon.status === 'tox' && (
            <select value={pokemon.toxicCounter} onChange={(e) => set({toxicCounter: Number(e.target.value)})}>
              {Array.from({length: 15}, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}/16</option>
              ))}
            </select>
          )}
        </div>

        <div className="row hp-row">
          <label>Current HP</label>
          <input type="number" className="narrow" value={pokemon.curHP} onChange={(e) => setHP(Number(e.target.value))} />
          /{max} (
          <input type="number" className="narrow" value={pokemon.percentHP} onChange={(e) => setPercent(Number(e.target.value))} />
          %)
          {genSupports('dynamax', gen) && (
            <label className={pokemon.isDynamaxed ? 'btn on' : 'btn'}>
              <input type="checkbox" className="visually-hidden" checked={pokemon.isDynamaxed} onChange={(e) => set({isDynamaxed: e.target.checked})} />
              Dynamax
            </label>
          )}
        </div>
        <div className="hpbar">
          <div className={`hpbar-fill ${hpColor}`} style={{width: `${Math.max(0, Math.min(100, pokemon.percentHP))}%`}} />
        </div>

        {pokemon.moves.map((move, index) => (
          <MoveRow
            key={index}
            gen={gen}
            moves={moveOptions}
            move={move}
            onChange={(patch) => setMove(index, patch)}
          />
        ))}
      </fieldset>
    </section>
  );
}

function MoveRow({
  gen,
  moves,
  move,
  onChange,
}: {
  gen: CalcGen;
  moves: string[];
  move: MoveSlot;
  onChange: (patch: Partial<MoveSlot>) => void;
}) {
  const types = typeNames(gen);
  const multi = isMultiHit(gen, move.name);
  return (
    <div className="move-row">
      <select
        value={move.name}
        onChange={(e) => {
          const defaults = moveDefaults(gen, e.target.value);
          onChange({name: e.target.value, ...defaults});
        }}
      >
        {moves.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      <input type="number" className="narrow" value={move.bp} onChange={(e) => onChange({bp: Number(e.target.value)})} />
      <select value={move.type} onChange={(e) => onChange({type: e.target.value})}>
        {types.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
      {genSupports('split', gen) && (
        <select value={move.category} onChange={(e) => onChange({category: e.target.value as MoveSlot['category']})}>
          <option value="Physical">Physical</option>
          <option value="Special">Special</option>
        </select>
      )}
      <label className={move.isCrit ? 'btn on' : 'btn'}>
        <input type="checkbox" className="visually-hidden" checked={move.isCrit} onChange={(e) => onChange({isCrit: e.target.checked})} />
        Crit
      </label>
      {genSupports('z', gen) && (
        <label className={move.useZ ? 'btn on' : 'btn'}>
          <input type="checkbox" className="visually-hidden" checked={move.useZ} onChange={(e) => onChange({useZ: e.target.checked})} />
          Z
        </label>
      )}
      {genSupports('tera', gen) && (
        <label className={move.isStellarFirstUse ? 'btn on' : 'btn'}>
          <input type="checkbox" className="visually-hidden" checked={move.isStellarFirstUse} onChange={(e) => onChange({isStellarFirstUse: e.target.checked})} />
          Stellar
        </label>
      )}
      {multi && (
        <select value={move.hits} onChange={(e) => onChange({hits: Number(e.target.value)})}>
          {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} hits</option>)}
        </select>
      )}
    </div>
  );
}
