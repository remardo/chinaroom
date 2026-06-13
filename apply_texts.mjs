// apply_texts.mjs — merge all patches/*.json {id:{name,short,description}} into products.json
import fs from 'node:fs';
import path from 'node:path';
const FILE = path.join(process.cwd(), 'data', 'products.json');
const PDIR = path.join(process.cwd(), 'patches');
const products = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
const byId = new Map(products.map(p => [p.id, p]));
let applied = 0, missing = [];
for (const f of fs.readdirSync(PDIR).filter(f => f.endsWith('.json')).sort()) {
  const patch = JSON.parse(fs.readFileSync(path.join(PDIR, f), 'utf-8'));
  for (const [id, v] of Object.entries(patch)) {
    const p = byId.get(id);
    if (!p) { missing.push(id); continue; }
    if (v.name) p.name = v.name;
    if (v.short) p.short = v.short;
    if (v.description) p.description = v.description;
    applied++;
  }
}
fs.writeFileSync(FILE, JSON.stringify(products, null, 2), 'utf-8');
console.log(`Applied ${applied} text patches. Missing ids: ${missing.length}`, missing.slice(0,5));
