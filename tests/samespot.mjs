// CIR-30: la mesa del salón queda en el mismo sitio en sentido normal, al revés y en espejo.
//   node tests/samespot.mjs salon salon:rev salon:mirror
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const THREE = await import('three');
const { createBuilder, buildCircuit } = await import('../src/tracks/common.js');
const { trackFromKey } = await import('../src/tracks/index.js');
for (const key of process.argv.slice(2)) {
  const def = trackFromKey(key);
  const world = new RAPIER.World({ x: 0, y: -9.8, z: 0 });
  const B = createBuilder(new THREE.Scene(), world, RAPIER, 2, { mirror: def.mirror, reverse: def.reverse });
  const orig = B.box; const tops = [];
  B.box = (w, h, d, x, y, z, ...r) => { if (Math.abs(y - 3.8) < 1e-6 && h === 0.7) tops.push([x, z]); return orig(w, h, d, x, y, z, ...r); };
  const log = []; const bc = buildCircuit;
  def.build(B);
  console.log(key, 'tableTop', tops.map(([x, z]) => `${x.toFixed(1)},${z.toFixed(1)}`).join(' '));
}
