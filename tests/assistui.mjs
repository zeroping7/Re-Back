// UX-30: la ayuda de giro llega al coche del jugador con teclas/botones en una carrera real (y se apaga con la opción).
//   node tests/assistui.mjs [url]
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
for (const [label, key, track, car, want] of [['Carrera con ayuda', '1', 'salon', 'pulga', true], ['Carrera sin ayuda', '0', 'salon', 'pulga', false], ['Drift (no se toca)', '1', 'cocina', 'patin', false], ['Obstáculos (no se toca)', '1', 'senda', 'cabra', false]]) {
  const p = await b.newPage(); await p.setViewport({ width: 640, height: 300 });
  p.on('pageerror', (e) => { console.log('ERR', e.message); fail++; });
  await p.evaluateOnNewDocument((k) => localStorage.setItem('reback.steerAssist', k), key);
  await p.goto(`${url}?test&unlock&track=${track}&rivals=0&car=${car}&fast=3`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__game?.race?.started, { timeout: 120000, polling: 250 });
  const waitSim = (dt) => p.evaluate((dt) => new Promise((res) => { const r = window.__game.race, t0 = r.simT; const iv = setInterval(() => { if (r.simT >= t0 + dt) { clearInterval(iv); res(); } }, 5); }), dt); // espera en tiempo de juego
  await p.keyboard.down('ArrowUp'); await waitSim(1.5);
  await p.evaluate(() => { const c = window.__game.race.player; window.__pk = 0; window.__st = 0; window.__iv = setInterval(() => { window.__pk = Math.max(window.__pk, Math.abs(c._as || 0)); window.__st = Math.max(window.__st, Math.abs(c.steer)); }, 5); });
  await p.keyboard.down('ArrowLeft'); await waitSim(0.8); await p.keyboard.up('ArrowLeft'); await waitSim(0.3);
  const r = await p.evaluate(() => { clearInterval(window.__iv); const c = window.__game.race.player; return { as: window.__pk, steer: window.__st, disc: window.__game.race.disc, drift: !!c.driftMode, crawl: !!c.crawl }; });
  await p.keyboard.up('ArrowUp');
  const ok = (r.as > 0.5) === want && r.steer > 0.03;
  if (!ok) fail++;
  console.log(`${label.padEnd(24)} ayuda activa: ${r.as > 0.5 ? 'sí' : 'no'} (mando ${r.as.toFixed(2)}) · ruedas giran ${r.steer.toFixed(2)} rad · ${r.disc || 'race'} ${ok ? '✓' : '✗'}`);
  await p.close();
}
await b.close(); process.exit(fail ? 1 : 0);
