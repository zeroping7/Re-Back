// Construye un circuito sin gráficos y muestra sus datos (tramo, puertas, alturas, radio mínimo, separación entre tramos).
//   node tests/trackinfo.mjs volcan [salida.json]
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const THREE = await import('three');
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const { createBuilder } = await import('../src/tracks/common.js');
const { trackFromKey } = await import('../src/tracks/index.js');
const key = process.argv[2] || 'volcan';
const def = trackFromKey(key), world = new RAPIER.World({ x: 0, y: -9.8, z: 0 }), root = new THREE.Group();
const t0 = Date.now();
const B = createBuilder(root, world, RAPIER, 2, { reverse: !!def.reverse });
const T = def.build(B);
const c = T.circuit, S = c.samples, [d0, d1] = c.drive;
console.log(key, 'build ms', Date.now() - t0, 'N', c.N, 'drive', d0, d1, 'len', ((d1 - d0) * 1.6).toFixed(0), 'finishIdx', T.finishIdx, 'bounds', JSON.stringify(T.bounds), 'colliders', world.colliders.len());
console.log('gates', T.gates.map((g) => `${g.i}:${g.name}`).join(' | '));
console.log('h at gates', T.gates.map((g) => S[(g.i + c.N) % c.N].h.toFixed(1)).join(' '), 'hB', S[T.finishIdx].h.toFixed(1));
let minR = 1e9; for (let k = 0; k <= d1; k++) minR = Math.min(minR, S[k].radius); console.log('minRadius', minR.toFixed(1));
// separación mínima entre tramos no contiguos
let sep = 1e9, at = null; for (let a = 0; a <= d1; a++) for (let b = a + 14; b <= d1; b++) { const d = Math.hypot(S[a].p.x - S[b].p.x, S[a].p.z - S[b].p.z); if (d < sep) { sep = d; at = [a, b]; } } console.log('min sep', sep.toFixed(1), at);
if (process.argv[3]) { const fs = await import('fs'); fs.writeFileSync(process.argv[3], JSON.stringify({ road: S.map((s) => [s.p.x, s.p.z, s.h, s.i]), drive: c.drive, gates: T.gates, fin: T.finishIdx, bounds: T.bounds })); }
