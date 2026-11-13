// CRW-28/29: coches de Obstáculos. Al soltar el gas en llano siguen rodando un poco; en cuesta se quedan quietos.
// Y altura libre de los bajos en reposo.
//   node tests/crawlprobe.mjs [coche,...]
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const THREE = await import('three');
const { Car } = await import('../src/car.js');
const { carById, carTuning } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const { crawlTuning } = await import('../src/disciplines.js');
const FIXED = 1 / 60;
const cars = (process.argv[2] || 'cabra,oruga,yeti,tanque,morsa').split(',');
const origWarn = console.warn; console.warn = () => {};

function make(id, slopeDeg) {
  const world = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
  const a = (slopeDeg * Math.PI) / 180, q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -a);
  world.createCollider(RAPIER.ColliderDesc.cuboid(400, 0.5, 400).setTranslation(0, -0.5, 0).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
  const def = carById(id);
  const car = new Car(new THREE.Scene(), world, RAPIER, def, crawlTuning(carTuning(tuning, def, 1, {})));
  car.crawl = true;
  const z = -100, y = Math.tan(a) * z * -1 * -1; // en la rampa: altura = z·tan(a)
  car.reset(new THREE.Vector3(0, Math.tan(a) * z + 0.2, z), 0);
  const step = (input) => { car.step(FIXED, input); world.step(); car.afterStep(FIXED); };
  return { car, step };
}
const idle = { steer: 0, throttle: 0, brake: 0 }, gas = { steer: 0, throttle: 1, brake: 0 };

let fail = 0;
for (const id of cars) {
  // llano: a tope y soltar → distancia hasta parar
  let { car, step } = make(id, 0);
  for (let i = 0; i < 60; i++) step(idle);
  const y0 = car.body.translation().y + 0.12 - 0.23; // bajos del chasis en reposo
  for (let i = 0; i < 240; i++) step(gas);
  const v0 = car.fwdSpeed, p0 = car.body.translation().z;
  let tStop = null;
  for (let i = 0; i < 600; i++) { step(idle); if (tStop === null && car.speed < 0.3) { tStop = i * FIXED; break; } }
  const coast = car.body.translation().z - p0;
  // cuestas: subir parado al soltar (no debe rodar hacia atrás)
  const holds = [15, 25].map((deg) => {
    const s = make(id, deg);
    for (let i = 0; i < 60; i++) s.step(idle);
    for (let i = 0; i < 120; i++) s.step(gas);
    for (let i = 0; i < 60; i++) s.step(idle);
    const z1 = s.car.body.translation().z;
    for (let i = 0; i < 180; i++) s.step(idle);
    return +(s.car.body.translation().z - z1).toFixed(2); // < 0 = rueda hacia atrás
  });
  const ok = holds.every((d) => d > -0.7);
  if (!ok) fail++;
  console.log(`${id.padEnd(7)} bajos ${y0.toFixed(2)} · punta ${v0.toFixed(1)} · suelta en llano: ${coast.toFixed(2)} u en ${tStop?.toFixed(2) ?? '>10'} s · en cuesta 15°/25° se mueve ${holds.join(' / ')} u ${ok ? '✓' : '✗'}`);
}
console.warn = origWarn;
process.exit(fail ? 1 : 0);
