// Capturas de los menús
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(process.argv[2], { waitUntil: 'load' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);
await page.click('#btn-start'); await sleep(1500);
await page.screenshot({ path: 'tests/shots/m1.png' });
await page.click('[data-go="race"]'); await sleep(1500);
await page.screenshot({ path: 'tests/shots/m2.png' });
await page.evaluate(() => document.querySelectorAll('#cars .card')[3].click()); await sleep(1500);
await page.screenshot({ path: 'tests/shots/m3.png' });
await page.click('#btn-go'); await sleep(6000);
await page.click('#btn-pause'); await sleep(800);
await page.screenshot({ path: 'tests/shots/m4.png' });
console.log('ERRORS', errors.join('\n'));
await browser.close();
