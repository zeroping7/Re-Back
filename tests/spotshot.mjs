// Coloca al jugador (IA al volante) en una muestra del circuito y hace una foto a los N segundos.
//   node tests/spotshot.mjs volcan '[["puente",170,5]]'   (requiere npm run build && npx vite preview --port 4173)
import puppeteer from 'puppeteer-core';
const track = process.argv[2], list = JSON.parse(process.argv[3]); // [[nombre, idx, segundos]]
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.setViewport({ width: 960, height: 540 });
await page.goto(`http://localhost:4173/?test&unlock&track=${track}&solo&rivals=0&fast=3${process.env.CAR ? '&car=' + process.env.CAR : ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.race?.started, { timeout: 90000 }).catch(() => {});
for (const [name, idx, secs] of list) {
  await page.evaluate((idx) => { const r = window.__game.race, N = r.circuit.N, s = r.circuit.samples[(idx + N) % N]; r.autoPlayer = true; r.paused = false; r.player.reset(s.p, r.circuit.yawOf(s.t)); r.state(r.player).idx = idx; r.state(r.player).progress = idx; r.state(r.player).bestProg = idx; r.countdown = 0; }, idx);
  await new Promise((r) => setTimeout(r, secs * 1000));
  await page.screenshot({ path: `/tmp/shots/${track}-${name}.png` });
  console.log('ok', name, await page.evaluate(() => { const r = window.__game.race; return r.state(r.player).idx; }));
}
await browser.close();
