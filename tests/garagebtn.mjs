// UX-22/23: botón 🔧 en tarjetas de coche y quitar/poner mejoras en el garaje
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(process.argv[2], { waitUntil: 'load' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);
const vis = (id) => page.evaluate((id) => !document.getElementById(id).classList.contains('hidden'), id);
const ok = (c, m) => { if (!c) { errors.push('FALLO: ' + m); } else console.log('ok', m); };
await page.evaluate(() => document.getElementById('btn-start')?.click()); await sleep(1200);
await page.evaluate(() => document.querySelector('[data-go="disc"]')?.click()); await sleep(600);
await page.evaluate(() => window.__game.enter('race', 'race')); await sleep(1500);
const n = await page.evaluate(() => document.querySelectorAll('#cars .card:not(.locked) .gbtn').length);
ok(n >= 2, 'botón 🔧 en ' + n + ' tarjetas');
await page.screenshot({ path: 'tests/shots/gb1.png' });
// pulsa el 🔧 del segundo coche
const id = await page.evaluate(() => { const c = document.querySelectorAll('#cars .card:not(.locked)')[1]; const nm = c.querySelector('b').textContent; c.querySelector('.gbtn').click(); return nm; });
await sleep(900);
ok(await vis('m-garage'), 'abre el garaje');
ok((await page.evaluate(() => document.getElementById('g-name').textContent)) === id, 'garaje en el coche ' + id);
// comprar mejora, quitar y poner
await page.evaluate(() => { window.__prof = null; });
const money = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('reback.profile.v1')); p.money = 99999; localStorage.setItem('reback.profile.v1', JSON.stringify(p)); return p.money; });
await page.reload({ waitUntil: 'load' }); await sleep(2500);
await page.evaluate(() => document.getElementById('btn-start')?.click()); await sleep(1200);
await page.evaluate(() => document.querySelector('[data-go="garage"]').click()); await sleep(800);
await page.evaluate(() => document.querySelector('#g-ups .up-row button:last-child').click()); await sleep(300);
ok(await page.evaluate(() => !!document.querySelector('#g-ups .tg.on')), 'aparece Quitar tras comprar');
const stat = () => page.evaluate(() => document.querySelector('#g-stats').innerText);
const s1 = await stat();
await page.evaluate(() => document.querySelector('#g-ups .tg').click()); await sleep(300);
ok(await page.evaluate(() => document.querySelector('#g-ups .tg').textContent === 'Poner'), 'Quitar -> Poner');
const s2 = await stat();
ok(s1 !== s2, 'las estadísticas cambian al quitar');
await page.screenshot({ path: 'tests/shots/gb2.png' });
await page.evaluate(() => document.querySelector('#g-ups .tg').click()); await sleep(300);
ok((await stat()) === s1, 'Poner restaura las estadísticas');
await browser.close();
console.log(errors.join('\n') || 'sin errores');
