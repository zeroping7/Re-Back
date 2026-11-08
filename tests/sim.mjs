// Simulación sin gráficos: piloto automático da vueltas al circuito para medir el comportamiento.
const fakeCtx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }) };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const THREE = await import('three');
const RAPIER = (await import('@dimforge/rapier3d-compat')).default;
await RAPIER.init();
const { buildTrack } = await import('../src/track.js');
const { Car } = await import('../src/car.js');
const { tuning } = await import('../src/tuning.js');
const over = JSON.parse(process.argv[2] || '{}');
Object.assign(tuning, over);
const aggr = parseFloat(process.argv[3] || '1');

const scene = new THREE.Scene();
const world = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
world.timestep = 1 / 60;
const track = buildTrack(scene, world, RAPIER);
const car = new Car(scene, world, RAPIER, tuning);
car.reset(track.start.pos, track.start.yaw);
const S = track.samples, N = S.length;
let idx = 0, laps = 0, lapStart = 0, flips = 0, hits = 0, maxLat = 0, resets = 0, airs = 0, maxSpeed = 0;
let spins = 0, wasSpin = false; let progress = 0, stuck = 0, revUntil = 0, stucks = 0;
const nearest = (p) => { let b = idx, bd = 1e9; for (let k = -10; k < 25; k++) { const i = (idx + k + N) % N; const d = S[i].p.distanceToSquared(p); if (d < bd) { bd = d; b = i; } } return b; };
const T = 60 * 120;
for (let step = 0; step < T; step++) {
  const p = car.currPos;
  const ni = nearest(new THREE.Vector3(p.x, 0, p.z));
  let delta = ni - idx; if (delta < -N / 2) delta += N; if (delta > N / 2) delta -= N;
  progress += delta; idx = ni;
  if (progress >= N) { progress -= N; laps++; console.log(`lap ${laps}: ${((step - lapStart) / 60).toFixed(2)}s`); lapStart = step; }
  const look = Math.round(3 + car.speed * 0.25);
  const tgt = S[(idx + look) % N].p;
  const f = car.forward;
  const dx = tgt.x - p.x, dz = tgt.z - p.z;
  const ang = Math.atan2(f.z * dx - f.x * dz, f.x * dx + f.z * dz);
  let steer = THREE.MathUtils.clamp(ang * 2.5 * aggr, -1, 1);
  const far = S[(idx + look + 8) % N].p;
  const ang2 = Math.atan2(f.z * (far.x - p.x) - f.x * (far.z - p.z), f.x * (far.x - p.x) + f.z * (far.z - p.z));
  const brake = Math.abs(ang2) > 0.55 / aggr && car.speed > 20 ? 1 : 0;
  if (car.speed < 1.5) stuck++; else stuck = 0;
  if (stuck > 90) { revUntil = step + 50; stuck = 0; stucks++; }
  const input = step < revUntil ? { steer: -steer, throttle: 0, brake: 1 } : { steer, throttle: brake ? 0 : 1, brake };
  car.step(1 / 60, input);
  world.step();
  car.afterStep(1 / 60);
  if (process.env.TRACE && step % 6 === 0 && step < 60*40 && car.currPos.x < -28 && car.currPos.z > -8 && car.currPos.z < 22) console.log(`tr ${(step/60).toFixed(1)} p=${car.currPos.x.toFixed(1)},${car.currPos.y.toFixed(2)},${car.currPos.z.toFixed(1)} c=${car.contacts} v=${car.fwdSpeed.toFixed(1)} lat=${car.localVel.x.toFixed(1)} vy=${car.velocity.y.toFixed(1)} up=${car.up.y.toFixed(2)} st=${car.steer.toFixed(2)}`);
  maxLat = Math.max(maxLat, Math.abs(car.localVel.x));
  const spinning = car.speed > 8 && Math.abs(car.localVel.x) > Math.abs(car.localVel.z) && !car.drifting;
  if (spinning && !wasSpin) { spins++; if (spins < 12) console.log(`spin at ${car.currPos.x.toFixed(0)},${car.currPos.z.toFixed(0)} air=${car.airTime.toFixed(2)} contacts=${car.contacts} steer=${car.steer.toFixed(2)} brake=${input.brake}`); } wasSpin = spinning;
  maxSpeed = Math.max(maxSpeed, car.fwdSpeed);
  for (const e of car.events) { if (e.type === "hit") hits++; if (e.type === "land") { airs++; if (airs < 12) console.log(`land at ${e.pos.x.toFixed(0)},${e.pos.z.toFixed(0)} s=${e.strength.toFixed(2)}`); } }
  car.events.length = 0;
  if (car.upsideTime > 1.4 || car.currPos.y < -4) {
    resets++; if (resets < 6) console.log(`reset at ${car.currPos.x.toFixed(1)},${car.currPos.z.toFixed(1)} y=${car.currPos.y.toFixed(1)} up=${car.up.y.toFixed(2)} t=${(step/60).toFixed(1)}`); const s = S[idx]; car.reset(s.p, track.yawOf(s.t));
  }
  if (step % 600 === 0) console.log(`t=${step / 60}s idx=${idx} p=${car.currPos.x.toFixed(1)},${car.currPos.z.toFixed(1)} v=${car.fwdSpeed.toFixed(1)} lat=${car.localVel.x.toFixed(1)} y=${car.currPos.y.toFixed(2)} up=${car.up.y.toFixed(2)}`);
}
console.log(JSON.stringify({ spins, stucks, laps, resets, hits, airs, maxLat: +maxLat.toFixed(1), maxSpeed: +maxSpeed.toFixed(1), trackLen: +track.length.toFixed(0) }));
