// Foto de cerca de las marcas de derrape (FIS-36): node tests/skidshot.mjs <circuito> <salida.png>
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
const [track, out] = process.argv.slice(2);
await p.goto(`http://localhost:4173/?test&unlock&track=${track}&auto&rivals=3`, { waitUntil: 'load' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let t = 0; t < 40; t++) { if (await p.evaluate(() => !!window.__game?.race?.started).catch(() => false)) break; await sleep(1000); }
await sleep(20000);
await p.evaluate(() => { const r = window.__game.race, c = r.player.currPos; r.debugCam = { pos: [c.x + 4, c.y + 6, c.z + 4], look: [c.x, c.y, c.z] }; r.paused = true; });
await sleep(1500);
await p.screenshot({ path: out });
await b.close();
