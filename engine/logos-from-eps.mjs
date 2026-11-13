// Turns a brand's Illustrator EPS logo files into brands/<brand>/logos.json (vector paths).
// Usage: node engine/logos-from-eps.mjs <brand> <folder holding the EPS files>
// Reads brands/<brand>/logo-sources.json. Only single-colour or two-colour flat artwork is
// supported (paths, fills and one stroke), which is what the brand files contain. The hub
// recolours each layer itself, so the colours in the EPS are used only to split layers.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [brand, srcDir] = process.argv.slice(2);
if (!brand || !srcDir) { console.error('Usage: node engine/logos-from-eps.mjs <brand> <EPS folder>'); process.exit(1); }
const dir = join(root, 'brands', brand);
const sources = JSON.parse(readFileSync(join(dir, 'logo-sources.json'), 'utf8'));

const num = (n) => String(+n.toFixed(2));

function parse(text) {
  const start = text.indexOf('%%EndPageSetup');
  const end = text.indexOf('%%PageTrailer', start);
  const lines = text.slice(start, end).split(/\r?\n/);
  const hdr = lines.find((l) => /scale .*translate/.test(l));
  const H = -parseFloat(hdr.trim().split(/\s+/).slice(-2)[0]); // "1 -1 scale 0 -H translate"
  const bb = text.match(/%%HiResBoundingBox:\s*(\S+) (\S+) (\S+) (\S+)/);
  const W = parseFloat(bb[3]), BH = parseFloat(bb[4]);
  if (Math.abs(H - BH) > 0.01) throw new Error('Unexpected page flip');
  const layers = []; // {key, parts:[{d, stroke}]}
  let d = '', colour = null, stroke = null;
  const layerFor = (key) => layers.find((l) => l.key === key) || (layers.push({ key, d: '', strokes: [] }), layers[layers.length - 1]);
  for (const raw of lines) {
    const t = raw.trim().split(/\s+/);
    const op = t[t.length - 1], n = t.slice(0, -1).map(parseFloat);
    if (op === 'mo') d += `M${num(n[0])} ${num(n[1])}`;
    else if (op === 'li') d += `L${num(n[0])} ${num(n[1])}`;
    else if (op === 'cv') d += `C${n.map(num).join(' ')}`;
    else if (op === 'cp') d += 'Z';
    else if (op === 'clp') d = '';
    else if (op === 'cmyk') colour = n.join(',');
    else if (op === 'lw') stroke = n[0];
    else if (op === 'f') { layerFor(colour).d += d; d = ''; }
    else if (op === '@') { layerFor(colour).strokes.push({ d, w: stroke }); d = ''; }
    else if (['F', 'B', 'b', 'S', 's'].includes(op)) throw new Error(`Unsupported paint operator "${op}"`);
  }
  return { W, H, layers };
}

const out = {};
for (const [id, spec] of Object.entries(sources)) {
  const { W, H, layers } = parse(readFileSync(join(srcDir, spec.file), 'latin1'));
  if (layers.length > 2) throw new Error(`${id}: more than two colours`);
  const w = spec.width ?? Math.round((spec.height * W) / H);
  const h = spec.height ?? Math.round((spec.width * H) / W);
  const entry = { w, h, vb: [+num(W), +num(H)] };
  layers.forEach((l, i) => {
    const layer = { d: l.d };
    if (l.strokes.length) layer.s = l.strokes.map((s) => ({ d: s.d, w: s.w }));
    entry['ab'[i]] = layer;
  });
  out[id] = entry;
  console.log(`${id}: ${w}x${h}, ${layers.length} layer(s)`);
}
writeFileSync(join(dir, 'logos.json'), JSON.stringify(out));
console.log(`Wrote brands/${brand}/logos.json`);
