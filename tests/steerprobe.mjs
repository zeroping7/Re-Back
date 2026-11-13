// UX-30: respuesta de la dirección. Para cada coche y velocidad, mantiene una fracción fija de volante con gas
// y mide la cruzada máxima (°) en 1,5 s. Sirve para ver a partir de qué volante el coche deja de agarrar.
//   node tests/steerprobe.mjs [coche,...]
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const w0 = console.warn; console.warn = () => {};
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const THREE = await import('three');
const { Car } = await import('../src/car.js');
const { carById, carTuning } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const FIXED = 1 / 60;
const cars = (process.argv[2] || 'pulga,furgo,rally,flecha,formula').split(',');
const SPEEDS = [10, 16, 22, 28], FR = [0.2, 0.4, 0.6, 0.8, 1];
function run(id, v0, f) {
  const world = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(2000, 0.5, 2000).setTranslation(0, -0.5, 0).setFriction(1));
  const car = new Car(new THREE.Scene(), world, RAPIER, carById(id), carTuning(tuning, carById(id), 1, {}));
  car.reset(new THREE.Vector3(0, 0, -1500), 0);
  const step = (input) => { car.step(FIXED, input); world.step(); car.afterStep(FIXED); };
  for (let i = 0; i < 60; i++) step({ steer: 0, throttle: 0, brake: 0 });
  let n = 0; while (car.fwdSpeed < v0 && n++ < 1200) step({ steer: 0, throttle: 1, brake: 0 });
  if (car.fwdSpeed < v0) return null;
  let beta = 0, yr = 0, hist = [];
  for (let i = 0; i < 90; i++) {
    step({ steer: f, throttle: 1, brake: 0 });
    if (car.speed > 2) beta = Math.max(beta, Math.atan2(Math.abs(car.localVel.x), car.localVel.z) * 57.3);
    hist.push(Math.abs(car.body.angvel().y));
  }
  const end = hist.slice(-20).reduce((a, x) => a + x, 0) / 20; // giro estable (rad/s)
  const lag = hist.findIndex((x) => x >= 0.63 * end) * FIXED;   // tiempo en alcanzar el 63 % del giro
  return { beta: Math.round(beta), R: +(car.speed / Math.max(end, 0.01)).toFixed(0), lag: +lag.toFixed(2), g: +(end * car.speed / tuning.gravity).toFixed(1) };
}
console.log('cruzada máx. (°) con volante al 20/40/60/80/100 %  ·  [al 100 %: radio de giro, g lateral, retardo s]');
for (const id of cars) {
  console.log(id.padEnd(8), SPEEDS.map((v) => { const rs = FR.map((f) => run(id, v, f)); return rs[0] ? `v${v}: ${rs.map((r) => String(r.beta).padStart(2)).join(' ')} [R${rs[4].R} ${rs[4].g}g ${rs[4].lag}s]` : `v${v}: —`; }).join('  |  '));
}
console.warn = w0;
