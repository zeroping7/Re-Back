// UX-30: ayuda de giro para botones (Carrera). Simula pulsaciones de botón (sí/no) con y sin ayuda y mide:
//   toque de 80/150/300 ms → cambio de rumbo (°) · mantener → tiempo hasta el 90 % del giro y cruzada máx.
//   contravolante tras un derrape con freno → tiempo en enderezar y cruzada al lado contrario.
//   node tests/assistprobe.mjs [coche,...]
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const w0 = console.warn; console.warn = () => {};
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const THREE = await import('three');
const { Car } = await import('../src/car.js');
const { carById, carTuning } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const FIXED = 1 / 60, SENS = +(process.env.SENS || 1);
const cars = (process.argv[2] || 'pulga,furgo,rally,flecha,formula').split(',');
const SPEEDS = [12, 20, 27];

function sim(id, v0, assist, script) {
  const world = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(2000, 0.5, 2000).setTranslation(0, -0.5, 0).setFriction(1));
  const car = new Car(new THREE.Scene(), world, RAPIER, carById(id), carTuning(tuning, carById(id), 1, {}));
  car.reset(new THREE.Vector3(0, 0, -1500), 0);
  let smooth = 0; // botones sin ayuda: misma rampa que src/controls.js
  const step = (d, thr = 1, brk = 0) => {
    const rate = d === 0 ? 9 : 4.2 * SENS;
    smooth += Math.max(-rate * FIXED, Math.min(rate * FIXED, d - smooth));
    car.step(FIXED, { steer: smooth, throttle: thr, brake: brk, human: true, sens: SENS, digital: d, assist });
    world.step(); car.afterStep(FIXED);
  };
  for (let i = 0; i < 60; i++) step(0, 0);
  let n = 0; while (car.fwdSpeed < v0 && n++ < 1500) step(0);
  if (car.fwdSpeed < v0) return null;
  const yaw = () => { const f = car.forward; return Math.atan2(f.x, f.z) * 57.3; };
  const beta = () => (car.speed > 2 ? Math.atan2(car.localVel.x, Math.max(0.1, car.localVel.z)) * 57.3 : 0);
  return script({ car, step, yaw, beta });
}
const tap = (ms) => ({ step, yaw, beta }) => {
  const y0 = yaw(); let b = 0;
  for (let i = 0; i < 60; i++) { step(i * FIXED < ms / 1000 ? 1 : 0); b = Math.max(b, Math.abs(beta())); }
  return { turn: Math.abs(yaw() - y0), beta: b };
};
const hold = ({ car, step, beta }) => {
  const h = []; let b = 0;
  for (let i = 0; i < 100; i++) { step(1); h.push(Math.abs(car.body.angvel().y)); b = Math.max(b, Math.abs(beta())); }
  const end = h.slice(-20).reduce((a, x) => a + x, 0) / 20;
  return { t90: h.findIndex((x) => x >= 0.9 * end) * FIXED, beta: b, g: end * car.speed / tuning.gravity };
};
// derrape con freno a la izquierda 0,9 s; luego gas y botón contrario hasta enderezar (se suelta al bajar de 5°)
const counter = ({ car, step, beta }) => {
  for (let i = 0; i < 54; i++) step(1, 0, 1);
  const b0 = Math.abs(beta()), s0 = Math.sign(beta()); let t = null, over = 0, done = false;
  if (b0 < 8 || car.fwdSpeed < 8) return null; // sin derrape claro (o casi parado): no vale
  for (let i = 0; i < 120; i++) {
    const b = beta() * s0;
    if (!done && b < 5) { done = true; t = i * FIXED; }
    step(done ? 0 : -1);
    if (done) over = Math.max(over, -beta() * s0);
  }
  return { b0, t, over };
};
// eslalon: izquierda/derecha cada 0,5 s durante 4 s → cruzada máxima
const slalom = ({ step, beta }) => { let b = 0; for (let i = 0; i < 240; i++) { step(Math.floor(i / 30) % 2 ? -1 : 1); b = Math.max(b, Math.abs(beta())); } return { beta: b }; };

const f = (x, d = 0) => (x == null ? '—' : x.toFixed(d));
for (const assist of process.env.ONLY ? [process.env.ONLY === '1'] : [false, true]) {
  console.log(`\n===== ${assist ? 'CON ayuda de giro' : 'SIN ayuda (botones de siempre)'} =====`);
  console.log('coche    vel | toque 80/150/300 ms → rumbo ° | mantener: 90 % en s · cruzada ° · g | contravolante: de ° en s, rebote ° | eslalon °');
  for (const id of cars) for (const v of SPEEDS) {
    const t = [80, 150, 300].map((ms) => sim(id, v, assist, tap(ms)));
    if (!t[0]) continue;
    const h = sim(id, v, assist, hold), c = sim(id, v, assist, counter), z = sim(id, v, assist, slalom);
    console.log(`${id.padEnd(8)} ${String(v).padStart(3)} | ${t.map((r) => f(r.turn, 1).padStart(5)).join(' ')} | ${f(h.t90, 2)} s · ${f(h.beta).padStart(2)}° · ${f(h.g, 1)}g | ${c ? `${f(c.b0).padStart(2)}° en ${f(c.t, 2)} s, rebote ${f(c.over).padStart(2)}°` : '—'} | ${f(z.beta).padStart(2)}°`);
  }
}
console.warn = w0;
