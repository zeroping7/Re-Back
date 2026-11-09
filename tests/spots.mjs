// Capturas en sitios concretos: curva más cerrada (carteles de flechas) y cajas de energía
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const track = process.argv[2] || 'salon';
const out = 'tests/shots/spots'; fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(`http://localhost:4173/?test=1&auto&rivals=0&track=${track}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.race && window.__game.race.started, { timeout: 60000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const go = (i) => page.evaluate((i) => {
  const r = window.__game.race, c = r.circuit, N = c.N; i = (i + N) % N; const s = c.samples[i];
  const st = r.state(r.player); st.idx = i; st.progress = i + N; r.player.reset(s.p, c.yawOf(s.t));
  r.camDir.set(s.t.x, 0, s.t.z).normalize();
}, i);
const info = await page.evaluate(() => {
  const r = window.__game.race, c = r.circuit;
  let mi = 0; c.samples.forEach((s, i) => { if (s.radius < c.samples[mi].radius) mi = i; });
  const box = r.items.pickups?.[0]; let bi = null;
  if (box) { const p = box.g.position; let bd = 1e9; c.samples.forEach((s, i) => { const d = (s.p.x - p.x) ** 2 + (s.p.z - p.z) ** 2; if (d < bd) { bd = d; bi = i; } }); }
  return { mi, r: c.samples[mi].radius, bi, N: c.N };
});
console.log(JSON.stringify(info));
await go(info.mi - 7); await sleep(1500); await page.screenshot({ path: `${out}/${track}-curve.png` });
if (info.bi !== null) { await go(info.bi - 5); await sleep(1200); await page.screenshot({ path: `${out}/${track}-box.png` }); }
console.log(errors.join('\n'));
await browser.close();
