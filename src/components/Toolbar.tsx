import type {GenerationNum, Mode, Notation, Theme} from '../lib/types';
import {GEN_BUTTONS} from '../lib/dex';

const MODES: {id: Mode; label: string}[] = [
  {id: 'one-vs-one', label: 'One vs One'},
  {id: 'one-vs-all', label: 'One vs All'},
  {id: 'all-vs-one', label: 'All vs One'},
  {id: 'champions', label: 'Champions'},
  {id: 'randoms', label: 'Random Battles'},
  {id: 'oms', label: 'Other Metagames'},
];

interface ToolbarProps {
  gen: GenerationNum | 0;
  mode: Mode;
  notation: Notation;
  theme: Theme;
  onGen: (gen: GenerationNum) => void;
  onMode: (mode: Mode) => void;
  onNotation: (notation: Notation) => void;
  onTheme: (theme: Theme) => void;
}

export function Toolbar({
  gen,
  mode,
  notation,
  theme,
  onGen,
  onMode,
  onNotation,
  onTheme,
}: ToolbarProps) {
  return (
    <div className="settings" role="region" aria-label="Settings">
      {mode !== 'champions' && (
        <span className="btn-row" role="radiogroup" aria-label="Generation">
          {GEN_BUTTONS.map((button) => (
            <label key={button.gen} className={gen === button.gen ? 'btn on' : 'btn'}>
              <input
                type="radio"
                name="gen"
                className="visually-hidden"
                checked={gen === button.gen}
                onChange={() => onGen(button.gen)}
              />
              {button.label}
            </label>
          ))}
        </span>
      )}
      <span className="btn-row" role="radiogroup" aria-label="Notation">
        <label className={notation === 'px' ? 'btn on' : 'btn'}>
          <input
            type="radio"
            name="notation"
            className="visually-hidden"
            checked={notation === 'px'}
            onChange={() => onNotation('px')}
          />
          48th
        </label>
        <label className={notation === '%' ? 'btn on' : 'btn'}>
          <input
            type="radio"
            name="notation"
            className="visually-hidden"
            checked={notation === '%'}
            onChange={() => onNotation('%')}
          />
          100%
        </label>
      </span>
      <span className="btn-row" role="radiogroup" aria-label="Mode">
        {MODES.map((item) => (
          <label key={item.id} className={mode === item.id ? 'btn on' : 'btn'}>
            <input
              type="radio"
              name="mode"
              className="visually-hidden"
              checked={mode === item.id}
              onChange={() => onMode(item.id)}
            />
            {item.label}
          </label>
        ))}
      </span>
      <span className="btn-row theme-row" role="radiogroup" aria-label="Theme">
        {(['auto', 'light', 'dark'] as Theme[]).map((item) => (
          <label key={item} className={theme === item ? 'btn on' : 'btn'}>
            <input
              type="radio"
              name="theme"
              className="visually-hidden"
              checked={theme === item}
              onChange={() => onTheme(item)}
            />
            {item === 'auto' ? 'Auto dark theme' : item === 'light' ? 'Light theme' : 'Dark theme'}
          </label>
        ))}
      </span>
    </div>
  );
}
