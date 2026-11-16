// COC-27: la mejora de Suspensión baja el coche en peana y en pista (hubY) y endurece la suspensión
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
for (const lvl of [0, 3]) {
  const p = await b.newPage(); await p.setViewport({ width: 900, height: 420 });
  await p.evaluateOnNewDocument((lvl) => { localStorage.setItem('reback.profile.v2', JSON.stringify({ money: 99999, owned: { furgo: {}, pulga: lvl ? { susp: lvl } : {} }, selected: 'pulga', earned: 0, cups: {}, stars: {} })); }, lvl);
  await p.goto('http://localhost:4173/?test&unlock&track=salon&car=pulga&rivals=0', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__game?.race, { timeout: 90000 }); await sleep(3000);
  out['pista' + lvl] = await p.evaluate(() => { const r = window.__game.race, t = r.player.t; return { hub: r.player.hubY[0].toFixed(3), rest: t.suspRest.toFixed(3), stiff: t.suspStiff.toFixed(1) }; });
  await p.goto('http://localhost:4173/?test&unlock&screen=m-garage&car=pulga', { waitUntil: 'load' }); await sleep(2500);
  await p.screenshot({ path: `/tmp/susp${lvl}.png`, clip: { x: 520, y: 100, width: 380, height: 260 } });
  await p.close();
}
console.log(JSON.stringify(out, null, 1));
const o = out; const ok = +o.pista3.rest < +o.pista0.rest && +o.pista3.stiff > +o.pista0.stiff && +o.pista3.hub > +o.pista0.hub;
console.log(ok ? '✓ OK' : '✗ FALLA'); await b.close(); process.exit(ok ? 0 : 1);
