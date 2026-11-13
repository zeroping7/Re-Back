// UX-31: dirección con slider en una carrera real. Para cada modo (barra fija y flotante) arrastra a la derecha y a la
// izquierda y comprueba el giro de las ruedas, que vuelve a recto al soltar y que flechas e inclinar siguen igual.
//   node tests/sliderui.mjs [url]
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fail = 0;
const check = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${msg}`); };
for (const mode of ['bar', 'float', 'buttons']) {
  const p = await b.newPage(); await p.setViewport({ width: 860, height: 400 });
  p.on('pageerror', (e) => { console.log('ERR', e.message); fail++; });
  await p.evaluateOnNewDocument((m) => localStorage.setItem('reback.controlMode', m), mode);
  await p.goto(`${url}?test&track=salon&rivals=0&car=pulga`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__game?.race?.started, { timeout: 120000, polling: 250 });
  const vis = await p.evaluate(() => ['steer-pad', 'steer-bar', 'steer-float'].map((id) => getComputedStyle(document.getElementById(id)).display !== 'none'));
  const want = { buttons: [true, false, false], bar: [false, true, false], float: [false, false, true] }[mode];
  check(JSON.stringify(vis) === JSON.stringify(want), `${mode}: se ve solo su control (flechas/barra/flotante = ${vis.map((v) => (v ? 'sí' : 'no')).join('/')})`);
  const steer = () => p.evaluate(() => window.__game.controls.read().steer);
  const wheels = () => p.evaluate(() => new Promise((res) => setTimeout(() => res(window.__game.race.player.steer), 400)));
  if (mode === 'buttons') {
    const r = await (await p.$('#btn-right')).boundingBox();
    await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down();
    const w = await wheels(); await p.mouse.up();
    check(w < -0.05, `flechas: ▶ gira a la derecha (ruedas ${w.toFixed(2)})`);
  } else {
    const box = await (await p.$(mode === 'bar' ? '#steer-bar' : '#steer-float')).boundingBox();
    const cx = mode === 'bar' ? box.x + box.width / 2 : box.x + box.width * 0.4, cy = box.y + box.height - 50;
    for (const [frac, label] of [[0.5, 'mitad derecha'], [1, 'tope derecha'], [-0.5, 'mitad izquierda']]) {
      const dx = mode === 'bar' ? frac * (box.width / 2 - 40) : frac * 80;
      await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx + dx, cy, { steps: 5 });
      const s = await steer(), w = await wheels();
      await p.mouse.up();
      const s0 = await steer();
      check(Math.abs(s + frac) < 0.12 && Math.sign(w) === -Math.sign(frac) && s0 === 0, `${mode}: ${label} → mando ${s.toFixed(2)} (esperado ${(-frac).toFixed(2)}), ruedas ${w.toFixed(2)}, al soltar ${s0}`);
    }
    if (mode === 'float') {
      // el centro es donde se apoya el dedo: tocar muy a la derecha sin arrastrar = recto
      await p.mouse.move(box.x + box.width * 0.9, cy); await p.mouse.down();
      const s = await steer(); await p.mouse.up();
      check(Math.abs(s) < 0.01, `float: apoyar el dedo sin arrastrar = recto (${s.toFixed(2)})`);
    }
    // acelerar con el pedal a la vez que se gira (multitáctil simulado: pedal por teclado)
    await p.keyboard.down('ArrowUp'); await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx + 40, cy, { steps: 3 });
    const both = await p.evaluate(() => window.__game.controls.read()); await p.mouse.up(); await p.keyboard.up('ArrowUp');
    check(both.throttle === 1 && both.steer < -0.2, `${mode}: gas y giro a la vez (gas ${both.throttle}, giro ${both.steer.toFixed(2)})`);
  }
  await p.close();
}
await b.close(); process.exit(fail ? 1 : 0);
