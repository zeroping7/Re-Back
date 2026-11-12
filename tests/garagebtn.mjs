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
const money = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('reback.profile.v2')); p.money = 99999; localStorage.setItem('reback.profile.v2', JSON.stringify(p)); return p.money; });
await page.reload({ waitUntil: 'load' }); await sleep(2500);
await page.evaluate(() => document.getElementById('btn-start')?.click()); await sleep(1200);
await page.evaluate(() => document.querySelector('[data-go="garage"]').click()); await sleep(800);
const buy = async () => { await page.evaluate(() => document.querySelectorAll('#g-ups .up-row')[1].querySelector('button:last-child').click()); await sleep(250); };
await buy(); await buy(); // 2 niveles de la 1ª mejora
const pips = () => page.evaluate(() => document.querySelectorAll('#g-ups .pips')[1].textContent);
const stat = () => page.evaluate(() => document.querySelector('#g-stats').innerText);
ok((await pips()).startsWith('●●'), 'dos niveles montados: ' + await pips());
const s2 = await stat();
const minus = () => page.evaluate(() => document.querySelectorAll('#g-ups .up-row')[1].querySelectorAll('.tg')[0].click());
const plus = () => page.evaluate(() => document.querySelectorAll('#g-ups .up-row')[1].querySelectorAll('.tg')[1].click());
await minus(); await sleep(250);
ok((await pips()).startsWith('●◌'), 'quita 1 nivel: ' + await pips());
const s1 = await stat();
ok(s1 !== s2, 'medidores bajan con 1 nivel quitado');
await minus(); await sleep(250);
ok((await pips()).startsWith('◌◌'), 'quita 2º nivel');
const s0 = await stat();
ok(s0 !== s1, 'medidores bajan con 0 niveles');
await plus(); await sleep(250); await plus(); await sleep(250);
ok((await stat()) === s2 && (await pips()).startsWith('●●'), 'poner 2 niveles restaura los medidores');
await browser.close();
console.log(errors.join('\n') || 'sin errores');
