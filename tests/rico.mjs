// PLA-10: ?rico = dinero infinito y partida aparte; sin ?rico la partida real no se toca
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: 900, height: 420 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:4173/', { waitUntil: 'load' }); await sleep(2000);
const real0 = await p.evaluate(() => JSON.parse(localStorage.getItem('reback.profile.v2') || 'null')?.money ?? 'sin partida');
await p.goto('http://localhost:4173/?rico', { waitUntil: 'load' }); await sleep(2500);
await p.click('#btn-start'); await sleep(600); await p.click('[data-go="garage"]'); await sleep(800);
const money = await p.evaluate(() => document.getElementById('money').textContent.trim());
// compra la 1.ª mejora de suspensión que haya disponible
const bought = await p.evaluate(() => { const b = [...document.querySelectorAll('#g-ups .up-row')].find((r) => r.textContent.includes('Suspensión'))?.querySelector('button:last-child'); if (b && !b.disabled) { b.click(); return true; } return false; });
await sleep(400);
const after = await p.evaluate(() => ({ money: document.getElementById('money').textContent.trim(), dev: JSON.parse(localStorage.getItem('reback.profile.dev')).money, title: document.title, discs: [...document.querySelectorAll('#g-tabs button')].map((x) => x.textContent) }));
await p.goto('http://localhost:4173/', { waitUntil: 'load' }); await sleep(2000);
const real1 = await p.evaluate(() => JSON.parse(localStorage.getItem('reback.profile.v2') || 'null')?.money ?? 'sin partida');
console.log({ real0, money, bought, after, real1, errs });
const ok = after.dev === 9999999 && bought && real0 === real1 && !after.discs.some((d) => d.includes('🔒')) && !errs.length;
console.log(ok ? '✓ OK' : '✗ FALLA'); await b.close(); process.exit(ok ? 0 : 1);
