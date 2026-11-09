// Prueba visual del daño: abolla el coche del jugador y saca capturas cercanas
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 500 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(process.argv[2], { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.race, { timeout: 60000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(3000);
await page.screenshot({ path: 'tests/shots/dmg0.png' });
await page.evaluate(() => {
  const c = window.__game.race.player;
  c.damage(30, { x: 0.5, y: 0.15, z: 0.9 }, 1);
  c.damage(25, { x: -0.55, y: 0.2, z: -0.4 }, 1);
  c.damage(25, { x: 0.1, y: 0.3, z: -0.95 }, 1);
});
await sleep(3000);
await page.screenshot({ path: 'tests/shots/dmg1.png' });
console.log(await page.evaluate(() => window.__game.race.player.health), errors);
await browser.close();
