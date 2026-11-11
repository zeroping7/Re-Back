// AUD-13: renderiza los motores en Chrome headless (OfflineAudioContext), mide nivel y clics y guarda WAV en /tmp/engine.
//   node tests/engine.mjs [coche,coche,...]        (requiere: npx vite --port 5173)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const ids = (process.argv[2] || 'flecha,pulga,cabra,tanque,katana,cometa').split(',');
const out = '/tmp/engine'; fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.text()); });
await page.goto('http://localhost:5173/tests/engine.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.ready, { timeout: 60000 });
const SR = 44100;
const rms = (x, a, b) => { let s = 0; for (let i = a * SR | 0; i < b * SR; i++) s += x[i] * x[i]; return Math.sqrt(s / ((b - a) * SR)); };
function wav(x, file) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(x[i] * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
}
// clics: salto de la 2.ª derivada respecto a su valor típico en ventanas de 50 ms
function clicks(x) {
  let worst = 0;
  const w = 2205;
  for (let a = SR; a + w < x.length; a += w) {
    let m = 0, mx = 0;
    for (let i = a; i < a + w; i++) { const d = Math.abs(x[i] - 2 * x[i - 1] + x[i - 2]); m += d; if (d > mx) mx = d; }
    m /= w; if (m > 1e-5) worst = Math.max(worst, mx / m);
  }
  return worst;
}
for (const id of ids) {
  for (const kind of (['flecha', 'tanque'].includes(id) ? ['old', 'new'] : ['new'])) {
    const b64 = await page.evaluate((i, k) => window.renderCar(i, k), id, kind);
    const u8 = Buffer.from(b64, 'base64'), i16 = new Int16Array(u8.buffer, u8.byteOffset, u8.length / 2);
    const x = Float32Array.from(i16, (v) => v / 32767);
    wav(x, `${out}/${id}_${kind}.wav`);
    console.log(id.padEnd(8), kind, 'RMS ralentí', rms(x, 0.5, 1).toFixed(4), '· acel', rms(x, 3, 4).toFixed(4), '· tope', rms(x, 5.5, 6.5).toFixed(4), '· soltar', rms(x, 8, 9).toFixed(4),
      '· pico', x.reduce((m, v) => Math.max(m, Math.abs(v)), 0).toFixed(3), '· clics×', clicks(x).toFixed(0));
  }
}
await browser.close();
