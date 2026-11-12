// Prueba del garaje: compra, mejora, venta
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('dialog', (d) => d.accept());
await page.goto(process.argv[2], { waitUntil: 'load' });
await page.evaluate(() => localStorage.setItem('reback.profile.v2', JSON.stringify({ money: 6000, owned: { furgo: {}, pulga: {} }, selected: 'pulga' })));
await page.reload({ waitUntil: 'load' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);
await page.click('#btn-start'); await sleep(600);
await page.screenshot({ path: 'tests/shots/shop0.png' });
await page.click('[data-go="garage"]'); await sleep(1200);
await page.screenshot({ path: 'tests/shots/shop1.png' });
await page.evaluate(() => [...document.querySelectorAll('#g-cars .card')].find((c) => c.textContent.includes('Chispa')).click()); await sleep(800);
await page.evaluate(() => document.querySelector('#g-actions .buy').click()); await sleep(800);
await page.evaluate(() => document.querySelector('#g-ups button').click()); await sleep(600);
await page.evaluate(() => document.querySelector('#g-ups button').click()); await sleep(1200);
await page.screenshot({ path: 'tests/shots/shop2.png' });
const prof = await page.evaluate(() => localStorage.getItem('reback.profile.v2'));
console.log(prof, errors);
await browser.close();
