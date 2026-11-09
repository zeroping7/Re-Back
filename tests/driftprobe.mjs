// Sonda de derrape: coche solo con mandos guionizados; enseña velocidad, ángulo de deriva y giro.
// Uso: node tests/driftprobe.mjs <circuito> <coche> <guion: gas|flick|hold>
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const { Race, FIXED } = await import('../src/race.js');
const { trackFromKey } = await import('../src/tracks/index.js');
const { carById } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const [trackId = 'cocina', carId = 'patin', script = 'gas'] = process.argv.slice(2);
if (process.env.DP) globalThis.__DP = { wMax: 1.3, yawGain: 6, align: 2.6, spin: 0.95, spinK: 6, latGrip: 0.15, thrust: 36, vmax: 0.85, ...JSON.parse(process.env.DP) };
const sfx = { play() {}, update() {}, hit() {}, stopEngine() {} };
const hud = { message() {}, setupMinimap() {}, update() {} };
let input = { steer: 0, throttle: 0, brake: 0, human: true };
const race = new Race({ renderer: null, envMap: null, sfx, controls: { read: () => input, consumeFire: () => false }, hud, trackDef: trackFromKey(trackId), carDef: carById(carId), laps: 9, rivals: 0, baseTuning: tuning });
const car = race.player, st = race.state(car);
car.collider.setCollisionGroups((0x0004 << 16) | 0x0001); // sin bordes: pista libre para medir
race.respawn = () => {};
// lo saco al centro de la sala, lejos de bordes
let t = 0, T0 = null;
while (t < 16) {
  race.update(FIXED); t += FIXED;
  if (!race.started) continue;
  T0 ??= t; const u = t - T0;
  if (u < 2.2) input = { steer: 0, throttle: 1, brake: 0, human: true };
  else if (script === 'gas') input = { steer: 1, throttle: 1, brake: 0, human: true };
  else if (script === 'half') input = { steer: u < 2.8 ? 1 : 0.4, throttle: 1, brake: 0, human: true };
  else if (script === 'straight') input = { steer: u < 3.0 ? 1 : 0, throttle: 1, brake: 0, human: true };
  else if (script === 'flick') input = { steer: 1, throttle: 1, brake: u < 2.7 ? 1 : 0, human: true };
  else if (script === 'hold') input = { steer: u < 3.2 ? 1 : 0.35, throttle: 1, brake: u < 2.6 ? 1 : 0, human: true };
  else if (script === 'counter') { const b = Math.atan2(car.localVel.x, Math.max(1, car.fwdSpeed)); input = { steer: u < 2.8 ? 1 : Math.max(-1, Math.min(1, 0.5 - b * 1.6)), throttle: 1, brake: u < 2.6 ? 1 : 0, human: true }; }
  const beta = Math.atan2(car.localVel.x, Math.max(0.01, car.fwdSpeed)) * 57.3;
  if (process.env.V && Math.abs((u * 2) % 1) < FIXED * 2) console.log(`u=${u.toFixed(2)} v=${car.speed.toFixed(1)} fwd=${car.fwdSpeed.toFixed(1)} beta=${beta.toFixed(0)}º yaw=${car.body.angvel().y.toFixed(2)} combo=${st.combo.toFixed(0)}x${st.mult}`);
  if (u > 2.2 && u < 3.6) { globalThis.minV = Math.min(globalThis.minV ?? 99, car.speed); globalThis.maxB = Math.max(globalThis.maxB ?? 0, Math.abs(beta)); }
  if (u > 5) { const a = (globalThis.acc ??= { n: 0, v: 0, b: 0, y: 0, b2: 0 }); a.n++; a.v += car.speed; a.b += beta; a.y += car.body.angvel().y; a.b2 += beta * beta; }
  if (u > 8) break;
}
const a = globalThis.acc, mb = a.b / a.n;
console.log(`${script.padEnd(8)} entrada: vmín=${globalThis.minV.toFixed(1)} βmáx=${globalThis.maxB.toFixed(0)}º | estable: v=${(a.v / a.n).toFixed(1)} β=${mb.toFixed(0)}º±${Math.sqrt(Math.max(0, a.b2 / a.n - mb * mb)).toFixed(0)} giro=${(a.y / a.n).toFixed(2)} radio=${(a.v / Math.abs(a.y)).toFixed(1)} pts=${(st.score + st.combo * st.mult).toFixed(0)}`);
