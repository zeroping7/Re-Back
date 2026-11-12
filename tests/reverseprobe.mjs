// FIS-37/38: marcha atrás con el volante girado desde parado, y freno + zigzag a baja velocidad sin acelerar.
//   node tests/reverseprobe.mjs [coche,...]
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const { Race, FIXED } = await import('../src/race.js');
const { trackFromKey } = await import('../src/tracks/index.js');
const { carById, carTuning } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const sfx = { play() {}, update() {}, hit() {}, stopEngine() {} };
const hud = { message() {}, setupMinimap() {}, update() {} };
const HD = process.env.HD;
const cars = (process.argv[2] || 'pulga,furgo,rally,formula').split(',');
let fail = 0;
function run(id, scen, v0) {
  let input = { steer: 0, throttle: 0, brake: 0, human: true };
  const race = new Race({ renderer: null, envMap: null, sfx, controls: { read: () => input, consumeFire: () => false }, hud, trackDef: trackFromKey('cocina'), carDef: carById(id), laps: 9, rivals: 0, baseTuning: tuning });
  const car = race.player;
  car.collider.setCollisionGroups((0x0004 << 16) | 0x0001); race.respawn = () => {};
  car.driftMode = false; car.t = carTuning(tuning, carById(id), 1, {});
  let t = 0, T0 = null, t1 = null, vStart = 0, vMax = 0, minFwd = 0;
  while (t < 30) {
    race.update(FIXED); t += FIXED;
    if (!race.started) continue;
    T0 ??= t; const u = t - T0, fwd = car.fwdSpeed;
    if (scen === 'hd') { if (t1 === null && fwd < 20) { input = { steer: 0, throttle: 1, brake: 0, human: true }; continue; } t1 ??= u; input = { steer: 1, throttle: 0, brake: 1, human: true }; if (u - t1 > 1) return { slip: +(Math.abs(Math.atan2(car.localVel.x, Math.max(1, fwd))) * 57.3).toFixed(0), v: +car.speed.toFixed(1) }; continue; }
    if (scen === 'rev') { input = { steer: 1, throttle: 0, brake: 1, human: true }; minFwd = Math.min(minFwd, fwd); if (u > 2) return { minFwd: +minFwd.toFixed(1), yaw: +Math.abs(car.body.angvel().y).toFixed(2) }; }
    else {
      if (t1 === null && fwd < v0) { input = { steer: 0, throttle: 1, brake: 0, human: true }; continue; }
      t1 ??= u; if (!vStart) vStart = fwd;
      const w = u - t1;
      input = { steer: Math.floor(w / 0.25) % 2 ? -1 : 1, throttle: 0, brake: 1, human: true };
      if (w > 0.05) vMax = Math.max(vMax, fwd);
      if (w > 3 || fwd < 0.5) return { vStart: +vStart.toFixed(1), vMax: +vMax.toFixed(1), end: +fwd.toFixed(1) };
    }
  }
}
if (HD) { for (const id of cars) console.log(id, JSON.stringify(run(id, 'hd'))); process.exit(0); }
for (const id of cars) {
  const r = run(id, 'rev');
  const okR = r.minFwd < -2 && r.yaw > 0.3;
  const z = [6, 10, 14].map((v) => run(id, 'zig', v));
  const okZ = z.every((s) => s.vMax <= s.vStart + 0.3);
  if (!okR || !okZ) fail++;
  console.log(`${id.padEnd(8)} atrás girando: ${JSON.stringify(r)} ${okR ? '✓' : '✗'} · freno+zigzag: ${z.map((s) => `${s.vStart}→máx ${s.vMax}`).join(', ')} ${okZ ? '✓' : '✗'}`);
}
process.exit(fail ? 1 : 0);
