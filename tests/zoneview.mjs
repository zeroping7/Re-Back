// Capturas de cada zona especial (charco, barro, arena, mojado, cera…) vistas con la cámara de juego al acercarse.
// Uso: TRACKS=salon,jardin VARIANTS=normal,rev,mirror node tests/zoneview.mjs [url] [carpeta]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'tests/shots/zoneview';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 380 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const id of (process.env.TRACKS || 'salon,super,jardin,museo,muelle,parque').split(',')) {
  for (const v of (process.env.VARIANTS || 'normal').split(',')) {
    const key = id;
    await page.goto(`${url}?test&practice&unlock&track=${key}&variant=${v}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game?.race?.started, { timeout: 90000 });
    const n = await page.evaluate(() => window.__game.race.T.zones.filter((z) => z.effect !== 'boost').length);
    for (let k = 0; k < n; k++) {
      await page.evaluate((k) => {
        const r = window.__game.race, c = r.circuit, N = c.samples.length;
        const z = r.T.zones.filter((z) => z.effect !== 'boost')[k];
        const mid = z.from !== undefined ? (z.from + Math.round(((z.to - z.from + N) % N) / 2)) % N : c.sampleNear(z.pos.x, z.pos.z).i;
        const back = z.from !== undefined ? Math.round(((z.to - z.from + N) % N) / 2) + 2 : 7;
        const s = c.samples[(mid - back + N) % N];
        const p = s.p.clone(); p.y += 0.6;
        r.player.reset(p, Math.atan2(s.t.x, s.t.z));
        window.__game.controls.override = { steer: 0, throttle: 0, brake: 1 };
      }, k);
      await sleep(1500);
      await page.screenshot({ path: `${out}/${id}-${v}-${k}.png` });
    }
    console.log(key, v, n, 'zonas');
  }
}
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close();
