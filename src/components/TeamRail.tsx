import {PokemonIcon} from './PokemonIcon';
import {STATUS_LABEL} from '../lib/visual';
import {maxHP} from '../lib/pokemon';
import type {CalcGen} from '../lib/types';
import type {Reveal, Team} from '../lib/team';

interface TeamRailProps {
  title: string;
  hint?: string;
  gen: CalcGen;
  team: Team;
  active: number[];
  party?: number[];
  reveals?: Reveal[];
  picking?: boolean;
  pickOrder?: number[];
  editingIndex: number | null;
  opponent?: boolean;
  doubles?: boolean;
  onSelect: (index: number) => void;
  onTogglePick?: (index: number) => void;
  onRuleOut?: (index: number) => void;
}

export function TeamRail({
  title,
  hint,
  gen,
  team,
  active,
  party = [],
  reveals,
  picking = false,
  pickOrder = [],
  editingIndex,
  opponent = false,
  doubles = true,
  onSelect,
  onTogglePick,
  onRuleOut,
}: TeamRailProps) {
  return (
    <div className="team-rail-list">
      <h3 className="team-rail-title">{title}</h3>
      {hint && <p className="team-rail-hint">{hint}</p>}
      <div className="team-rail-slots">
        {team.map((poke, index) => {
          const isActive = active.includes(index);
          const editing = editingIndex === index;
          const pickNum = pickOrder.indexOf(index);
          const partyNum = party.indexOf(index);
          const reveal = reveals?.[index] ?? (isActive || partyNum >= 0 ? 'in' : 'possible');
          if (!poke) {
            return (
              <button
                key={index}
                type="button"
                className={`team-chip empty${editing ? ' editing' : ''}`}
                onClick={() => onSelect(index)}
              >
                <span className="team-chip-plus">+</span>
                <span>Slot {index + 1}</span>
              </button>
            );
          }
          const fainted = poke.curHP <= 0;
          const hp = maxHP(gen, poke);
          const pct = fainted ? 0 : poke.percentHP;
          const status = poke.status ? STATUS_LABEL[poke.status] : '';
          let role = 'Squad';
          if (picking && pickNum >= 0) role = `#${pickNum + 1}`;
          else if (isActive) role = doubles && active[1] === index ? 'In (right)' : doubles ? 'In (left)' : 'In';
          else if (opponent && reveal === 'out') role = 'Not brought';
          else if (opponent && reveal === 'possible') role = 'Maybe';
          else if (partyNum >= 0 || reveal === 'in') role = 'Back';
          return (
            <div
              key={index}
              className={`team-chip${isActive ? ' in' : ''}${editing ? ' editing' : ''}${fainted ? ' fainted' : ''}${reveal === 'out' ? ' out' : ''}${reveal === 'possible' && opponent ? ' maybe' : ''}`}
            >
              <button
                type="button"
                className="team-chip-main"
                onClick={() => (picking ? onTogglePick?.(index) : onSelect(index))}
              >
                {picking && pickNum >= 0 && <span className="team-pick-num">{pickNum + 1}</span>}
                {!picking && partyNum >= 0 && <span className="team-pick-num">{partyNum + 1}</span>}
                <PokemonIcon species={poke.species} fainted={fainted || reveal === 'out'} />
                <span className="team-chip-meta">
                  <strong>{poke.species}</strong>
                  <span>
                    {role} · {poke.curHP}/{hp} ({pct}%)
                    {status ? ` ${status}` : ''}
                  </span>
                </span>
              </button>
              {opponent && !picking && poke && reveal !== 'out' && reveal !== 'in' && onRuleOut && (
                <button type="button" className="bs-btn team-switch" onClick={() => onRuleOut(index)}>
                  Not brought
                </button>
              )}
              {opponent && reveal === 'out' && onRuleOut && (
                <button type="button" className="bs-btn team-switch" onClick={() => onRuleOut(index)}>
                  Could be
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
