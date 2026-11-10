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
const { DRIFT } = await import('../src/car.js');
if (process.env.DP) globalThis.__DP = { ...DRIFT, ...JSON.parse(process.env.DP) };
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
  { const p = car.body.translation(); if (Math.hypot(p.x, p.z) > 40) car.body.setTranslation({ x: p.x * -0.5, y: p.y, z: p.z * -0.5 }, true); } // sin paredes: lo devuelvo al centro
  if (car.up.y < 0.3) globalThis.flip = (globalThis.flip || 0) + 1;
  if (!race.started) continue;
  T0 ??= t; const u = t - T0;
  if (script === 'launch' || script === 'donut') {}
  else if (u < 2.2) input = { steer: 0, throttle: 1, brake: 0, human: true };
  else if (script === 'gas') input = { steer: 1, throttle: 1, brake: 0, human: true };
  if (u < 2.2 && script !== 'launch' && script !== 'donut') {} // primero, 2,2 s recto a fondo
  else if (script === 'donut') {
    input = { steer: 1, throttle: 1, brake: 0, human: true };
    const h = Math.atan2(car.forward.x, car.forward.z);
    if (globalThis.hp !== undefined) { let d = h - globalThis.hp; d = Math.atan2(Math.sin(d), Math.cos(d)); globalThis.turn = (globalThis.turn || 0) + d; }
    globalThis.hp = h;
    const p = car.currPos; globalThis.pts ??= []; if (u > 1.5) globalThis.pts.push([p.x, p.z]);
    if (u > 6) {
      const P = globalThis.pts, cx = P.reduce((a, q) => a + q[0], 0) / P.length, cz = P.reduce((a, q) => a + q[1], 0) / P.length;
      const r = P.reduce((a, q) => a + Math.hypot(q[0] - cx, q[1] - cz), 0) / P.length;
      console.log(`${carId} donut: ${(globalThis.turn / (Math.PI * 2)).toFixed(1)} vueltas en 6 s · radio del círculo ${r.toFixed(1)} · v=${car.speed.toFixed(1)} pts=${(st.score + st.combo * st.mult).toFixed(0)}${globalThis.flip ? ' VOLCADO' : ''}`);
      process.exit(0);
    }
  }
  else if (script === 'launch') { input = { steer: 0, throttle: 1, brake: 0, human: true }; globalThis.h0 ??= Math.atan2(car.forward.x, car.forward.z); { const d = (Math.atan2(car.forward.x, car.forward.z) - globalThis.h0) * 57.3; globalThis.hmin = Math.min(globalThis.hmin ?? 0, d); globalThis.hmax = Math.max(globalThis.hmax ?? 0, d); globalThis.bmax = Math.max(globalThis.bmax ?? 0, Math.abs(Math.atan2(car.localVel.x, Math.max(1, car.fwdSpeed)) * 57.3)); } for (const v of [10, 15, 20]) if (car.fwdSpeed >= v && !(globalThis['t' + v])) globalThis['t' + v] = u; if (u > 3) { console.log(`${carId} 0→10: ${globalThis.t10?.toFixed(2)} s · 0→15: ${globalThis.t15?.toFixed(2)} s · 0→20: ${globalThis.t20?.toFixed(2)} s · cola ${globalThis.hmin.toFixed(0)}º/${globalThis.hmax.toFixed(0)}º deriva máx ${globalThis.bmax.toFixed(0)}º`); process.exit(0); } }
  else if (script === 'spin') input = { steer: 1, throttle: 1, brake: u > 2.2 && u < 3.4 ? 1 : 0, human: true };
  else if (script === 'half') input = { steer: u < 2.8 ? 1 : 0.4, throttle: 1, brake: 0, human: true };
  else if (script === 'straight') input = { steer: u < 3.0 ? 1 : 0, throttle: 1, brake: 0, human: true };
  else if (script === 'flick') input = { steer: 1, throttle: 1, brake: u < 2.7 ? 1 : 0, human: true };
  else if (script === 'hold') input = { steer: u < 3.2 ? 1 : 0.35, throttle: 1, brake: u < 2.6 ? 1 : 0, human: true };
  else if (script === 'counter') { const b = Math.atan2(car.localVel.x, Math.max(1, car.fwdSpeed)); input = { steer: u < 2.7 ? 1 : Math.max(-1, Math.min(1, (b + 0.7) * 2.5)), throttle: 1, brake: 0, human: true }; }
  const beta = Math.atan2(car.localVel.x, Math.max(0.01, car.fwdSpeed)) * 57.3;
  if (process.env.V && Math.abs((u * 2) % 1) < FIXED * 2) console.log(`u=${u.toFixed(2)} v=${car.speed.toFixed(1)} fwd=${car.fwdSpeed.toFixed(1)} beta=${beta.toFixed(0)}º yaw=${car.body.angvel().y.toFixed(2)} combo=${st.combo.toFixed(0)}x${st.mult}`);
  if (u > 2.2 && u < 3.6) { globalThis.minV = Math.min(globalThis.minV ?? 99, car.speed); globalThis.maxB = Math.max(globalThis.maxB ?? 0, Math.abs(beta)); }
  if (u > 5) { const a = (globalThis.acc ??= { n: 0, v: 0, b: 0, y: 0, b2: 0 }); a.n++; a.v += car.speed; a.b += beta; a.y += car.body.angvel().y; a.b2 += beta * beta; }
  if (u > 8) break;
}
const a = globalThis.acc, mb = a.b / a.n;
console.log(`${script.padEnd(8)} entrada: vmín=${globalThis.minV.toFixed(1)} βmáx=${globalThis.maxB.toFixed(0)}º | estable: v=${(a.v / a.n).toFixed(1)} β=${mb.toFixed(0)}º±${Math.sqrt(Math.max(0, a.b2 / a.n - mb * mb)).toFixed(0)} giro=${(a.y / a.n).toFixed(2)} radio=${(a.v / Math.abs(a.y)).toFixed(1)} pts=${(st.score + st.combo * st.mult).toFixed(0)}${globalThis.flip ? ' VOLCADO' : ''}`);
