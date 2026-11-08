// Capturas de todos los coches en la plataforma del menú
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(process.argv[2], { waitUntil: 'load' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);
await page.click('#btn-start'); await sleep(800);
await page.click('[data-go="race"]'); await sleep(800);
await page.evaluate(() => { document.getElementById('m-setup').style.opacity = 0; });
const n = await page.evaluate(() => document.querySelectorAll('#cars .card').length);
for (let i = 0; i < n; i++) {
  await page.evaluate((i) => document.querySelectorAll('#cars .card')[i].click(), i);
  await page.evaluate(() => { document.getElementById('m-setup').style.opacity = 0; });
  await sleep(1800);
  await page.screenshot({ path: `tests/shots/car${i}.png`, clip: { x: 330, y: 40, width: 520, height: 330 } });
}
console.log('cars', n, 'ERRORS', errors.join('\n'));
await browser.close();
