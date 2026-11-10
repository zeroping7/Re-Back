import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto('http://localhost:4173/?test&unlock&track=senda&solo&rivals=0', { waitUntil: 'load' });
await p.waitForFunction(() => window.__game?.race, { timeout: 90000 });
console.log(JSON.stringify(await p.evaluate(() => { const r = window.__game.race; return { N: r.circuit.N, len: r.circuit.length, gates: r.T.gates.map((g) => ({ ...g, x: +(r.circuit.samples[((g.i % r.circuit.N) + r.circuit.N) % r.circuit.N].p.x / 2).toFixed(1), z: +(r.circuit.samples[((g.i % r.circuit.N) + r.circuit.N) % r.circuit.N].p.z / 2).toFixed(1) })) }; })));
await b.close();
