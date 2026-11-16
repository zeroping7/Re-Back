// COC-25: el selector de color cambia el coche, se guarda por coche y «Original» lo restaura
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:4173/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const paint = () => page.evaluate(() => JSON.parse(localStorage.getItem('reback.profile.v2') || '{}').paint || {});
await page.goto(url, { waitUntil: 'load' }); await sleep(2500);
await page.click('#btn-start'); await sleep(800);
await page.click('[data-go="garage"]'); await sleep(800);
await page.click('.paint-head'); await sleep(300);
await page.evaluate(() => document.querySelector('.cp').scrollIntoView({ block: 'end' })); await sleep(200);
const sel = await page.evaluate(() => document.querySelector('#g-cars .card.sel b').textContent);
// 1) color rápido (6.º = azul) y 2) tono arrastrando la barra
await page.evaluate(() => document.querySelectorAll('.cp-q button')[0].click()); await sleep(400);
const a = await paint();
const box = await (await page.$('.cp-hue')).boundingBox();
await page.mouse.move(box.x + box.width * 0.45, box.y + 10); await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.5, box.y + 10, { steps: 4 }); await page.mouse.up(); await sleep(400);
const b = await paint();
await page.screenshot({ path: 'tests/shots/paint.png' });
// otro coche conserva el suyo
await page.evaluate(() => document.querySelectorAll('#g-cars .card')[1].click()); await sleep(500);
await page.reload({ waitUntil: 'load' }); await sleep(2500);
const c = await paint();
await page.click('#btn-start'); await sleep(800); await page.click('[data-go="garage"]'); await sleep(800);
await page.click('.paint-head'); await sleep(300);
await page.evaluate(() => document.querySelector('.cp-reset').click()); await sleep(300);
const d = await paint();
console.log(sel, 'rápido', a, 'tono', b, 'tras recargar', c, 'tras reset', d, 'ERRORS', errors.join('\n') || 'ninguno');
const ok = Object.values(a)[0] === '#e53935' && Object.values(b)[0] !== '#e53935' && JSON.stringify(b) === JSON.stringify(c) && !Object.keys(d).length;
console.log(ok ? '✓ OK' : '✗ FALLA');
await browser.close();
process.exit(ok ? 0 : 1);
