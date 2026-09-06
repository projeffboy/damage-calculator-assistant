import type {MoveResult} from '../lib/calculate';

interface ResultsProps {
  left: MoveResult[];
  right: MoveResult[];
  selected: {side: 0 | 1; move: number};
  onSelect: (side: 0 | 1, move: number) => void;
  p1Speed: number;
  p2Speed: number;
}

export function Results({left, right, selected, onSelect, p1Speed, p2Speed}: ResultsProps) {
  const active = selected.side === 0 ? left[selected.move] : right[selected.move];
  const speedText =
    p1Speed === p2Speed
      ? `Tie (${p1Speed})`
      : p1Speed > p2Speed
        ? `Pokémon 1 is faster (${p1Speed} vs ${p2Speed})`
        : `Pokémon 2 is faster (${p2Speed} vs ${p1Speed})`;

  return (
    <section className="results" aria-label="Calculation results">
      <div className="move-result-group">
        <MoveColumn
          title="Pokémon 1's Moves (select one to show detailed results)"
          results={left}
          side={0}
          selected={selected}
          onSelect={onSelect}
        />
        <MoveColumn
          title="Pokémon 2's Moves (select one to show detailed results)"
          results={right}
          side={1}
          selected={selected}
          onSelect={onSelect}
        />
      </div>
      <div className="main-result-group">
        <div className="big-text" title="Click to copy" onClick={() => copy(active?.fullDesc ?? '')}>
          {active?.fullDesc || 'Select a damaging move.'}
        </div>
        <div className="speed-line">{speedText}</div>
        {active && (
          <details className="rolls">
            <summary>
              {active.ko ? `${active.desc} — ${active.ko}` : active.desc}
            </summary>
            <p className="roll-values">{active.rolls}</p>
          </details>
        )}
      </div>
    </section>
  );
}

function MoveColumn({
  title,
  results,
  side,
  selected,
  onSelect,
}: {
  title: string;
  results: MoveResult[];
  side: 0 | 1;
  selected: {side: 0 | 1; move: number};
  onSelect: (side: 0 | 1, move: number) => void;
}) {
  return (
    <div className="move-result-subgroup" role="radiogroup" aria-label={title}>
      <div className="result-move-header">{title}</div>
      {results.map((result, index) => {
        const on = selected.side === side && selected.move === index;
        return (
          <div key={`${side}-${index}`}>
            <label className={on ? 'btn result-btn on' : 'btn result-btn'}>
              <input
                type="radio"
                name="resultMove"
                className="visually-hidden"
                checked={on}
                onChange={() => onSelect(side, index)}
              />
              {result.name.replace('Hidden Power', 'HP')}
            </label>
            <span className="result-damage">{result.desc || '0 - 0%'}</span>
          </div>
        );
      })}
    </div>
  );
}

function copy(text: string) {
  if (!text) return;
  void navigator.clipboard.writeText(text);
}
