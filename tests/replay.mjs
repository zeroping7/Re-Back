// Repetición (UX-12) y fantasma (UX-11)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'tests/shots/replay';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, secs) => { for (let t = 0; t < secs; t++) { if (await page.evaluate(fn).catch(() => false)) return true; await sleep(1000); } return false; };
let ok = true; const check = (n, c) => { console.log((c ? '✔ ' : '✘ ') + n); ok &&= !!c; };
const only = process.env.ONLY || 'replay,ghost';

if (only.includes('replay')) {
  await page.goto(`${url}?test&auto&track=${process.env.TRACK || 'super'}&rivals=3&laps=1`, { waitUntil: 'load' });
  await until(() => !document.getElementById('m-results').classList.contains('hidden'), 300);
  const has = await page.evaluate(() => [...document.querySelectorAll('#res-btns button')].some((b) => b.textContent.includes('Repetición')));
  check('botón de repetición en resultados', has);
  await page.evaluate(() => [...document.querySelectorAll('#res-btns button')].find((b) => b.textContent.includes('Repetición')).click());
  await sleep(500);
  check('repetición en marcha', await page.evaluate(() => !!window.__game.race.replay && !document.getElementById('replay-ui').classList.contains('hidden')));
  for (let k = 0; k < 6; k++) { await sleep(2500); await page.screenshot({ path: `${out}/replay-${k}.png` }); }
  await page.click('#btn-replay-skip'); await sleep(400);
  check('saltar vuelve a resultados', await page.evaluate(() => !window.__game.race.replay && !document.getElementById('m-results').classList.contains('hidden')));
}
if (only.includes('ghost')) {
  await page.goto(`${url}?test&auto&practice&track=salon`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.removeItem('reback.ghost.salon'));
  await until(() => !!window.__game?.race?.ghost, 300);
  check('fantasma guardado tras la primera vuelta', await page.evaluate(() => !!localStorage.getItem('reback.ghost.salon')));
  const kb = await page.evaluate(() => (localStorage.getItem('reback.ghost.salon').length / 1024).toFixed(1));
  console.log('  tamaño', kb, 'KB');
  await sleep(4000);
  check('fantasma visible en la vuelta siguiente', await page.evaluate(() => window.__game.race.ghostMesh.visible));
  await page.evaluate(() => { window.__game.race.debugCam = 'close'; });
  await sleep(200);
  await page.screenshot({ path: `${out}/ghost.png` });
}
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close();
process.exit(ok && !errors.length ? 0 : 1);
