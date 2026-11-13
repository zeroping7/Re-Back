// FIS-39..41: derrape en Carrera (freno + giro a fondo) sin trompo, y el gas endereza al soltar el freno.
//   node tests/spinprobe.mjs [coche,...]
// Por coche y velocidad: ángulo máximo de cruzada, si hizo trompo (> 100°) y tiempo hasta enderezar (< 12°) tras dar gas.
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const THREE = await import('three');
const { Car } = await import('../src/car.js');
const FIXED = 1 / 60;
const { carById, carTuning } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const cars = (process.argv[2] || 'pulga,furgo,chispa,rally,tanque,flecha,formula').split(',');
const SPEEDS = [16, 22, 28];
// Curva cerrada típica: freno + giro a fondo BRK s (o hasta bajar de 7 u/s) y luego gas con el volante aún girado HOLD s;
// por último gas recto hasta enderezar.
const BRK = 0.7, HOLD = 1.0, REC = 2.0;
const slipDeg = (car) => (car.speed < 2 || car.reversing ? 0 : Math.atan2(Math.abs(car.localVel.x), car.localVel.z) * 57.3);

function run(id, v0, long = false, nobrake = false) {
  let input = { steer: 0, throttle: 0, brake: 0 };
  // suelo plano enorme sin decorado (FIS-39..41)
  const world = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(2000, 0.5, 2000).setTranslation(0, -0.5, 0).setFriction(1));
  const car = new Car(new THREE.Scene(), world, RAPIER, carById(id), carTuning(tuning, carById(id), 1, {}));
  car.reset(new THREE.Vector3(0, 0, -1500), 0);
  const race = { started: true, update(dt) { car.step(dt, input); world.step(); car.afterStep(dt); car.snapshot?.(); } };
  for (let i = 0; i < 90; i++) race.update(FIXED); // asentar
  let air = 0, t = 0, t1 = null, t2 = null, t3 = null, vIn = 0, vMin = 99, maxSlip = 0, rec = null, yaw = 0;
  while (t < 40) {
    race.update(FIXED); t += FIXED;
    if (!race.started) continue;
    if (t1 === null) {
      if (car.fwdSpeed < v0) { input = { steer: 0, throttle: 1, brake: 0, human: true }; if (t > 30) return null; continue; }
      t1 = t; vIn = car.fwdSpeed;
    }
    air = car.contacts < 2 ? air + FIXED : 0; if (air > 0.15) return { hit: true }; // en el aire: no vale
    const s = slipDeg(car); maxSlip = Math.max(maxSlip, s); vMin = Math.min(vMin, car.speed);
    if (t2 === null) { input = nobrake ? { steer: 1, throttle: 1, brake: 0, human: true } : { steer: 1, throttle: 0, brake: 1, human: true }; if (!car.reversing) yaw += car.body.angvel().y * FIXED * 57.3; if (long ? t - t1 > 1.6 : t - t1 > BRK || car.speed < 7) t2 = t; continue; }
    if (t - t2 < HOLD) { input = { steer: 1, throttle: 1, brake: 0, human: true }; continue; }
    t3 ??= t;
    if (t - t3 < REC) { input = { steer: 0, throttle: 1, brake: 0, human: true }; if (rec === null && s < 12) rec = t - t3; continue; }
    break;
  }
  return { vIn: +vIn.toFixed(1), vMin: +vMin.toFixed(1), maxSlip: Math.round(maxSlip), spin: maxSlip > 90, yaw: Math.round(Math.abs(yaw)), rec: rec === null ? null : +rec.toFixed(2) };
}

let sumYaw = 0, spins = 0, noRec = 0, n = 0, sumSlip = 0, sumRec = 0, nRec = 0;
for (const id of cars) {
  const rs = [...SPEEDS.map((v) => [v, run(id, v)]), ...SPEEDS.map((v) => [`${v}L`, run(id, v, true)]), ...SPEEDS.map((v) => [`${v}G`, run(id, v, true, true)])].filter(([, r]) => r && !r.hit);
  for (const [, r] of rs) { n++; sumSlip += r.maxSlip; if (r.spin) spins++; if (r.rec === null) noRec++; else { sumRec += r.rec; nRec++; } }
  sumYaw += rs.reduce((a, [, r]) => a + r.yaw, 0);
  console.log(id.padEnd(8), rs.map(([v, r]) => `${v} ${r.maxSlip}°${r.spin ? '!' : ''}`).join(' · '));
}
console.log(`\nTotal ${n} pruebas válidas · trompos ${spins} · sin enderezar ${noRec} · cruzada media ${Math.round(sumSlip / n)}° · giro medio ${Math.round(sumYaw / n)}° · enderezar medio ${nRec ? (sumRec / nRec).toFixed(2) : '—'}s`);
process.exit(spins ? 1 : 0);
