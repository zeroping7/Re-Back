// Captura de la estrella oculta en Contrarreloj (el coche se coloca antes de la rampa y salta solo)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const track = process.argv[2] || 'salon', cam = process.argv[3] || 'normal';
const out = 'tests/shots/star'; fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(`http://localhost:4173/?test=1&practice&auto&track=${track}&camMode=${cam}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.race && window.__game.race.started, { timeout: 60000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate(() => {
  const r = window.__game.race, c = r.circuit, N = c.N, ramp = c.elev.find((e) => e.kind === 'ramp');
  const i = (ramp.i0 - 9 + N) % N, s = c.samples[i];
  const st = r.state(r.player); st.idx = i; st.progress = i;
  r.player.reset(s.p, c.yawOf(s.t));
});
for (let k = 0; k < 8; k++) { await sleep(450); await page.screenshot({ path: `${out}/${track}-${cam}-${k}.png` }); }
const got = await page.evaluate(() => window.__game.race.star && window.__game.race.star.got);
console.log(track, cam, 'star got:', got, errors.join('\n'));
await browser.close();
