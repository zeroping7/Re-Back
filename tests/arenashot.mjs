// Fotos de la arena de batalla con cámara fija: node tests/arenashot.mjs '[["nombre",[x,y,z],[mx,my,mz]]]'
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
await p.goto('http://localhost:4173/?test&auto&battle&rivals=3', { waitUntil: 'load' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let t = 0; t < 40; t++) { if (await p.evaluate(() => !!window.__game?.race?.started).catch(() => false)) break; await sleep(1000); }
const views = JSON.parse(process.argv[2]);
for (const [name, pos, look] of views) {
  await p.evaluate((pos, look) => { const r = window.__game.race; r.debugCam = { pos, look }; }, pos, look);
  await sleep(1500);
  await p.screenshot({ path: `/tmp/shots/${name}.png` });
}
await b.close();
