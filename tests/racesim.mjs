// Carrera completa sin gráficos (Node): IA contra IA (jugador en automático). Mide vueltas, vuelcos, objetos.
const fakeCtx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const { Race, FIXED } = await import('../src/race.js');
const { trackById } = await import('../src/tracks/index.js');
const { carById } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const trackId = process.argv[2] || 'salon', rivals = +(process.argv[3] || 3), laps = +(process.argv[4] || 3);
const carId = process.argv[5] || 'rayo';
const sfx = { play() {}, update() {}, hit() {}, stopEngine() {} };
const hud = { message: (m) => { if (process.env.V) console.log('  [msg]', m); }, setupMinimap() {}, update() {} };
const controls = { read: () => ({ steer: 0, throttle: 0, brake: 0 }), consumeFire: () => false };
let done = null;
const race = new Race({ renderer: null, envMap: null, sfx, controls, hud, trackDef: trackById(trackId), carDef: carById(carId), laps, rivals, difficulty: 0.94, baseTuning: tuning, onFinish: (r) => { done = r; } });
race.autoPlayer = true;
// el jugador usa objetos automáticamente
const used = {}; const origFire = race.items.fire.bind(race.items);
race.items.fire = (car) => { used[car.item] = (used[car.item] || 0) + 1; origFire(car); };
const respawns = new Map(); const origResp = race.respawn.bind(race);
race.respawn = (car) => { respawns.set(car.name, (respawns.get(car.name) || 0) + 1); origResp(car); };
let t = 0;
const playerAI = race.playerAI;
while (t < 240) {
  const st = race.state(race.player);
  if (race.player.item && playerAI.shouldUse(race.player.item, race, st)) race.items.fire(race.player);
  race.update(FIXED);
  t += FIXED;
  if (process.env.TRACE && Math.abs(t % 5) < FIXED) for (const c of race.cars) { const s = race.state(c); if (!s.finished) console.log(`   t=${t.toFixed(0)} ${c.name} p=${c.currPos.x.toFixed(1)},${c.currPos.y.toFixed(1)},${c.currPos.z.toFixed(1)} idx=${s.idx} prog=${s.progress} v=${c.speed.toFixed(1)} up=${c.up.y.toFixed(2)} stun=${c.fx.stun.toFixed(1)}`); }
  if (race.phase === 'done' && race.order.every((c) => race.state(c).finished)) break;
}
const r = race.results();
console.log(trackId, `len=${race.circuit.length.toFixed(0)} t=${t.toFixed(1)}`);
for (const x of r) console.log(`  ${x.place}. ${x.name.padEnd(6)} fin=${x.finished} time=${x.time.toFixed(1)} best=${x.best.toFixed(2)} laps=${x.laps} resp=${respawns.get(x.name) || 0}`);
console.log('  items used:', JSON.stringify(used));
