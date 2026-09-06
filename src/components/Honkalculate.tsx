import type {BulkRow} from '../lib/calculate';

interface HonkalculateProps {
  mode: 'one-vs-all' | 'all-vs-one';
  tiers: string[];
  selected: string[];
  onToggle: (tier: string) => void;
  rows: BulkRow[];
  loading: boolean;
}

export function Honkalculate({mode, tiers, selected, onToggle, rows, loading}: HonkalculateProps) {
  return (
    <section className="honkalculate" aria-label={mode === 'one-vs-all' ? 'One vs All' : 'All vs One'}>
      <div className="tiers">
        {tiers.map((tier) => (
          <label key={tier} className={selected.includes(tier) ? 'btn on' : 'btn'}>
            <input
              type="checkbox"
              className="visually-hidden"
              checked={selected.includes(tier)}
              onChange={() => onToggle(tier)}
            />
            {tier}
          </label>
        ))}
      </div>
      {loading && <p>Calculating…</p>}
      <div className="table-wrap">
        <table className="bulk-table">
          <thead>
            <tr>
              <th>{mode === 'one-vs-all' ? 'Defender' : 'Attacker'}</th>
              <th>Best move</th>
              <th>Damage</th>
              <th>KO</th>
              <th>Type</th>
              <th>Ability</th>
              <th>Item</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.move}</td>
                <td>{row.damage}</td>
                <td>{row.ko}</td>
                <td>{[row.type1, row.type2].filter(Boolean).join(' / ')}</td>
                <td>{row.ability}</td>
                <td>{row.item}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
