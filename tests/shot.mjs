// Capturas del circuito en Chrome headless.
//   node tests/shot.mjs <circuito> top,chase      → vista cenital / cámara normal en la salida
//   node tests/shot.mjs <circuito> gates [seg]    → teletransporta al jugador antes de cada puerta (IA al volante) y hace foto
// Requiere: npm run build && npx vite preview --port 4173
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const track = process.argv[2] || 'senda';
const cams = (process.argv[3] || 'top,chase').split(',');
const secs = +(process.argv[4] || 3);
const only = process.env.GATES ? process.env.GATES.split(',').map(Number) : null;
const out = process.env.OUT || '/tmp/shots';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(extra = '') {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text()); });
  await page.setViewport({ width: 960, height: 540 });
  await page.goto(`http://localhost:4173/?test&unlock&track=${track}&solo&rivals=0${process.env.VARIANT ? '&variant=' + process.env.VARIANT : ''}${process.env.CAR ? '&car=' + process.env.CAR : ''}${extra}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game?.race, { timeout: 90000 });
  return page;
}
for (const cam of cams) {
  if (cam === 'gates') {
    const page = await open('&fast=3');
    await page.waitForFunction(() => window.__game.race.started, { timeout: 60000 }).catch(() => {});
    const n = await page.evaluate(() => window.__game.race.T.gates.length);
    for (let k = 0; k < n; k++) {
      if (only && !only.includes(k + 1)) continue;
      await page.evaluate((k) => {
        const r = window.__game.race, g = r.T.gates[k], N = r.circuit.N, s = r.circuit.samples[(g.i - 5 + N) % N];
        r.autoPlayer = true; r.paused = false;
        r.player.reset(s.p, r.circuit.yawOf(s.t));
        r.countdown = 0;
      }, k);
      await sleep(secs * 1000);
      await page.screenshot({ path: `${out}/${track}-gate${k + 1}.png` });
      console.log('ok gate', k + 1);
    }
    await page.close();
  } else if (cam === 'obs') {
    // vista elevada de cada obstáculo (centros en unidades de diseño; VIEW=rear|side|front)
    const page = await open('&fast=1');
    const centers = JSON.parse(process.env.CENTERS || '[[-31.5,10],[-4.9,10],[17.9,10],[39.5,10],[60,0],[34,-10],[10,-10],[-10,-10],[-36,-10]]');
    for (let k = 0; k < centers.length; k++) {
      if (only && !only.includes(k + 1)) continue;
      await page.evaluate((c, view) => {
        const r = window.__game.race, S = r.S;
        let s = r.circuit.samples[0], bd = 1e9;
        for (const q of r.circuit.samples) { const d = Math.hypot(q.p.x - c[0] * S, q.p.z - c[1] * S); if (d < bd) { bd = d; s = q; } }
        const t = s.t, n = s.n, P = s.p;
        const o = view === 'front' ? [t.x * 9 + n.x * 4, 7, t.z * 9 + n.z * 4] : view === 'side' ? [n.x * -10 - t.x * 3, 8, n.z * -10 - t.z * 3] : [-t.x * 10 + n.x * 3, 7.5, -t.z * 10 + n.z * 3];
        r.debugCam = { pos: [P.x + o[0], P.y + o[1], P.z + o[2]], look: [P.x, P.y + 0.8, P.z] };
        r.paused = true;
      }, centers[k], process.env.VIEW || 'rear');
      await sleep(900);
      await page.screenshot({ path: `${out}/${track}-obs${k + 1}.png` });
      console.log('ok obs', k + 1);
    }
    await page.close();
  } else {
    const page = await open(cam === 'chase' ? '' : `&cam=${cam}`);
    await sleep(1500);
    await page.screenshot({ path: `${out}/${track}-${cam}.png` });
    console.log('ok', cam);
    await page.close();
  }
}
await browser.close();
