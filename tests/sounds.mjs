// AUD-13: cada coche tiene un motor (base, tono) distinto y coherente con su tipo de motor.
//   node tests/sounds.mjs
import { CARS } from '../src/cars.js';
import fs from 'fs';
const meta = JSON.parse(fs.readFileSync(new URL('../src/assets/engines.json', import.meta.url)));
let bad = 0;
const seen = new Map();
for (const c of CARS) {
  const [base, pitch] = c.sound || [];
  const b = meta.bases[base];
  const want = c.motor === 'Nitro' ? 'nitro' : 'electric';
  if (!b) { console.log('✗', c.id, 'sin sonido válido', c.sound); bad++; continue; }
  if (b.type !== want) { console.log('✗', c.id, `motor ${c.motor} pero base ${base} es ${b.type}`); bad++; }
  if (!(pitch >= 0.7 && pitch <= 1.3)) { console.log('✗', c.id, 'tono fuera de 0,7-1,3', pitch); bad++; }
  const k = base + '@' + pitch;
  if (seen.has(k)) { console.log('✗', c.id, 'repite el sonido de', seen.get(k)); bad++; }
  seen.set(k, c.id);
}
// dos coches con la misma base deben distinguirse al menos un 7 %
const byBase = {};
for (const c of CARS) (byBase[c.sound?.[0]] ||= []).push([c.sound?.[1], c.id]);
for (const [b, l] of Object.entries(byBase)) {
  l.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < l.length; i++) if (l[i][0] / l[i - 1][0] < 1.07) { console.log('✗', b, l[i - 1][1], 'y', l[i][1], 'suenan casi igual'); bad++; }
}
for (const [b, l] of Object.entries(byBase)) console.log(b, meta.bases[b]?.type, l.map(([p, id]) => `${id} ${p}`).join(' · '));
console.log(CARS.length, 'coches', bad ? `✗ ${bad} fallos` : '✓ todos con sonido único');
process.exit(bad ? 1 : 0);
