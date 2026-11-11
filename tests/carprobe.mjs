// Sonda de rendimiento: aceleración, velocidad punta, frenada y giro de cada coche en Carrera y Drift, sin bordes.
//   node tests/carprobe.mjs [race|drift] [coche,coche,...]        → tabla y JSON en /tmp/carprobe-<disc>.json
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const { Race, FIXED } = await import('../src/race.js');
const { trackFromKey } = await import('../src/tracks/index.js');
const { CARS, carById } = await import('../src/cars.js');
const { carAllowed } = await import('../src/disciplines.js');
const { tuning } = await import('../src/tuning.js');
const { carTuning } = await import('../src/cars.js');
const fs = await import('fs');
const { carStats } = await import('../src/carstats.js');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const disc = args[0] || 'race';
const only = args[1] ? args[1].split(',') : null;
const WRITE = process.argv.includes('--write'), CHECK = process.argv.includes('--check');
const UP = Object.fromEntries((process.env.UP || '').split(',').filter(Boolean).map((x) => x.split(':')).map(([k, v]) => [k, +v])); // p. ej. UP=motor:3,punta:3
const trackId = 'cocina'; // sala plana y sin objetos; en Carrera se fuerza la física normal (no la de drift)
const sfx = { play() {}, update() {}, hit() {}, stopEngine() {} };
const hud = { message() {}, setupMinimap() {}, update() {} };

function run(carId, scenario) {
  let input = { steer: 0, throttle: 0, brake: 0, human: true };
  const race = new Race({ renderer: null, envMap: null, sfx, controls: { read: () => input, consumeFire: () => false }, hud, trackDef: trackFromKey(trackId), carDef: carById(carId), laps: 9, rivals: 0, baseTuning: tuning, carUpgrades: UP });
  const car = race.player;
  car.collider.setCollisionGroups((0x0004 << 16) | 0x0001); // sin bordes
  race.respawn = () => {};
  if (disc === 'race') { car.driftMode = false; car.t = carTuning(tuning, carById(carId), 1, UP); }
  let t = 0, T0 = null, dist = 0, flips = 0;
  const out = { id: carId, t5: null, t10: null, t15: null, t20: null };
  const A = []; // muestras de la ventana de medida
  let bt = null, bd = 0, bv0 = 0;
  const dur = scenario === 'launch' ? 13 : scenario === 'brake' ? 20 : 15;
  let st0 = null;
  while (t < dur + 3) {
    race.update(FIXED); t += FIXED;
    { const p = car.body.translation(); if (Math.hypot(p.x, p.z) > 40) car.body.setTranslation({ x: p.x * -0.5, y: p.y, z: p.z * -0.5 }, true); }
    if (car.up.y < 0.3) flips++;
    if (!race.started) continue;
    T0 ??= t; const u = t - T0, v = car.speed, fwd = car.fwdSpeed;
    if (scenario === 'launch') {
      input = { steer: 0, throttle: 1, brake: 0, human: true };
      for (const k of [5, 10, 15, 20]) if (out['t' + k] === null && fwd >= k) out['t' + k] = +u.toFixed(2);
      if (process.env.V && Math.abs(u * 2 - Math.round(u * 2)) < FIXED * 2) console.log(`  ${carId} u=${u.toFixed(1)} v=${v.toFixed(1)} fwd=${fwd.toFixed(1)} up=${car.up.y.toFixed(2)} y=${car.currPos.y.toFixed(2)}`);
      if (u > 11) A.push(v);
      if (u > 12) break;
    } else if (scenario === 'brake') {
      if (u < 9) { input = { steer: 0, throttle: 1, brake: 0, human: true }; bv0 = v; }
      else { input = { steer: 0, throttle: 0, brake: 1, human: true }; if (bt === null) bt = u; bd += v * FIXED; if (v < 0.5) { out.brakeDist = +bd.toFixed(1); out.brakeT = +(u - bt).toFixed(2); out.vBrake = +bv0.toFixed(1); break; } }
    } else if (scenario === 'step') { // respuesta del volante: a 14 u/s se suelta el gas y se gira 0,6; guiñada 0,4 s después
      if (st0 === null && fwd < 14) input = { steer: 0, throttle: 1, brake: 0, human: true };
      else { st0 ??= u; input = { steer: 0.6, throttle: 0, brake: 0, human: true }; if (u - st0 > 0.4) { out.yaw04 = +Math.abs(car.body.angvel().y).toFixed(2); out.vStep = +car.speed.toFixed(1); break; } }
    } else { // giro: 5 s recto a fondo y luego volante a tope (o medio) con gas
      const st = scenario === 'turn' ? 1 : 0.5;
      input = { steer: u < 5 ? 0 : st, throttle: 1, brake: 0, human: true };
      if (u > 5) out.vPre ??= +car.speed.toFixed(1);
      if (u > 9) { const yaw = car.body.angvel().y; A.push([v, Math.abs(yaw), Math.abs(Math.atan2(car.localVel.x, Math.max(1, fwd))) * 57.3]); }
      if (u > 11) break;
    }
  }
  out.flips = flips;
  if (scenario === 'launch') out.vmax = +(A.reduce((a, b) => a + b, 0) / (A.length || 1)).toFixed(1);
  if (scenario.startsWith('turn')) {
    const n = A.length || 1, v = A.reduce((a, b) => a + b[0], 0) / n, y = A.reduce((a, b) => a + b[1], 0) / n, b = A.reduce((a, c) => a + c[2], 0) / n;
    out.v = +v.toFixed(1); out.yaw = +y.toFixed(2); out.radius = +(v / Math.max(y, 0.01)).toFixed(1); out.lat = +(v * y).toFixed(1); out.beta = +b.toFixed(0);
  }
  return out;
}

const cars = CARS.filter((c) => carAllowed(c, disc) && (!only || only.includes(c.id)));
const res = [], perf = {};
const f = (n) => String(n).padStart(5);
for (const c of cars) {
  const r = { id: c.id, mass: c.mass, mods: c.mods };
  r.launch = run(c.id, 'launch'); r.brake = run(c.id, 'brake'); r.turn = run(c.id, 'turn'); r.turnHalf = run(c.id, 'turnHalf'); r.step = run(c.id, 'step');
  res.push(r);
  perf[c.id] = { vmax: +r.launch.vmax.toFixed(1), t15: +r.launch.t15.toFixed(2), a50: +r.turnHalf.lat.toFixed(1), yaw: +r.step.yaw04.toFixed(2) };
  const m = perf[c.id], st = carStats({ id: c.id, stats: c.stats }, disc); // (con los datos ya guardados)
  console.log(`${c.id.padEnd(8)} punta ${f(m.vmax)} · 0→15 ${f(m.t15)} s · giro50% a=${f(m.a50)} · volante ${f(m.yaw)} rad/s | medidor guardado V${st.vel.toFixed(1)} A${st.acel.toFixed(1)} M${st.manejo.toFixed(1)}${r.launch.flips + r.turn.flips ? ' VOLCADO' : ''}`);
}
fs.writeFileSync(`/tmp/carprobe-${disc}.json`, JSON.stringify(res, null, 1));
const perfFile = new URL('../src/carperf.js', import.meta.url);
if (WRITE) {
  const cur = (await import('../src/carperf.js?w=' + Date.now())).default;
  const next = { race: { ...cur.race }, drift: { ...cur.drift } };
  next[disc] = { ...(only ? next[disc] : {}), ...perf };
  fs.writeFileSync(perfFile, `// Generado por: node tests/carprobe.mjs <race|drift> --write   (no editar a mano)\nexport default ${JSON.stringify(next, null, 2)};\n`);
  console.log('escrito src/carperf.js');
}
if (CHECK) { // los medidores guardados deben coincidir (±3 %) con lo que mide la física ahora
  let bad = 0;
  for (const [id, m] of Object.entries(perf)) {
    const g = (await import('../src/carperf.js')).default[disc]?.[id];
    if (!g) { console.log('✗', id, 'sin medidas guardadas'); bad++; continue; }
    for (const k of Object.keys(m)) if (Math.abs(m[k] - g[k]) > 0.03 * Math.abs(g[k]) + 0.02) { console.log('✗', id, k, 'guardado', g[k], 'medido', m[k]); bad++; }
  }
  console.log(bad ? `✗ ${bad} desajustes: ejecuta con --write` : `✓ medidores de ${disc} al día`);
  process.exit(bad ? 1 : 0);
}
process.exit(0);
