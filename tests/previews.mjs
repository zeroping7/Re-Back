// Genera las fotos de las tarjetas (UX-10): public/previews/car-<id>.webp y track-<id>.webp
// Uso: npm run build && npx vite preview --port 4173 &  →  node tests/previews.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.argv[2] || 'http://localhost:4173/';
const out = 'public/previews';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
const save = (name, data) => fs.writeFileSync(`${out}/${name}.webp`, Buffer.from(data.split(',')[1], 'base64'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// coches
await page.setViewport({ width: 900, height: 420 });
await page.goto(url + '?test&screen=m-main', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game, { timeout: 60000 });
const cars = await page.evaluate(() => window.__game.carPreviews());
for (const [id, d] of Object.entries(cars)) save('car-' + id, d);
console.log('coches:', Object.keys(cars).join(', '));

// circuitos: carrera con 5 rivales en la parrilla, foto aérea
const VIEW = JSON.parse(process.env.VIEW || '{}');
for (const id of (process.env.TRACKS || 'salon,super,jardin').split(',')) {
  await page.setViewport({ width: 480, height: 270 });
  await page.goto(`${url}?test&track=${id}&rivals=5`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game?.race, { timeout: 90000 });
  await sleep(1500);
  const d = await page.evaluate((o) => { window.__game.race.paused = true; return window.__game.trackShot(o); }, VIEW[id] || {});
  save('track-' + id, d);
  console.log('circuito', id);
}
await browser.close();
