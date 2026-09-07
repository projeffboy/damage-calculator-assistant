import {useEffect, useState} from 'react';
import {battleSpriteFrames, type SpriteRequest} from '../lib/sprites';

interface BattleSpriteProps extends SpriteRequest {
  species: string;
  className?: string;
  alt?: string;
  compact?: boolean;
}

export function BattleSprite({species, className, alt, side, shiny, gender, compact}: BattleSpriteProps) {
  const frames = battleSpriteFrames(species, {side, shiny, gender});
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [species, side, shiny, gender]);

  const frame = frames[index];
  if (!frame) return null;

  return (
    <img
      className={className}
      alt={alt ?? species}
      src={frame.url}
      width={compact ? undefined : frame.w}
      height={compact ? undefined : frame.h}
      style={frame.pixelated ? {imageRendering: 'pixelated'} : undefined}
      onError={() => setIndex((current) => current + 1)}
    />
  );
}
