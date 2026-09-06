interface ImportExportProps {
  text: string;
  name: string;
  onText: (value: string) => void;
  onName: (value: string) => void;
  onImport: () => void;
}

export function ImportExport({text, name, onText, onName, onImport}: ImportExportProps) {
  return (
    <section className="import-export" aria-label="Import / Export">
      <h2>Import / Export</h2>
      <p className="hint">Paste a Pokémon Showdown export, then Import to add custom sets.</p>
      <input
        className="import-name"
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Custom Set"
      />
      <textarea
        className="import-team-text"
        value={text}
        onChange={(e) => onText(e.target.value)}
        rows={12}
        spellCheck={false}
      />
      <button type="button" className="bs-btn" onClick={onImport}>Import</button>
    </section>
  );
}
