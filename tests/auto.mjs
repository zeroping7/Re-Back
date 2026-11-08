// Piloto automático en el navegador + capturas periódicas.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.argv[2] || 'http://localhost:4173/?test=1';
const out = process.argv[3] || 'tests/shots';
const secs = +(process.argv[4] || 30);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.running, { timeout: 60000 });
await page.evaluate(() => {
  const g = window.__game, S = g.track.samples, N = S.length;
  let idx = 0;
  g.auto = { driftUntil: 0 };
  setInterval(() => {
    const c = g.car, p = c.currPos, f = c.forward;
    let b = idx, bd = 1e9;
    for (let k = -10; k < 25; k++) { const i = (idx + k + N) % N; const d = (S[i].p.x - p.x) ** 2 + (S[i].p.z - p.z) ** 2; if (d < bd) { bd = d; b = i; } }
    idx = b;
    const look = Math.round(3 + c.speed * 0.25), t = S[(idx + look) % N].p;
    const dx = t.x - p.x, dz = t.z - p.z;
    const ang = Math.atan2(f.z * dx - f.x * dz, f.x * dx + f.z * dz);
    const far = S[(idx + look + 8) % N].p;
    const a2 = Math.atan2(f.z * (far.x - p.x) - f.x * (far.z - p.z), f.x * (far.x - p.x) + f.z * (far.z - p.z));
    const drift = performance.now() < g.auto.driftUntil;
    const brake = drift || (Math.abs(a2) > 0.55 && c.speed > 20) ? 1 : 0;
    g.controls.override = { steer: Math.max(-1, Math.min(1, ang * 2.5)), throttle: brake && !drift ? 0 : 1, brake };
  }, 30);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < secs; i++) {
  await sleep(1000);
  if (i % 7 === 4) await page.evaluate(() => { window.__game.auto.driftUntil = performance.now() + 900; });
  const t = await page.evaluate(() => { const c = window.__game.car; return `v=${c.fwdSpeed.toFixed(1)} lat=${c.localVel.x.toFixed(1)} y=${c.currPos.y.toFixed(2)} drift=${c.drifting}`; });
  console.log(i, t);
  await page.screenshot({ path: `${out}/a${String(i).padStart(2, '0')}.png` });
}
console.log('ERRORS', errors.join('\n'));
await browser.close();
