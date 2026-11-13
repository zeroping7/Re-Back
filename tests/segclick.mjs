// UX-29: los selectores marcan la opción elegida tras pulsar (también los que se redibujan: sensibilidad, música).
//   node tests/segclick.mjs [url]
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: 860, height: 400 });
await p.goto(url + '?test&screen=m-settings', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 5000));
const sel = (id) => p.$$eval(`#${id} button`, (bs) => bs.map((x) => (x.classList.contains('sel') ? x.textContent : null)).filter(Boolean));
let fail = 0;
for (const [id, i, id2] of [['opt-sens', 4, 'opt-sens2'], ['opt-sens', 0, 'opt-sens2'], ['opt-music', 1], ['opt-music', 0], ['opt-quality', 1], ['opt-quality', 0]]) {
  const btns = await p.$$(`#${id} button`); const want = await btns[i].evaluate((x) => x.textContent);
  await btns[i].evaluate((x) => x.click());
  const got = await sel(id), got2 = id2 ? await sel(id2) : [want];
  const ok = got.length === 1 && got[0] === want && got2[0] === want;
  if (!ok) fail++;
  console.log(`${id} → ${want}: marcado ${JSON.stringify(got)}${id2 ? ` · pausa ${JSON.stringify(got2)}` : ''} ${ok ? '✓' : '✗'}`);
}
await b.close(); process.exit(fail ? 1 : 0);
