// Capturas de las variantes al revés y espejo (CIR-23): vista aérea y en carrera
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'tests/shots/variants';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const key of (process.env.KEYS || 'salon:rev,salon:mirror,super:mirror,jardin:rev').split(',')) {
  await page.goto(`${url}?test&auto&track=${key}&rivals=3`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game?.race?.started, { timeout: 90000 });
  await sleep(6000);
  const n = key.replace(':', '-');
  await page.screenshot({ path: `${out}/${n}-race.png` });
  await page.evaluate(() => { window.__game.race.debugCam = 'preview'; });
  await sleep(300);
  await page.screenshot({ path: `${out}/${n}-top.png` });
  console.log(key, await page.evaluate(() => window.__game.race.state(window.__game.race.player).progress));
}
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close();
