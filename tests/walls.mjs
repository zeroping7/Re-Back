// Paredes de la arena (UX-27): el coche no debe meterse en la pared (ni de frente ni en diagonal ni rozando)
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const THREE = await import('three');
const { Race, FIXED } = await import('../src/race.js');
const { ARENA } = await import('../src/battle.js');
const { carById } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const sfx = { play() {}, update() {}, hit() {}, stopEngine() {} };
const hud = { message() {}, setupMinimap() {}, update() {}, lookBack() {} };
let fails = 0;
for (const id of (process.argv[2] || 'pulga,tanque,formula').split(',')) {
  const inp = { steer: 0, throttle: 1, brake: 0 };
  const race = new Race({ renderer: null, envMap: null, sfx, controls: { read: () => inp, consumeFire: () => false, camStick: { x: 0, y: 0 } }, hud, battle: true, trackDef: ARENA, carDef: carById(id), laps: 1, rivals: 0, difficulty: 1, baseTuning: tuning });
  const P = race.player, S = race.S; while (!race.started) race.update(FIXED);
  const WX = (50 - 0.4) * S, WZ = (36 - 0.4) * S, // cara del zócalo
    v = new THREE.Vector3();
  let worst = 0;
  // [x, z, rumbo, eje]  de frente y en diagonal contra la pared este y la norte (con turbo)
  for (const [x, z, yaw, ax] of [[50, 10, Math.PI / 2, 'x'], [50, -30, Math.PI / 4, 'x'], [10, 30, 0, 'z'], [40, 40, Math.PI * 0.3, 'z']]) {
    P.reset(new THREE.Vector3(x, 0.6, z), yaw); P.fx.boost = 3;
    for (let k = 0; k < 240; k++) {
      race.update(FIXED);
      // punto más metido de la caja del modelo (esquinas) respecto a la cara visible de la pared
      for (const cx of [-0.69, 0.69]) for (const cz of [-1.08, 1.08]) {
        v.set(cx, 0.2, cz).applyQuaternion(P.currQuat).add(P.currPos);
        worst = Math.max(worst, ax === 'x' ? v.x - WX : v.z - WZ);
      }
    }
  }
  const ok = worst <= 0.05;
  if (!ok) fails++;
  console.log(`${ok ? '✔' : '✘'} ${id}: lo más metido en la pared ${worst.toFixed(2)} u`);
}
process.exit(fails ? 1 : 0);
