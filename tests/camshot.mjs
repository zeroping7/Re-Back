// Fotos con cámara libre (coordenadas de diseño): node tests/camshot.mjs <circuito> '<json [[nombre,[x,y,z],[lx,ly,lz]],...]>'
// Requiere: npm run build && npx vite preview --port 4173
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const track = process.argv[2] || 'volcan', shots = JSON.parse(process.argv[3]), out = process.env.OUT || '/tmp/shots';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text()); });
await page.setViewport({ width: 960, height: 540 });
await page.goto(`http://localhost:4173/?test&unlock&track=${track}&solo&rivals=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.race, { timeout: 90000 });
for (const [name, pos, look] of shots) {
  await page.evaluate((pos, look) => { const r = window.__game.race, S = r.S; r.debugCam = { pos: pos.map((v) => v * S), look: look.map((v) => v * S) }; }, pos, look);
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `${out}/${track}-${name}.png` });
  console.log('ok', name);
}
await browser.close();
