// Prueba de la economía en pantalla (ECO-10..13): circuitos y coches bloqueados, primera victoria. Uso: node tests/ecoui.mjs http://localhost:4173/
import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 420 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// partida nueva: 3 circuitos abiertos y 3 con candado
await page.goto(url + '?test&screen=m-setup', { waitUntil: 'load' }); await sleep(2500);
await page.screenshot({ path: 'tests/shots/eco-circuitos.png' });
const tracks = await page.evaluate(() => [...document.querySelectorAll('#tracks .card')].map((c) => (c.classList.contains('locked') ? '🔒' : '') + c.querySelector('b').textContent));
// garaje: Fórmula pide la Copa Oro aunque haya dinero
await page.evaluate(() => localStorage.setItem('reback.profile.v2', JSON.stringify({ money: 50000, owned: { furgo: {}, pulga: {} }, selected: 'pulga' })));
await page.goto(url + '?test&screen=m-garage', { waitUntil: 'load' }); await sleep(2500);
await page.evaluate(() => [...document.querySelectorAll('#g-cars .card')].find((c) => c.textContent.includes('Fórmula')).click()); await sleep(800);
await page.screenshot({ path: 'tests/shots/eco-garaje.png' });
const buy = await page.evaluate(() => { const b = document.querySelector('#g-actions .buy'); return b.textContent + (b.disabled ? ' [desactivado]' : ''); });
// carrera rápida ganada con 4 coches: premio + primera victoria, y la segunda vez ya no
const res = [];
for (let i = 0; i < 2; i++) {
  await page.goto(url + '?test&auto&fast=8&track=salon&laps=2&rivals=3&diff=0.86&car=formula', { waitUntil: 'load' });
  await page.waitForFunction(() => !document.querySelector('#m-results').classList.contains('hidden'), { timeout: 240000 });
  res.push(await page.evaluate(() => document.querySelector('#res-title').textContent + ' | ' + document.querySelector('#res-reward').textContent));
}
await page.screenshot({ path: 'tests/shots/eco-resultados.png' });
console.log(JSON.stringify({ tracks, buy, res, errors }, null, 1));
await browser.close();
