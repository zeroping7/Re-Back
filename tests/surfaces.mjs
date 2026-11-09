// Capturas de las superficies especiales (barro, agua, fregado, encerado) al pasar por encima.
// Uso: node tests/surfaces.mjs [url] [carpeta]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'tests/shots/surfaces';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const id of (process.env.TRACKS || 'salon,super,jardin').split(',')) {
  await page.goto(`${url}?test&practice&track=${id}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game?.race?.started, { timeout: 90000 });
  const n = await page.evaluate(() => window.__game.race.T.zones.filter((z) => z.effect !== 'boost').length);
  for (let k = 0; k < n; k++) {
    // coloca el coche antes de la zona y acelera recto
    await page.evaluate((k) => {
      const r = window.__game.race, c = r.circuit, N = c.samples.length;
      const z = r.T.zones.filter((z) => z.effect !== 'boost')[k];
      const i = z.from !== undefined ? (z.from - 2 + N) % N : (c.sampleNear(z.pos.x, z.pos.z).i - 4 + N) % N;
      const s = c.samples[i];
      const p = s.p.clone(); p.y = (s.h || 0) + 0.6;
      if (z.pos) p.addScaledVector(s.n, (z.pos.x - c.samples[c.sampleNear(z.pos.x, z.pos.z).i].p.x) * s.n.x + (z.pos.z - c.samples[c.sampleNear(z.pos.x, z.pos.z).i].p.z) * s.n.z);
      r.player.reset(p, Math.atan2(s.t.x, s.t.z));
      window.__game.controls.override = { steer: 0, throttle: 1, brake: 0 };
    }, k);
    // vista fija de la zona para ver la textura
    await page.evaluate((k) => {
      const r = window.__game.race, c = r.circuit, N = c.samples.length;
      const z = r.T.zones.filter((z) => z.effect !== 'boost')[k];
      const i = z.from !== undefined ? (z.from + Math.round(((z.to - z.from + N) % N) / 2)) % N : c.sampleNear(z.pos.x, z.pos.z).i;
      const s = c.samples[i], p = z.pos || s.p;
      r.debugCam = { pos: [p.x - s.t.x * 12 + s.n.x * 6, (s.h || 0) * r.S + 9, p.z - s.t.z * 12 + s.n.z * 6], look: [p.x, (s.h || 0) * r.S, p.z] };
    }, k);
    await sleep(700);
    await page.screenshot({ path: `${out}/${id}-${k}-a.png` });
    await page.evaluate(() => { window.__game.race.debugCam = null; });
    await page.evaluate(() => { window.__game.controls.override = { steer: 0.6, throttle: 1, brake: 0 }; });
    await sleep(500);
    await page.screenshot({ path: `${out}/${id}-${k}-b.png` });
  }
  console.log(id, n, 'zonas');
}
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close();
