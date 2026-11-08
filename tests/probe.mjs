import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
page.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 300)));
await page.goto(process.argv[2], { waitUntil: 'load' });
await page.waitForFunction(() => window.__game, { timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));
console.log(await page.evaluate(() => {
  const g = window.__game, r = g.renderer;
  const gl = r.getContext();
  return JSON.stringify({ info: r.info.render, mem: r.info.memory, programs: r.info.programs?.length, cam: g.camera.position, err: gl.getError(), size: [gl.drawingBufferWidth, gl.drawingBufferHeight], children: g.scene.children.length });
}));
await page.screenshot({ path: process.argv[3] || '/tmp/probe.png' });
await browser.close();
