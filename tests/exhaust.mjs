// COC-23: humo de escape de los coches nitro según las revoluciones.
//   node tests/exhaust.mjs
// 1) curva: a ralentí hay humo, baja con las vueltas y la fuerza sube; desde 1/3 no hay nada
// 2) ciclo: parado → acelera (humo se apaga) → suelta (vuelve el humo)
// 3) modelos: todos los nitro tienen ≥1 escape (Tanque, Yeti y Fórmula 2) y ningún eléctrico
// 4) carrera real: en el paso en que ningún nitro está por debajo de 1/3 no se emite humo
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const { RPM_IDLE, RPM_CUT, smokeAt, engineRpm } = await import('../src/exhaust.js');
const { Race, FIXED } = await import('../src/race.js');
const { Car } = await import('../src/car.js');
const { trackFromKey: trackById } = await import('../src/tracks/index.js');
const { CARS, carById } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');

let bad = 0;
const ok = (c, msg) => { if (!c) { console.log('✗', msg); bad++; } };

// 1) curva
const s0 = smokeAt(RPM_IDLE);
ok(s0 && s0.amount === 1 && s0.k === 0, 'ralentí: humo máximo');
let prev = s0;
for (let r = RPM_IDLE; r < RPM_CUT; r += 0.005) {
  const s = smokeAt(r);
  ok(s, `r=${r.toFixed(3)} debería haber humo`);
  if (s) { ok(s.amount <= prev.amount + 1e-9, `cantidad no baja en r=${r.toFixed(3)}`); ok(s.force >= prev.force - 1e-9, `fuerza no sube en r=${r.toFixed(3)}`); prev = s; }
}
ok(smokeAt(0.3329) && smokeAt(0.3329).amount < 0.01, 'justo antes de 1/3 casi nada de humo');
for (const r of [RPM_CUT, 0.34, 0.5, 1, 1.2]) ok(smokeAt(r) === null, `r=${r} no debe haber humo`);
ok(smokeAt(0.1).force > s0.force * 1.8, 'la fuerza sube bastante respecto al ralentí');
console.log(`curva: ralentí cantidad ${s0.amount.toFixed(2)} fuerza ${s0.force.toFixed(1)} · r=0.15 ${smokeAt(0.15).amount.toFixed(2)}/${smokeAt(0.15).force.toFixed(1)} · r=0.30 ${smokeAt(0.3).amount.toFixed(2)}/${smokeAt(0.3).force.toFixed(1)}`);

// 2) ciclo con un coche simulado
const fake = { throttle: 0, speed: 0, contacts: 4, t: { maxSpeed: 30 }, fx: { zap: 0 }, rpm: RPM_IDLE };
const step = (thr, spd, secs) => { fake.throttle = thr; fake.speed = spd; for (let i = 0; i < secs * 60; i++) engineRpm(fake, FIXED, 0); return fake.rpm; };
ok(step(0, 0, 1) < RPM_CUT, 'parado: por debajo de 1/3');
ok(smokeAt(fake.rpm) !== null, 'parado: sale humo');
ok(step(1, 20, 1.5) > RPM_CUT && smokeAt(fake.rpm) === null, 'a ritmo: sin humo');
ok(step(0, 4, 2) < RPM_CUT && smokeAt(fake.rpm) !== null, 'al soltar y frenar: vuelve el humo (ciclo)');
fake.fx.zap = 1; step(0, 0, 2);
ok(fake.rpm < 0.01, 'motor muerto por pulso: vueltas a 0'); fake.fx.zap = 0;

// 3) escapes en los modelos
const sim = new Race({ renderer: null, envMap: null, sfx: { play() {}, update() {}, hit() {}, stopEngine() {} }, controls: { read: () => ({ steer: 0, throttle: 0, brake: 0 }), consumeFire: () => false },
  hud: { message() {}, setupMinimap() {}, update() {} }, trackDef: trackById('salon'), carDef: carById('pulga'), laps: 1, rivals: 0, difficulty: 1, baseTuning: tuning, onFinish() {}, practice: true });
const want = { tanque: 2, yeti: 2, formula: 2 };
for (const def of CARS) {
  const car = new Car(sim.scene, sim.world, RAPIER, def, sim.player.t, {});
  const n = car.model.userData.exhausts.length;
  const nitro = def.motor === 'Nitro';
  ok(nitro ? n >= 1 : n === 0, `${def.id} (${def.motor}): ${n} escapes`);
  if (want[def.id]) ok(n === want[def.id], `${def.id} debe tener ${want[def.id]} escapes y tiene ${n}`);
  for (const e of car.model.userData.exhausts) ok(Math.abs(e.dir.length() - 1) < 1e-6 && Math.abs(e.pos.x) < 0.8 && Math.abs(e.pos.z) < 1.3, `${def.id}: boca fuera de la carrocería ${e.pos.toArray()}`);
  console.log(`  ${def.id.padEnd(8)} ${def.motor.padEnd(9)} escapes=${n}`);
}

// 4) carrera real: salida en parrilla (ralentí) y luego a ritmo de carrera
for (const carId of ['rally', 'tanque', 'formula']) {
  const race = new Race({ renderer: null, envMap: null, sfx: { play() {}, update() {}, hit() {}, stopEngine() {} }, controls: { read: () => ({ steer: 0, throttle: 0, brake: 0 }), consumeFire: () => false },
    hud: { message() {}, setupMinimap() {}, update() {} }, trackDef: trackById('salon'), carDef: carById(carId), laps: 3, rivals: 3, difficulty: 0.94, baseTuning: tuning, onFinish() {} });
  race.items.warm(true); race.items.warm(false); race.autoPlayer = true;
  const ex = race.effects.exhaust, nitro = race.cars.filter((c) => c.def.motor === 'Nitro');
  let gridPuffs = 0, racePuffs = 0, leaks = 0, belowSteps = 0, aboveSteps = 0, minRpm = 9, maxRpm = 0;
  for (let t = 0; t < 40; t += FIXED) {
    const before = ex.next, rpmBefore = nitro.map((c) => c.rpm);
    race.update(FIXED);
    const d = (ex.next - before + ex.max) % ex.max;
    const anyLow = nitro.some((c, i) => c.rpm < RPM_CUT || rpmBefore[i] < RPM_CUT);
    if (!race.started) gridPuffs += d; else racePuffs += d;
    if (!anyLow) { aboveSteps++; if (d > 0) leaks++; } else belowSteps++;
    for (const c of nitro) { minRpm = Math.min(minRpm, c.rpm); maxRpm = Math.max(maxRpm, c.rpm); }
  }
  console.log(`carrera ${carId}: nitro en parrilla=${nitro.length}, bocanadas en la salida=${gridPuffs}, en carrera=${racePuffs}, pasos sin ningún nitro bajo 1/3=${aboveSteps} (fugas ${leaks}), rpm ${minRpm.toFixed(2)}…${maxRpm.toFixed(2)}`);
  ok(nitro.some((c) => c.def.id === carId), `${carId} es nitro`);
  ok(gridPuffs > 30, `${carId}: debe salir humo a ralentí en la parrilla (${gridPuffs})`);
  ok(leaks === 0, `${carId}: ${leaks} pasos con humo cuando todos los nitro estaban por encima de 1/3`);
  ok(maxRpm > RPM_CUT, `${carId}: las vueltas deben superar 1/3 durante la carrera`);
}

console.log(bad ? `\n${bad} FALLOS` : '\nOK');
process.exit(bad ? 1 : 0);
