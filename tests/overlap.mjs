// Comprueba que un trazado no se pisa a sí mismo y enseña sus curvas más cerradas. Uso: node tests/overlap.mjs <circuito>
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const { Race } = await import('../src/race.js');
const { trackFromKey } = await import('../src/tracks/index.js');
const { carById } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const sfx = { play() {}, update() {}, hit() {}, stopEngine() {} };
const hud = { message() {}, setupMinimap() {}, update() {} };
for (const id of process.argv.slice(2)) {
  const race = new Race({ renderer: null, envMap: null, sfx, controls: { read: () => ({}), consumeFire: () => false }, hud, trackDef: trackFromKey(id), carDef: carById('rayo'), laps: 1, rivals: 0, baseTuning: tuning });
  const c = race.circuit, S = c.samples, N = c.N, need = c.width + 2.6 * race.S;
  let worst = Infinity, wi = 0, wj = 0, minR = Infinity;
  for (let i = 0; i < N; i++) {
    minR = Math.min(minR, S[i].radius);
    for (let j = i + 1; j < N; j++) {
      const gap = Math.min(j - i, N - (j - i));
      if (gap * c.spacing < need * 2.2) continue;
      const d = Math.hypot(S[i].p.x - S[j].p.x, S[i].p.z - S[j].p.z);
      if (d < worst) { worst = d; wi = i; wj = j; }
    }
  }
  console.log(`${id}: N=${N} largo=${c.length.toFixed(0)} ancho=${c.width} radio mín=${minR.toFixed(1)} separación mín=${worst.toFixed(1)} (necesita ${need.toFixed(1)}) en ${(wi / N).toFixed(2)}/${(wj / N).toFixed(2)} ${worst < need ? '❌ SE PISA' : '✅'}`);
  const lim = c.width / 2 + 2.5 * race.S, tight = [];
  for (let i = 0; i < N; i++) if (S[i].radius < lim && (i === 0 || S[i - 1].radius >= lim)) { let r = Infinity, j = i; while (j < N && S[j].radius < lim) r = Math.min(r, S[j++].radius); tight.push(`${(i / N).toFixed(2)}→r${(r / race.S).toFixed(1)} @[${(S[i].p.x / race.S).toFixed(0)},${(S[i].p.z / race.S).toFixed(0)}]`); }
  console.log(`   curvas más cerradas que ${(lim / race.S).toFixed(1)} (diseño):`, tight.join('  ') || 'ninguna');
  console.log('   obstáculos:', (race.T.hazards || []).length, 'zonas:', (race.T.zones || []).map((z) => z.effect).join(','));
}
