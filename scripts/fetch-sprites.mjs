/**
 * Mirrors Pokémon Showdown battle sprites into public/sprites.
 * Usage: npm run fetch-sprites
 */
import {mkdir, stat, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'sprites');
const BASE = 'https://play.pokemonshowdown.com/sprites';
const CONCURRENCY = 16;

const DIRS = [
  'ani',
  'ani-back',
  'ani-shiny',
  'ani-back-shiny',
  'dex',
  'dex-shiny',
  'gen5',
  'gen5-back',
  'gen5-shiny',
  'gen5-back-shiny',
];

const ROOT_FILES = [
  'pokemonicons-sheet.png',
  'pokemonicons-pokeball-sheet.png',
  'itemicons-sheet.png',
];

function parseListing(html) {
  const files = new Set();
  for (const match of html.matchAll(/href="([^"]+)"/gi)) {
    let href = match[1].split('#')[0].split('?')[0];
    if (/^https?:\/\//i.test(href)) {
      try {
        href = new URL(href).pathname.split('/').pop() ?? '';
      } catch {
        continue;
      }
    } else {
      href = href.split('/').pop() ?? '';
    }
    if (!href || href.includes('..') || !/\.(gif|png)$/i.test(href)) continue;
    files.add(decodeURIComponent(href));
  }
  return [...files].sort();
}

async function exists(path) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function fetchBuffer(url, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: {Accept: 'image/gif,image/png,*/*'},
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const type = res.headers.get('content-type') ?? '';
      if (type.includes('text/html')) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const gif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
      const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      if (!gif && !png) return null;
      return buf;
    } catch (err) {
      last = err;
      await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
    }
  }
  throw last;
}

async function listDir(dir) {
  const html = await fetch(`${BASE}/${dir}/?view=dir`, {
    headers: {Accept: 'text/html'},
    signal: AbortSignal.timeout(60000),
  }).then((res) => {
    if (!res.ok) throw new Error(`Failed to list ${dir}: ${res.status}`);
    return res.text();
  });
  const files = parseListing(html);
  if (files.length === 0) throw new Error(`No files listed for ${dir}`);
  return files;
}

async function pool(items, limit, worker) {
  let index = 0;
  async function next() {
    while (index < items.length) {
      const current = index++;
      await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, () => next()));
}

async function downloadFile(dir, file) {
  const destDir = dir ? join(OUT, dir) : OUT;
  await mkdir(destDir, {recursive: true});
  const dest = join(destDir, file);
  if (await exists(dest)) return 'skip';
  const url = dir ? `${BASE}/${dir}/${file}` : `${BASE}/${file}`;
  const buf = await fetchBuffer(url);
  if (!buf) return 'missing';
  await writeFile(dest, buf);
  return 'ok';
}

async function main() {
  await mkdir(OUT, {recursive: true});
  let downloaded = 0;
  let skipped = 0;
  let missing = 0;

  for (const file of ROOT_FILES) {
    const result = await downloadFile('', file);
    if (result === 'ok') downloaded++;
    else if (result === 'skip') skipped++;
    else missing++;
  }

  for (const dir of DIRS) {
    process.stdout.write(`Listing ${dir}… `);
    const files = await listDir(dir);
    console.log(`${files.length} files`);
    let done = 0;
    await pool(files, CONCURRENCY, async (file) => {
      const result = await downloadFile(dir, file);
      if (result === 'ok') downloaded++;
      else if (result === 'skip') skipped++;
      else missing++;
      done++;
      if (done % 100 === 0 || done === files.length) {
        console.log(`  ${dir}: ${done}/${files.length}`);
      }
    });
  }

  console.log(`Done. downloaded=${downloaded} skipped=${skipped} missing=${missing}`);
}

await main();
