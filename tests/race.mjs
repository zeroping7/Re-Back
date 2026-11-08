// Carrera completa en Chrome headless con el jugador en piloto automático.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.argv[2];
const out = process.argv[3] || 'tests/shots';
const secs = +(process.argv[4] || 20);
const every = +(process.argv[5] || 3);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/GPU stall|AudioContext/.test(m.text()))) errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
await page.goto(url, { waitUntil: 'load' });
try { await page.waitForFunction(() => window.__game && window.__game.race, { timeout: 60000 }); } catch (e) { console.log('NO RACE', errors.join('\n')); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < secs; i++) {
  await sleep(1000);
  const t = await page.evaluate(() => {
    const r = window.__game.race; if (!r) return 'no race';
    const st = r.state(r.player);
    const info = r.player.render ? `info calls=${r.renderer.info.render.calls} tris=${r.renderer.info.render.triangles}` : '';
    return `t=${r.time.toFixed(1)} phase=${r.phase} place=${st.place} laps=${st.laps} prog=${st.progress} v=${r.player.fwdSpeed.toFixed(1)} item=${r.player.item} proj=${r.items.projectiles.length} ${info} fps=${document.getElementById('fps').textContent}`;
  });
  console.log(i, t);
  if (i % every === every - 1) await page.screenshot({ path: `${out}/r${String(i).padStart(2, '0')}.png` });
}
console.log('ERRORS:\n' + errors.slice(0, 15).join('\n'));
await browser.close();
