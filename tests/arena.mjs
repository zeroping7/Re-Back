// Arena de batalla (UX-17): se puede subir por la silla hasta la mesa, bajar de la mesa y pasar por la caja central
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
// recorridos: [nombre, salida (x,z,rumbo), eje que mantener, prueba]
const runs = [
  ['subir silla → mesa', [36, 48, -Math.PI / 2], { z: 48 }, (p, m) => m.maxY > 17],
  ['bajar de la mesa', [-78, 40, Math.PI, 19], { x: -78 }, (p) => p.z < -30 && p.y < 2],
  ['caja central', [60, 0, -Math.PI / 2], { z: 0 }, (p, m) => m.maxY > 6 && p.x < -40],
];
let fails = 0;
for (const carId of (process.argv[2] || 'pulga,tanque,formula').split(',')) {
  for (const [name, [x, z, yaw, y = 0.6], keep, ok] of runs) {
    const inp = { steer: 0, throttle: 1, brake: 0 };
    const controls = { read: () => inp, consumeFire: () => false, camStick: { x: 0, y: 0 } };
    const race = new Race({ renderer: null, envMap: null, sfx, controls, hud, battle: true, trackDef: ARENA, carDef: carById(carId), laps: 1, rivals: 1, difficulty: 1, baseTuning: tuning });
    const P = race.player, other = race.cars.find((c) => c !== P);
    while (!race.started) race.update(FIXED);
    other.reset(new THREE.Vector3(80, 0.6, -10), 0);
    P.reset(new THREE.Vector3(x, y, z), yaw);
    const m = { maxY: 0 };
    let pass = false;
    for (let k = 0; k < 60 * 6; k++) {
      const err = keep.z !== undefined ? P.currPos.z - keep.z : -(P.currPos.x - keep.x);
      const sgn = keep.z !== undefined ? (P.forward.x < 0 ? 1 : -1) : (P.forward.z < 0 ? 1 : -1);
      inp.steer = Math.max(-1, Math.min(1, -err * 0.12 * sgn));
      race.update(FIXED);
      m.maxY = Math.max(m.maxY, P.currPos.y);
      if (ok(P.currPos, m)) { pass = true; break; }
    }
    if (!pass) fails++;
    console.log(`${pass ? '✔' : '✘'} ${carId}: ${name} (altura máx ${m.maxY.toFixed(1)}, fin ${P.currPos.x.toFixed(0)},${P.currPos.y.toFixed(1)},${P.currPos.z.toFixed(0)})`);
  }
}
process.exit(fails ? 1 : 0);
