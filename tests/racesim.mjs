// Carrera completa sin gráficos (Node): IA contra IA (jugador en automático). Mide vueltas, vuelcos, objetos.
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const { Race, FIXED } = await import('../src/race.js');
const { trackFromKey: trackById } = await import('../src/tracks/index.js');
const { carById } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const trackId = process.argv[2] || 'salon', rivals = +(process.argv[3] || 3), laps = +(process.argv[4] || 3);
const carId = process.argv[5] || "rayo";
const sfx = { play() {}, update() {}, hit() {}, stopEngine() {} };
const hud = { message: (m) => { if (process.env.V) console.log('  [msg]', m); }, setupMinimap() {}, update() {} };
const controls = { read: () => ({ steer: 0, throttle: 0, brake: 0 }), consumeFire: () => false };
let done = null;
const practice = !!process.env.STAR;
let starAt = null;
const race = new Race({ renderer: null, envMap: null, sfx, controls, hud, trackDef: trackById(trackId), carDef: carById(carId), laps, rivals, difficulty: +(process.env.DIFF || 0.94), baseTuning: tuning, onFinish: (r) => { done = r; },
  practice, star: practice ? { taken: false } : null, onStar: () => { starAt = race.time; return 500; } });
race.autoPlayer = true;
// el jugador usa objetos automáticamente
const used = {}; const origFire = race.items.fire.bind(race.items);
race.items.fire = (car) => { used[car.item] = (used[car.item] || 0) + 1; origFire(car); };
const respawns = new Map(); const origResp = race.respawn.bind(race);
race.respawn = (car) => { respawns.set(car.name, (respawns.get(car.name) || 0) + 1); const st = race.state(car); if (process.env.WHY) console.log(`   resp ${car.name} up=${car.up.y.toFixed(2)} upT=${car.upsideTime.toFixed(1)} off=${(st.offT||0).toFixed(1)} noProg=${(st.noProgT||0).toFixed(1)} y=${car.currPos.y.toFixed(1)} idx=${st.idx} frac=${(st.idx/race.circuit.N).toFixed(2)} lat=${(()=>{const sc=race.circuit.samples[st.idx];return Math.abs((car.currPos.x-sc.p.x)*sc.n.x+(car.currPos.z-sc.p.z)*sc.n.z).toFixed(1)})()} pos=${car.currPos.x.toFixed(0)},${car.currPos.z.toFixed(0)} spd=${car.speed.toFixed(0)}`); origResp(car); };
let t = 0;
const playerAI = race.playerAI;
while (t < 240) {
  const st = race.state(race.player);
  if (race.player.item && playerAI.shouldUse(race.player.item, race, st)) race.items.fire(race.player);
  race.update(FIXED);
  t += FIXED;
  if (practice && race.star) { const d = race.player.currPos.distanceTo(race.star.pos); if (d < (globalThis.minStar ?? 1e9)) { globalThis.minStar = d; globalThis.minStarY = race.player.currPos.y - race.star.pos.y; } }
  if (process.env.TRACE && Math.abs(t % 5) < FIXED) for (const c of race.cars) { const s = race.state(c); if (!s.finished) console.log(`   t=${t.toFixed(0)} ${c.name} p=${c.currPos.x.toFixed(1)},${c.currPos.y.toFixed(1)},${c.currPos.z.toFixed(1)} idx=${s.idx} prog=${s.progress} v=${c.speed.toFixed(1)} up=${c.up.y.toFixed(2)} stun=${c.fx.stun.toFixed(1)}`); }
  if (race.phase === 'done' && race.order.every((c) => race.state(c).finished)) break;
  if (practice && (starAt !== null || race.state(race.player).laps >= laps)) break;
}
if (practice) {
  const s = race.star, P = race.player;
  console.log('  dist mín a la estrella', globalThis.minStar?.toFixed(2), 'dy', globalThis.minStarY?.toFixed(2));
  console.log(trackId, carId, 'STAR', starAt !== null ? `cogida en t=${starAt.toFixed(1)}` : 'NO cogida', s ? `pos=${s.pos.x.toFixed(1)},${s.pos.y.toFixed(1)},${s.pos.z.toFixed(1)}` : 'sin estrella');
  process.exit(0);
}
const r = race.results();
console.log(trackId, `len=${race.circuit.length.toFixed(0)} t=${t.toFixed(1)}`);
for (const x of r) { const car = race.cars.find((c) => c.name === x.name); console.log(`  ${x.place}. ${x.name.padEnd(6)} fin=${x.finished} time=${x.time.toFixed(1)} best=${x.best.toFixed(2)} laps=${x.laps} resp=${respawns.get(x.name) || 0} hp=${car.health.toFixed(0)}`); }
console.log('  items used:', JSON.stringify(used));
