// COC-23: capturas del humo de escape (Chrome headless). Uso: node tests/exhaustshot.mjs <url> [carpeta] [coches separados por coma] [capturas] [intervalo ms]
//   p. ej. node tests/exhaustshot.mjs http://localhost:4173/ tests/shots rally,tanque,yeti 6 600
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.argv[2], out = process.argv[3] || 'tests/shots';
const cars = (process.argv[4] || 'rally').split(','), n = +(process.argv[5] || 6), gap = +(process.argv[6] || 600);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const car of cars) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(`${url}?test&car=${car}&track=salon&rivals=${process.env.RIVALS ?? 3}&auto`, { waitUntil: 'load' });
  try { await page.waitForFunction(() => window.__game && window.__game.race, { timeout: 60000 }); } catch (e) { console.log('NO RACE', car, errors.join('\n')); continue; }
  for (let i = 0; i < n; i++) {
    const info = await page.evaluate(() => { const r = window.__game.race, p = r.player; return `phase=${r.phase} started=${r.started} rpm=${p.rpm.toFixed(2)} v=${p.speed.toFixed(1)} puffs=${r.effects.exhaust.p.filter((q) => q.life > 0).length}`; });
    console.log(car, i, info);
    await page.screenshot({ path: `${out}/${car}-${String(i).padStart(2, '0')}.png` });
    await sleep(gap);
  }
  if (errors.length) console.log('ERRORS', car, errors.slice(0, 5).join('\n'));
  await page.close();
}
await browser.close();
