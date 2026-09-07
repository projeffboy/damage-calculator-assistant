import type {CSSProperties} from 'react';
import {Icons, Sprites} from '@pkmn/img';

export type SpriteSide = 'p1' | 'p2';

export interface SpriteRequest {
  side?: SpriteSide;
  shiny?: boolean;
  gender?: 'M' | 'F' | 'N' | '';
}

export interface SpriteFrame {
  url: string;
  w: number;
  h: number;
  pixelated?: boolean;
}

function localHost(): {protocol: 'http' | 'https'; domain: string} {
  if (typeof window === 'undefined') {
    return {protocol: 'https', domain: 'play.pokemonshowdown.com'};
  }
  return {
    protocol: window.location.protocol === 'https:' ? 'https' : 'http',
    domain: window.location.host,
  };
}

function cdnHost() {
  return {protocol: 'https' as const, domain: 'play.pokemonshowdown.com'};
}

function spriteFileId(name: string, gender?: SpriteRequest['gender']): string {
  const sprite = Sprites.getPokemon(name, {gender: gender === 'F' ? 'F' : undefined});
  const file = sprite.url.split('/').pop()?.replace(/\.(gif|png)$/i, '');
  if (file && file !== '0') return file;
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function withHost(sprite: SpriteFrame, host: {protocol: 'http' | 'https'; domain: string}): SpriteFrame {
  return {
    ...sprite,
    url: sprite.url.replace(/^https?:\/\/[^/]+/i, `${host.protocol}://${host.domain}`),
  };
}

function uniqueFrames(frames: SpriteFrame[]): SpriteFrame[] {
  const seen = new Set<string>();
  const out: SpriteFrame[] = [];
  for (const frame of frames) {
    if (seen.has(frame.url)) continue;
    seen.add(frame.url);
    out.push(frame);
  }
  return out;
}

/** Animated battle GIF, then dex/gen5 stills. Local files first, Showdown CDN last. */
export function battleSpriteFrames(name: string, options: SpriteRequest = {}): SpriteFrame[] {
  const side = options.side ?? 'p2';
  const shiny = Boolean(options.shiny);
  const gender = options.gender === 'F' ? 'F' : undefined;
  const id = spriteFileId(name, options.gender);
  const back = side === 'p1';
  const dirShiny = shiny ? '-shiny' : '';
  const backDir = back ? '-back' : '';
  const hosts = [localHost(), cdnHost()];
  const frames: SpriteFrame[] = [];

  for (const host of hosts) {
    const base = `${host.protocol}://${host.domain}/sprites`;
    const sized = Sprites.getPokemon(name, {gen: 'ani', side, shiny, gender, ...host});
    frames.push({
      w: sized.w,
      h: sized.h,
      url: `${base}/ani${backDir}${dirShiny}/${id}.gif`,
      pixelated: false,
    });
    frames.push(withHost(sized, host));
    const dex = Sprites.getDexPokemon(name, {shiny, ...host});
    frames.push({
      w: dex.w,
      h: dex.h,
      url: `${base}/dex${dirShiny}/${id}.png`,
      pixelated: dex.pixelated,
    });
    frames.push({
      w: 96,
      h: 96,
      url: `${base}/gen5${backDir}${dirShiny}/${id}.png`,
      pixelated: true,
    });
  }

  return uniqueFrames(frames);
}

export function pokemonIconStyle(name: string): CSSProperties {
  return Icons.getPokemon(name, localHost()).css as CSSProperties;
}
