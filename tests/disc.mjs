// Capturas de las disciplinas (specs/11-disciplinas.md): selector, preparación, garaje por pestañas, Drift y Obstáculos en marcha y resultados.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'tests/shots/disc';
const only = process.argv[4];
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/GPU stall|AudioContext|GL Driver/.test(m.text()))) errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const want = (k) => !only || only.split(',').includes(k);

if (want('menu')) {
  // jugador nuevo: disciplinas bloqueadas
  await page.goto(url + '?test&screen=m-main', { waitUntil: 'load' }); await sleep(2500); await shot('1-main');
  await page.click('[data-go="disc"]'); await sleep(800); await shot('2-disc-bloqueadas');
  // con las copas ganadas
  await page.goto(url + '?test&unlock&screen=m-disc', { waitUntil: 'load' }); await sleep(2500); await shot('3-disc-abiertas');
  await page.evaluate(() => window.__game.enter('drift', 'solo')); await sleep(1500); await shot('4-drift-setup');
  await page.evaluate(() => window.__game.enter('obst', 'race')); await sleep(1500); await shot('5-obst-setup');
  await page.evaluate(() => window.__game.enter('drift', 'cups')); await sleep(1500); await shot('6-drift-copa');
  await page.click('#m-cups .back'); await sleep(500);
  await page.click('#m-disc .back'); await sleep(500);
  await page.click('[data-go="garage"]'); await sleep(1500); await shot('7-garaje-drift');
  await page.evaluate(() => document.querySelectorAll('#g-tabs button')[2].click()); await sleep(1200); await shot('8-garaje-obst');
  console.log('coches en pestaña obst:', await page.evaluate(() => [...document.querySelectorAll('#g-cars .card b')].map((b) => b.textContent).join(', ')));
}
async function run(name, q, secs, shots) {
  await page.goto(`${url}?test&unlock&auto&${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.race, { timeout: 90000 });
  for (let i = 1; i <= secs; i++) {
    await sleep(1000);
    if (shots.includes(i)) await shot(`${name}-${String(i).padStart(2, '0')}`);
    if (await page.evaluate(() => !document.getElementById('m-results').classList.contains('hidden'))) { await sleep(600); await shot(`${name}-resultados`); break; }
  }
  console.log(name, await page.evaluate(() => { const r = window.__game.race, st = r.state(r.player); return `t=${r.time.toFixed(1)} fase=${r.phase} vueltas=${st.laps} pts=${Math.round(st.score)} fps=${document.getElementById('fps').textContent} titulo="${document.getElementById('res-title').textContent}" premio="${document.getElementById('res-reward').textContent}"`; }));
}
if (want('drift')) await run('drift', 'track=cocina&solo&car=katana', 30, [5, 12, 20, 29]);
if (want('garaje')) await run('garaje', 'track=garaje&rivals=3&car=bisonte', 30, [5, 14, 22, 29]);
if (want('obst')) await run('obst', 'track=senda&rivals=3&laps=1', 60, [20, 28, 36, 44, 52, 59]);
if (want('fin')) { // resultados: modos en solitario y duelo, acelerado
  await run('fin-drift-solo', 'track=cocina&solo&fast=6', 80, []);
  await run('fin-obst-solo', 'track=senda&solo&fast=6', 60, []);
  await run('fin-drift-duelo', 'track=garaje&rivals=3&laps=2&fast=6', 90, []);
}
console.log('ERRORES:\n' + errors.slice(0, 12).join('\n'));
await browser.close();
