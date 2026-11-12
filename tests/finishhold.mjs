// CRW-27: en La maqueta (tramo A→B), tras cruzar la meta el coche se para y no da marcha atrás (subiendo y bajando)
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const { Race, FIXED } = await import('../src/race.js');
const { trackFromKey } = await import('../src/tracks/index.js');
const { carById } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const sfx = { play() {}, update() {}, hit() {}, stopEngine() {} };
const hud = { message() {}, setupMinimap() {}, update() {}, lookBack() {} };
let fails = 0;
for (const id of (process.argv[2] || 'senda,senda:rev').split(',')) {
  const def = trackFromKey(id);
  if (!def) { console.log('?', id); continue; }
  const race = new Race({ renderer: null, envMap: null, sfx, controls: { read: () => ({ steer: 0, throttle: 0, brake: 0 }), consumeFire: () => false, camStick: { x: 0, y: 0 } }, hud, trackDef: def, carDef: carById('cabra'), laps: 1, rivals: 0, difficulty: 1, baseTuning: tuning });
  race.autoPlayer = true;
  const st = race.state(race.player);
  let t = 0;
  while (!st.finished && t < 400) { race.update(FIXED); t += FIXED; }
  let minFwd = Infinity, back = 0;
  const p0 = race.player.currPos.clone();
  for (let k = 0; k < 60 * 5; k++) { race.update(FIXED); if (k > 60) minFwd = Math.min(minFwd, race.player.fwdSpeed); if (race.player.reversing) back++; }
  const moved = race.player.currPos.distanceTo(p0);
  const ok = st.finished && minFwd > -0.5 && back === 0;
  if (!ok) fails++;
  console.log(`${ok ? '✔' : '✘'} ${id}: meta a los ${t.toFixed(0)} s; tras la meta vel. mín ${minFwd.toFixed(2)}, pasos en marcha atrás ${back}, se mueve ${moved.toFixed(1)} u`);
}
process.exit(fails ? 1 : 0);
