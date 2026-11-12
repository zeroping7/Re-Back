// Looping de la arena (UX-25, física): con el turbo de la entrada da la vuelta completa y sale por el otro carril;
// sin carrerilla (sale de x=60 sin turbo) no llega arriba: se cae y no sale por el otro carril
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const { Race, FIXED } = await import('../src/race.js');
const { ARENA } = await import('../src/battle.js');
const { carById } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const sfx = { play() {}, update() {}, hit() {}, stopEngine() {} };
const hud = { message() {}, setupMinimap() {}, update() {}, lookBack() {} };
let ok = 0, n = 0;
for (const [carId, slow] of (process.argv[2] || 'pulga,chispa,tanque,formula').split(',').flatMap((id) => [[id, false], [id, true]])) {
  const inp = { steer: 0, throttle: 1, brake: 0 };
  const controls = { read: () => inp, consumeFire: () => false, camStick: { x: 0, y: 0 } };
  const race = new Race({ renderer: null, envMap: null, sfx, controls, hud, battle: true, trackDef: ARENA, carDef: carById(carId), laps: 1, rivals: 1, difficulty: 1, baseTuning: tuning });
  const P = race.player, other = race.cars.find((c) => c !== P);
  let t = 0;
  while (!race.started) { race.update(FIXED); t += FIXED; }
  other.reset(new (P.currPos.constructor)(-80, 0.6, 60), 0);
  P.reset(new (P.currPos.constructor)(slow ? 58 : 96, 0.6, -54), -Math.PI / 2);
  let maxY = 0, top = false, out = null;
  for (let k = 0; k < 60 * 8; k++) {
    // mantener el carril de entrada (z = -54) antes del rizo
    inp.steer = P.currPos.x > (slow ? 52 : 60) ? Math.max(-1, Math.min(1, (P.currPos.z + 54) * 0.15)) : 0;
    race.update(FIXED);
    maxY = Math.max(maxY, P.currPos.y);
    if (P.currPos.y > 14 && P.up.y < -0.5) top = true;
    if (top && P.currPos.x < 20 && P.currPos.y < 2) { out = P.currPos.clone(); break; }
    if (process.env.TRACE && k % (process.env.FINE ? 3 : 15) === 0) console.log(`  t=${(k/60).toFixed(2)} p=${P.currPos.x.toFixed(1)},${P.currPos.y.toFixed(1)},${P.currPos.z.toFixed(1)} up=${P.up.y.toFixed(2)} v=${P.speed.toFixed(1)} c=${P.contacts} st=${P.fx.stick.toFixed(2)} vel=${P.velocity.x.toFixed(1)},${P.velocity.y.toFixed(1)},${P.velocity.z.toFixed(1)} fwd=${P.forward.x.toFixed(2)},${P.forward.y.toFixed(2)},${P.forward.z.toFixed(2)} hp=${P.health.toFixed(0)}`);
  }
  const pass = slow ? !out : top && out && Math.abs(out.z + 38) < 7;
  ok += pass ? 1 : 0; n++;
  console.log(`${pass ? '✔' : '✘'} ${carId}${slow ? ' (sin carrerilla, debe caer)' : ''}: altura máx ${maxY.toFixed(1)}, boca abajo arriba: ${top}, salida ${out ? `x=${out.x.toFixed(0)} z=${out.z.toFixed(0)}` : 'no'}`);
}
process.exit(ok === n ? 0 : 1);
