// AUD-13: arranca el juego con rivales y comprueba que los motores con muestras están activos y sin errores.
//   node tests/engine-game.mjs [coche]       (requiere: npx vite --port 5173)
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/404|accounts.google/.test(m.text())) errs.push(m.type() + ' ' + m.text()); });
await page.setViewport({ width: 960, height: 540 });
const car = process.argv[2] || 'tanque';
await page.goto(`http://localhost:5173/?test&unlock&track=salon&car=${car}&rivals=3&fast=2`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.race, { timeout: 90000 });
await new Promise((r) => setTimeout(r, 9000));
const info = await page.evaluate(() => {
  const g = window.__game, s = g.sfx || g.race.sfx;
  return { hasSfx: !!s, ctx: s?.ctx?.state, bank: s ? Object.keys(s.bank || {}).length : -1, engine: s?.engine?.constructor?.name, base: s?.engine?.base, pitch: s?.engine?.pitch,
    active: s?.engine?.act?.size, rivals: s?.rivalVoices?.map((v) => v.constructor.name + ':' + (v.base || '-') + ':' + (v.pitch ?? '')), speed: g.race.player.speed?.toFixed?.(1), rpm: s?.rpm?.toFixed?.(2) };
});
console.log(JSON.stringify(info));
console.log(errs.length ? errs.join('\n') : 'sin errores');
await browser.close();
