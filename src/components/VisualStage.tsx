import {BattleSprite} from './BattleSprite';
import {PokemonIcon} from './PokemonIcon';
import {
  STATUS_LABEL,
  visibleSlots,
  type ComboHit,
  type VisualRoster,
  type VisualSlot,
} from '../lib/visual';

const LABELS: Record<VisualSlot, string> = {
  allyA: 'Your Pokémon A',
  allyB: 'Your Pokémon B',
  foeA: 'Opposing Pokémon A',
  foeB: 'Opposing Pokémon B',
};

interface VisualStageProps {
  doubles: boolean;
  roster: VisualRoster;
  hits: ComboHit[];
  attackers: VisualSlot[];
  editing: VisualSlot | null;
  armedNames: Partial<Record<VisualSlot, string>>;
  onOpenSlot: (slot: VisualSlot) => void;
}

export function VisualStage({
  doubles,
  roster,
  hits,
  attackers,
  editing,
  armedNames,
  onOpenSlot,
}: VisualStageProps) {
  const bySlot = new Map(hits.map((hit) => [hit.slot, hit]));
  const targeted = new Set(hits.map((hit) => hit.slot));
  return (
    <div className={doubles ? 'visual-stage doubles' : 'visual-stage singles'} aria-label="Battlefield">
      <div className="visual-stage-art" aria-hidden />
      {visibleSlots(doubles).map((slot) => {
        const poke = roster[slot];
        const ally = slot.startsWith('ally');
        let className = `visual-slot visual-slot-${slot}`;
        if (editing === slot) className += ' editing';
        if (attackers.includes(slot)) className += ' attacker';
        if (targeted.has(slot)) className += ' targeted';
        if (!poke) {
          return (
            <div key={slot} className={`${className} empty`}>
              <button
                type="button"
                className="visual-slot-hit"
                onClick={() => onOpenSlot(slot)}
                aria-label={`Add ${LABELS[slot]}`}
              >
                <span className="visual-add" aria-hidden>
                  +
                </span>
                <span className="visual-slot-label">{LABELS[slot]}</span>
              </button>
            </div>
          );
        }
        const hit = bySlot.get(slot);
        const remainPct = hit ? hit.remainPct : poke.percentHP;
        const hpColor = remainPct > 50 ? 'hp-green' : remainPct > 20 ? 'hp-yellow' : 'hp-red';
        const status = poke.status ? STATUS_LABEL[poke.status] : '';
        const ko = hit?.ko ? hit.ko.replace(/^guaranteed /i, '').replace(/^likely /i, 'likely ') : '';
        const parts = hit && hit.parts.length > 1
          ? hit.parts.map((part) => `${part.move} ${part.median}`).join(' + ')
          : '';
        return (
          <div key={slot} className={className}>
            <button
              type="button"
              className="visual-slot-hit"
              onClick={() => onOpenSlot(slot)}
              aria-label={`Edit ${LABELS[slot]} ${poke.species}`}
            >
              <div className="visual-hp">
                <div className="visual-hp-inner">
                  <div className="visual-hp-top">
                    <PokemonIcon species={poke.species} fainted={remainPct <= 0} />
                    <strong>{poke.species}</strong>
                    {status && <span className={`status-tag status-${poke.status}`}>{status}</span>}
                  </div>
                  <div className="hpbar">
                    <div className={`hpbar-fill ${hpColor}`} style={{width: `${Math.max(0, Math.min(100, remainPct))}%`}} />
                  </div>
                  <div className="visual-hp-nums">
                    {hit
                      ? `${hit.remain}/${hit.maxHP} (${remainPct}%)`
                      : `${poke.curHP} (${poke.percentHP}%)`}
                  </div>
                  {hit && (
                    <div className="visual-hp-ko">
                      {parts ? `${parts} · ` : ''}
                      {hit.minPct}–{hit.maxPct}% {ko || (parts ? '' : 'no KO')}
                    </div>
                  )}
                </div>
              </div>
              {armedNames[slot] && <span className="visual-armed">{armedNames[slot]}</span>}
              <BattleSprite
                className="visual-battler"
                species={poke.species}
                side={ally ? 'p1' : 'p2'}
                gender={poke.gender}
                compact
              />
              <span className="visual-slot-label">{LABELS[slot]}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function slotLabel(slot: VisualSlot): string {
  return LABELS[slot];
}
