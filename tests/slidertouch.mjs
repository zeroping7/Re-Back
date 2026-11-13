// UX-31: dos dedos a la vez (slider + pedal de gas) con toques reales, como en el móvil. Saca capturas de cada modo.
//   node tests/slidertouch.mjs [url] [carpeta]
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:4173/', out = process.argv[3] || '/tmp';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fail = 0;
for (const mode of ['bar', 'float']) {
  const p = await b.newPage(); await p.setViewport({ width: 860, height: 400, hasTouch: true, isMobile: true });
  await p.evaluateOnNewDocument((m) => localStorage.setItem('reback.controlMode', m), mode);
  await p.goto(`${url}?test&track=salon&rivals=2&car=pulga`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__game?.race?.started, { timeout: 120000, polling: 250 });
  const cdp = await p.target().createCDPSession();
  const gas = await (await p.$('#btn-gas')).boundingBox(), box = await (await p.$(mode === 'bar' ? '#steer-bar' : '#steer-float')).boundingBox();
  const g = { x: gas.x + gas.width / 2, y: gas.y + gas.height / 2, id: 1 };
  const s0 = { x: mode === 'bar' ? box.x + box.width / 2 : box.x + box.width * 0.4, y: box.y + box.height - 50, id: 2 };
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((t) => ({ x: t.x, y: t.y, id: t.id })) });
  await touch('touchStart', [g]); await touch('touchStart', [g, s0]);
  for (let i = 1; i <= 5; i++) await touch('touchMove', [g, { ...s0, x: s0.x + i * 10 }]);
  await new Promise((r) => setTimeout(r, 500));
  const r = await p.evaluate(() => ({ ...window.__game.controls.read(), w: window.__game.race.player.steer }));
  await p.screenshot({ path: `${out}/slider-${mode}.png` });
  await touch('touchEnd', [g]); await touch('touchEnd', []);
  const r0 = await p.evaluate(() => window.__game.controls.read());
  const ok = r.throttle === 1 && r.steer < -0.3 && r.w < -0.1 && r0.steer === 0 && r0.throttle === 0;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${mode}: gas ${r.throttle} + slider ${r.steer.toFixed(2)} (ruedas ${r.w.toFixed(2)}) · al soltar los dos: giro ${r0.steer}, gas ${r0.throttle}`);
  await p.close();
}
await b.close(); process.exit(fail ? 1 : 0);
