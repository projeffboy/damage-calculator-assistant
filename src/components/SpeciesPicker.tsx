import {useEffect, useMemo, useRef, useState} from 'react';
import {PokemonIcon} from './PokemonIcon';

interface SpeciesPickerProps {
  species: string;
  names: string[];
  onChange: (species: string) => void;
}

export function SpeciesPicker({species, names, onChange}: SpeciesPickerProps) {
  const [query, setQuery] = useState(species);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(species);
  }, [species]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === species.toLowerCase()) return names;
    return names.filter((name) => name.toLowerCase().includes(q));
  }, [names, query, species]);

  const preview = open ? (matches[0] ?? species) : species;

  return (
    <div className="species-picker" ref={root}>
      <select
        className="species-picker-select"
        aria-label="Pokémon roster"
        value={names.includes(species) ? species : ''}
        onChange={(e) => {
          if (!e.target.value) return;
          onChange(e.target.value);
          setQuery(e.target.value);
          setOpen(false);
        }}
      >
        <option value="">
          {species ? 'Full roster' : 'Choose a Pokémon'}
        </option>
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <div className="species-picker-input">
        {preview ? <PokemonIcon species={preview} /> : <span className="poke-icon" />}
        <input
          value={query}
          aria-label="Search Pokémon"
          placeholder="Search or scroll the list"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) {
              onChange(matches[0]);
              setQuery(matches[0]);
              setOpen(false);
            }
          }}
        />
      </div>
      {open && (
        <ul className="species-picker-list" role="listbox">
          {matches.map((name) => (
            <li key={name}>
              <button
                type="button"
                className={name === species ? 'on' : undefined}
                onClick={() => {
                  onChange(name);
                  setQuery(name);
                  setOpen(false);
                }}
              >
                <PokemonIcon species={name} />
                <span>{name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
