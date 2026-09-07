import {pokemonIconStyle} from '../lib/sprites';

export function PokemonIcon({species, fainted}: {species: string; fainted?: boolean}) {
  return (
    <span
      className={fainted ? 'poke-icon fainted' : 'poke-icon'}
      style={pokemonIconStyle(species)}
      title={species}
      aria-hidden
    />
  );
}
