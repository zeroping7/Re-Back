// Mando simulado (CTL-04, CTL-05): menús con foco, carrera con gatillos, pausa y reanudar.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'tests/shots/gamepad';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.evaluateOnNewDocument(() => {
  const pad = { id: 'Fake pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  window.__pad = pad;
  navigator.getGamepads = () => [pad];
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const set = (i, v) => page.evaluate((i, v) => { window.__pad.buttons[i] = { pressed: v > 0.5, value: v }; }, i, v);
const tap = async (i, n = 1) => { for (let k = 0; k < n; k++) { await set(i, 1); await sleep(120); await set(i, 0); await sleep(250); } };
const focus = () => page.evaluate(() => { const f = document.querySelector('.pad-focus'); return f ? (f.id || f.textContent.trim().slice(0, 30)) : null; });
const screen = () => page.evaluate(() => [...document.querySelectorAll('.menu')].find((m) => !m.classList.contains('hidden'))?.id || null);
const A = 0, Bb = 1, RT = 7, START = 9, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;
let ok = true;
const check = (name, cond) => { console.log((cond ? '✔ ' : '✘ ') + name); ok &&= !!cond; };

await page.goto(url, { waitUntil: 'load' });
await sleep(2500);
await tap(START); await sleep(1500);
check('Start empieza → menú principal', (await screen()) === 'm-main');
check('foco inicial: ' + (await focus()), !!(await focus()));
await page.screenshot({ path: `${out}/1-main.png` });
// bajar hasta Contrarreloj
let guard = 0;
while (!(await focus())?.includes('Contrarreloj') && guard++ < 8) { await tap(DOWN); console.log('  foco:', await focus()); }
check('cruceta llega a Contrarreloj', (await focus())?.includes('Contrarreloj'));
await tap(A); await sleep(800);
check('A abre Contrarreloj', (await screen()) === 'm-setup');
check('foco en tarjeta: ' + (await focus()), !!(await focus()));
await tap(RIGHT); await tap(A); await sleep(300);
const track = await page.evaluate(() => window.__game.settings.track);
check('derecha + A elige otro circuito: ' + track, track !== 'salon');
await page.screenshot({ path: `${out}/2-setup.png` });
await tap(Bb); await sleep(500);
check('B vuelve atrás', (await screen()) === 'm-main');
check('el foco recuerda Contrarreloj', (await focus())?.includes('Contrarreloj'));
await tap(A); await sleep(800);
check('reabre Contrarreloj', (await screen()) === 'm-setup' && (await page.evaluate(() => document.getElementById('setup-title').textContent)) === 'Contrarreloj');
await tap(DOWN); await sleep(200);
check('abajo pasa al sentido o a los coches: ' + (await focus()), /Furgo|Pulga|Más|Normal|revés|Espejo/.test(await focus()));
await tap(START); // Start = ¡A correr!
await page.waitForFunction(() => window.__game.race && window.__game.race.started, { timeout: 90000 });
check('carrera empezada; botones táctiles ocultos', await page.evaluate(() => document.body.classList.contains('pad-mode') && !document.getElementById('steer-pad').offsetParent));
await set(RT, 1);
await page.evaluate(() => { window.__pad.axes[0] = -0.7; });
await sleep(2500);
const speed = await page.evaluate(() => Math.abs(window.__game.race.player.fwdSpeed));
check('RT acelera: ' + speed.toFixed(1), speed > 3);
await page.screenshot({ path: `${out}/3-race.png` });
await set(RT, 0); await page.evaluate(() => { window.__pad.axes[0] = 0; });
await tap(START); await sleep(400);
check('Start pausa', await page.evaluate(() => window.__game.race.paused) && (await screen()) === 'm-pause');
await page.screenshot({ path: `${out}/4-pause.png` });
await tap(Bb); await sleep(400);
check('B reanuda', !(await page.evaluate(() => window.__game.race.paused)));
await page.touchscreen.tap(450, 200); await sleep(300);
check('tocar la pantalla vuelve a mostrar los botones', await page.evaluate(() => !document.body.classList.contains('pad-mode')));
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close();
process.exit(ok && !errors.length ? 0 : 1);
