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
  typeNames,
} from '../lib/dex';
import {availableItemNames, useMoveOptions} from '../lib/availability';
import {applySpecies, computedStats, maxHP, totalInvestment} from '../lib/pokemon';
import {SpeciesPicker} from './SpeciesPicker';

interface VisualPokemonCardProps {
  gen: CalcGen;
  title: string;
  pokemon: PokemonState;
  speciesNames: string[];
  unrestricted: boolean;
  activeMove: number | null;
  previewRemain?: number;
  onChange: (pokemon: PokemonState) => void;
  onUseMove: (index: number) => void;
  onApplyPreview?: () => void;
}

export function VisualPokemonCard({
  gen,
  title,
  pokemon,
  speciesNames,
  unrestricted,
  activeMove,
  previewRemain,
  onChange,
  onUseMove,
  onApplyPreview,
}: VisualPokemonCardProps) {
  const stats = computedStats(gen, pokemon);
  const max = maxHP(gen, pokemon);
  const allowed = unrestricted ? undefined : new Set(speciesNames);
  const formes = otherFormes(gen, pokemon.species, allowed);
  const extraMoves = pokemon.moves.map((slot) => slot.name);
  const moveOptions = useMoveOptions(gen, pokemon.species, extraMoves, unrestricted);
  const types = typeNames(gen);
  const labels = gen === 1 ? GEN1_STAT_LABELS : STAT_LABELS;
  const showSps = genSupports('sps', gen);
  const showIvs = genSupports('ivs', gen);
  const showDvs = genSupports('dvs', gen);
  const showEvs = genSupports('evs', gen) && !showSps;
  const legacyDvs = gen === 1 || gen === 2;
  const hpColor = pokemon.percentHP > 50 ? 'hp-green' : pokemon.percentHP > 20 ? 'hp-yellow' : 'hp-red';

  const set = (patch: Partial<PokemonState>) => onChange({...pokemon, ...patch});
  const setMove = (index: number, patch: Partial<MoveSlot>) => {
    const moves = [...pokemon.moves] as PokemonState['moves'];
    moves[index] = {...moves[index], ...patch};
    onChange({...pokemon, moves});
  };
  const setStat = (stat: StatID, field: 'baseStats' | 'ivs' | 'evs' | 'boosts', value: number) => {
    const next = {...pokemon, [field]: {...pokemon[field], [stat]: value}};
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
    <section className="panel visual-card" aria-label={title}>
      <fieldset className="poke-info">
        <legend>{title}</legend>
        <SpeciesPicker
          species={pokemon.species}
          names={speciesNames}
          onChange={(species) => onChange(applySpecies(pokemon, species, gen))}
        />
        {formes.length > 0 && (
          <div className="row">
            <label>Forme</label>
            <select value={pokemon.species} onChange={(e) => onChange(applySpecies(pokemon, e.target.value, gen))}>
              {[pokemon.species, ...formes.filter((name) => name !== pokemon.species)].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="row">
          <label>Type</label>
          <select value={pokemon.types[0]} onChange={(e) => set({types: [e.target.value, pokemon.types[1]]})}>
            {types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select value={pokemon.types[1]} onChange={(e) => set({types: [pokemon.types[0], e.target.value]})}>
            <option value="">(none)</option>
            {types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
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
        {genSupports('items', gen) && (
          <div className="row">
            <label>Item</label>
            <select value={pokemon.item} onChange={(e) => set({item: e.target.value})}>
              <option value="">(none)</option>
              {availableItemNames(gen, unrestricted, pokemon.item).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        )}
        {genSupports('abilities', gen) && (
          <div className="row">
            <label>Ability</label>
            <select value={pokemon.ability} onChange={(e) => set({ability: e.target.value})}>
              <option value="">(other)</option>
              {abilityNames(gen).map((ability) => (
                <option key={ability} value={ability}>{ability}</option>
              ))}
            </select>
            <input
              type="checkbox"
              checked={pokemon.abilityOn}
              onChange={(e) => set({abilityOn: e.target.checked})}
              title="Ability active?"
            />
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
        </div>
        <div className="row">
          <label>Level</label>
          <input
            type="number"
            className="narrow"
            value={pokemon.level}
            onChange={(e) => set({level: Number(e.target.value)})}
          />
        </div>
        <div className="row hp-row">
          <label>Current HP</label>
          <input
            type="number"
            className="narrow"
            value={pokemon.curHP}
            onChange={(e) => setHP(Number(e.target.value))}
          />
          /{max} (
          <input
            type="number"
            className="narrow"
            value={pokemon.percentHP}
            onChange={(e) => setPercent(Number(e.target.value))}
          />
          %)
        </div>
        <div className="hpbar">
          <div className={`hpbar-fill ${hpColor}`} style={{width: `${Math.max(0, Math.min(100, pokemon.percentHP))}%`}} />
        </div>
        {onApplyPreview && previewRemain !== undefined && previewRemain !== pokemon.curHP && (
          <button type="button" className="bs-btn visual-apply-hp" onClick={onApplyPreview}>
            Set HP to {previewRemain} after this combo
          </button>
        )}

        <details className="visual-spreads">
          <summary>Spreads</summary>
          <table className="stat-table">
            <thead>
              <tr>
                <th></th>
                <th>Base</th>
                {showIvs && <th>{legacyDvs ? 'DVs' : 'IVs'}</th>}
                {(showEvs || showSps) && <th>{showSps ? 'SP' : 'EVs'}</th>}
                {showDvs && <th>DVs</th>}
                <th>Stat</th>
                <th>+/−</th>
              </tr>
            </thead>
            <tbody>
              {STAT_IDS.map((stat) => (
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
                        value={legacyDvs ? Stats.IVToDV(pokemon.ivs[stat]) : pokemon.ivs[stat]}
                        onChange={(e) =>
                          setStat(
                            stat,
                            'ivs',
                            legacyDvs ? Stats.DVToIV(Number(e.target.value)) : Number(e.target.value),
                          )
                        }
                      />
                    </td>
                  )}
                  {(showEvs || showSps) && (
                    <td>
                      <input
                        type="number"
                        className="narrow"
                        value={pokemon.evs[stat]}
                        onChange={(e) => setStat(stat, 'evs', Number(e.target.value))}
                      />
                    </td>
                  )}
                  {showDvs && <td></td>}
                  <td>{stats[stat]}</td>
                  <td>
                    {stat !== 'hp' && (
                      <select
                        value={pokemon.boosts[stat]}
                        onChange={(e) => setStat(stat, 'boosts', Number(e.target.value))}
                      >
                        {[6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6].map((boost) => (
                          <option key={boost} value={boost}>
                            {boost === 0 ? '--' : boost > 0 ? `+${boost}` : String(boost)}
                          </option>
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
        </details>

        <div className="visual-moves">
          {pokemon.moves.map((move, index) => (
            <MoveUseRow
              key={index}
              gen={gen}
              moves={moveOptions}
              move={move}
              active={activeMove === index}
              onChange={(patch) => setMove(index, patch)}
              onUse={() => onUseMove(index)}
            />
          ))}
        </div>
      </fieldset>
    </section>
  );
}

function MoveUseRow({
  gen,
  moves,
  move,
  active,
  onChange,
  onUse,
}: {
  gen: CalcGen;
  moves: string[];
  move: MoveSlot;
  active: boolean;
  onChange: (patch: Partial<MoveSlot>) => void;
  onUse: () => void;
}) {
  const types = typeNames(gen);
  const multi = isMultiHit(gen, move.name);
  return (
    <div className="move-row visual-move-row">
      <select
        value={move.name}
        onChange={(e) => {
          const defaults = moveDefaults(gen, e.target.value);
          onChange({name: e.target.value, ...defaults});
        }}
      >
        {moves.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      <input type="number" className="narrow" value={move.bp} onChange={(e) => onChange({bp: Number(e.target.value)})} />
      <select value={move.type} onChange={(e) => onChange({type: e.target.value})}>
        {types.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      {genSupports('split', gen) && (
        <select value={move.category} onChange={(e) => onChange({category: e.target.value as MoveSlot['category']})}>
          <option value="Physical">Physical</option>
          <option value="Special">Special</option>
          <option value="Status">Status</option>
        </select>
      )}
      {multi && (
        <select value={move.hits} onChange={(e) => onChange({hits: Number(e.target.value)})}>
          {[2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n} hits</option>
          ))}
        </select>
      )}
      <button type="button" className={active ? 'btn on' : 'btn'} onClick={onUse}>
        {active ? 'Using' : 'Use'}
      </button>
    </div>
  );
}
