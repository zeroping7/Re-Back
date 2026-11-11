// Capturas de un circuito en espejo (y normal) en varios puntos: tests/mirror.mjs <circuito> [variant] [n]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const track = process.argv[2] || 'salon', variant = process.argv[3] || 'mirror', n = +(process.argv[4] || 6);
const out = 'tests/shots/mirror'; fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(`http://localhost:4173/?test=1&auto&rivals=0&track=${track}&variant=${variant}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.race && window.__game.race.started, { timeout: 90000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const N = await page.evaluate(() => window.__game.race.circuit.N);
for (let k = 0; k < n; k++) {
  const i = Math.floor((N * k) / n);
  await page.evaluate((i) => {
    const r = window.__game.race, c = r.circuit; const s = c.samples[i];
    const st = r.state(r.player); st.idx = i; st.progress = i + c.N; r.player.reset(s.p, c.yawOf(s.t));
    r.camDir.set(s.t.x, 0, s.t.z).normalize();
  }, i);
  await sleep(1200);
  await page.screenshot({ path: `${out}/${track}-${variant}-${k}.png` });
}
console.log(track, variant, 'N', N, errors.join('\n'));
await browser.close();
