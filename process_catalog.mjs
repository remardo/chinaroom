// process_catalog.mjs — prices (USD×160) + local image download + path rewrite
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'data', 'products.json');
const IMG_DIR = path.join(ROOT, 'img', 'catalog');
fs.mkdirSync(IMG_DIR, { recursive: true });

const RATE = 80;       // USD -> RUB
const MARKUP = 2;      // 100% logistics+margin

const products = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

function roundPrice(rub) {
  if (rub < 10000) return Math.round(rub / 100) * 100;     // nearest 100
  if (rub < 100000) return Math.round(rub / 500) * 500;    // nearest 500
  return Math.round(rub / 1000) * 1000;                    // nearest 1000
}

// Map a made-in-china URL to a stable local filename based on its id segment
function localName(url) {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean)[0]; // e.g. 2f0j00CMfqeytdMvgK
    const ext = (u.pathname.match(/\.(webp|jpg|jpeg|png)$/i) || ['.webp'])[0].toLowerCase();
    return seg + ext;
  } catch { return null; }
}

// Build download set + rewrite paths
const toDownload = new Map(); // localPathRel -> remoteUrl
let usdMissing = 0;

for (const p of products) {
  // PRICE: recover USD from old encoding (price was USD*100), fall back if already converted
  const usd = (typeof p.priceUsd === 'number') ? p.priceUsd : (p.price > 0 ? p.price / 100 : 0);
  if (!usd) usdMissing++;
  p.priceUsd = Math.round(usd * 100) / 100;
  p.price = roundPrice(usd * RATE * MARKUP);

  // IMAGES
  const rewrite = (url) => {
    if (!url || !/^https?:\/\//.test(url)) return url; // already local
    const name = localName(url);
    if (!name) return url;
    const rel = 'img/catalog/' + name;
    if (!toDownload.has(rel) && !fs.existsSync(path.join(ROOT, rel))) toDownload.set(rel, url);
    return rel;
  };
  p.image = rewrite(p.image);
  if (Array.isArray(p.gallery)) p.gallery = p.gallery.map(rewrite);
}

fs.writeFileSync(FILE, JSON.stringify(products, null, 2), 'utf-8');
console.log(`Prices set for ${products.length} products (rate ${RATE} ×${MARKUP}). USD missing: ${usdMissing}`);
console.log(`Images to download: ${toDownload.size}`);

// Download with concurrency
const entries = [...toDownload.entries()];
let done = 0, failed = 0;
const CONC = 16;

async function fetchOne(rel, url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.made-in-china.com/' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) throw new Error('too small');
    fs.writeFileSync(path.join(ROOT, rel), buf);
    done++;
  } catch (e) {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 400 * attempt)); return fetchOne(rel, url, attempt + 1); }
    failed++;
    fs.appendFileSync(path.join(ROOT, 'img_download_failures.log'), `${rel}\t${url}\t${e.message}\n`);
  }
  if ((done + failed) % 100 === 0) console.log(`  ${done + failed}/${entries.length} (ok ${done}, fail ${failed})`);
}

async function run() {
  let i = 0;
  async function worker() { while (i < entries.length) { const [rel, url] = entries[i++]; await fetchOne(rel, url); } }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`DONE images: ok ${done}, failed ${failed}`);
}
run();
