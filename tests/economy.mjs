// Simulación de la economía (specs/09-economia.md). Uso: node tests/economy.mjs
// Pásala cada vez que cambien premios o precios, o se añadan coches, circuitos o copas.
import { CARS, UPGRADES, MAX_LEVEL, carNeeds } from '../src/cars.js';
import { CUPS } from '../src/cups.js';
import { raceReward, upgradeLevelCost, cupPayout, FIRST_WIN } from '../src/economy.js';
import { DISCS, MEDALS } from '../src/disciplines.js';

const f = (n) => Math.round(n).toLocaleString('es-ES');
const fullUp = (c) => { let t = 0; for (let l = 0; l < MAX_LEVEL; l++) t += upgradeLevelCost(c.price, l); return t * UPGRADES.length; };
const discOf = (c) => c.disc || ['race'];
let fail = 0;

console.log('— Premio por carrera (ganando, 3 vueltas) —');
for (const [n, d] of [['Fácil', 0.86], ['Normal', 0.94], ['Difícil', 1.02]]) console.log(`  ${n}: 4 coches ${raceReward(1, 4, 3, d)} · 6 coches ${raceReward(1, 6, 3, d)}`);
const per = [2, 3, 5].map((l) => raceReward(1, 4, l, 0.94) / l);
if (Math.max(...per) / Math.min(...per) > 1.05) { console.log('  ✗ el premio no es proporcional a las vueltas'); fail++; }

console.log('— Copas (ganando todas las carreras) —');
let cupTotal = 0, races = 0;
for (const c of CUPS) {
  const r = raceReward(1, c.rivals + 1, c.laps, c.diff, c.disc || 'race') * c.tracks.length, first = cupPayout(c, 1), rep = cupPayout(c, 1, 1);
  console.log(`  ${c.name}: carreras ${f(r)} + premio ${f(first)} = ${f(r + first)} (repetida: ${f(r + rep)})`);
  if (!c.disc) { cupTotal += r + first; races += c.tracks.length; }
  if (rep >= first) { console.log('  ✗ repetir la copa paga igual que la primera vez'); fail++; }
}
console.log(`  Las 4 copas de Carrera a la primera: ${f(cupTotal)} en ${races} carreras`);

console.log('— Coches y mejoras —');
const avg = raceReward(2, 6, 3, 0.94); // ingreso típico: 2º con 6 coches en Normal
let all = 0;
for (const d of DISCS) {
  const list = CARS.filter((c) => discOf(c)[0] === d.id && !c.secret && !c.starter && c.price > 600);
  const sum = list.reduce((a, c) => a + c.price, 0), ups = CARS.filter((c) => discOf(c)[0] === d.id).reduce((a, c) => a + fullUp(c), 0);
  all += sum + ups;
  console.log(`  ${d.name}: coches ${f(sum)} (≈ ${Math.round(sum / avg)} carreras) · mejoras a tope ${f(ups)}`);
  for (const c of list) console.log(`    ${c.name.padEnd(8)} ${f(c.price).padStart(7)} · ≈ ${String(Math.round(c.price / avg)).padStart(2)} carreras · mejoras ${f(fullUp(c))}${carNeeds(c) ? ' · pide Copa ' + carNeeds(c) : ''}`);
}
console.log(`  Todo el juego: ${f(all)} ≈ ${Math.round(all / avg)} carreras a ${avg} 🪙 de media`);

const raceCars = CARS.filter((c) => discOf(c)[0] === 'race' && !c.secret && c.price > 600).reduce((a, c) => a + c.price, 0);
const ratio = cupTotal / raceCars;
console.log(`— Copas a la primera / coches de Carrera: ${(ratio * 100).toFixed(0)} % (objetivo 50–75 %) —`);
if (ratio > 0.75 || ratio < 0.5) { console.log('  ✗ fuera de objetivo: ajusta precios o premios'); fail++; }
console.log(`— Pagos únicos: medallas ${f(MEDALS.reduce((a, m) => a + m.prize, 0))} por circuito · primeras victorias ${FIRST_WIN.join('/')} por circuito —`);
console.log(fail ? `✗ ${fail} aviso(s)` : '✓ economía dentro de objetivo');
process.exit(fail ? 1 : 0);
