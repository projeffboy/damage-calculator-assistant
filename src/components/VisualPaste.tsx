import {useState} from 'react';
import type {CalcGen} from '../lib/types';
import {exportTeam} from '../lib/importExport';
import type {Team} from '../lib/team';

interface VisualPasteProps {
  gen: CalcGen;
  yours: Team;
  foes: Team;
  onImportYours: (text: string) => void;
  onImportFoes: (text: string) => void;
}

export function VisualPaste({gen, yours, foes, onImportYours, onImportFoes}: VisualPasteProps) {
  const [text, setText] = useState('');
  return (
    <section className="visual-paste" aria-label="PokéPaste">
      <h2>PokéPaste</h2>
      <textarea
        className="import-team-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        spellCheck={false}
        placeholder="Paste a Showdown / PokéPaste team"
      />
      <div className="btn-row wrap">
        <button type="button" className="bs-btn" onClick={() => onImportYours(text)}>
          Import yours
        </button>
        <button type="button" className="bs-btn" onClick={() => onImportFoes(text)}>
          Import opponents
        </button>
      </div>
      <div className="btn-row wrap">
        <button type="button" className="bs-btn" onClick={() => setText(exportTeam(gen, yours))}>
          Export yours
        </button>
        <button type="button" className="bs-btn" onClick={() => setText(exportTeam(gen, foes))}>
          Export opponents
        </button>
      </div>
    </section>
  );
}
