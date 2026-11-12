// Batalla (UX-26): el jugador se queda quieto arriba (caja, silla, mesa) con la estrella; la IA debe subir y robársela
const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const THREE = await import('three');
const { Race, FIXED } = await import('../src/race.js');
const { ARENA } = await import('../src/battle.js');
const { carById } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const sfx = { play() {}, update() {}, hit() {}, stopEngine() {} };
const hud = { message() {}, setupMinimap() {}, update() {}, lookBack() {} };
const spots = [['caja', 0, 0, 3], ['silla', -15, 24, 4.5], ['mesa', -39, 21, 9], ['mesa (fondo)', -42, 30, 9]];
let fails = 0;
for (const [name, x, z, h] of spots) {
  const inp = { steer: 0, throttle: 0, brake: 0 };
  const controls = { read: () => inp, consumeFire: () => false, camStick: { x: 0, y: 0 } };
  const race = new Race({ renderer: null, envMap: null, sfx, controls, hud, battle: true, trackDef: ARENA, carDef: carById('pulga'), laps: 1, rivals: 3, difficulty: 0.94, baseTuning: tuning });
  const P = race.player, B = race.battleState, S = race.S;
  while (!race.started) race.update(FIXED);
  P.reset(new THREE.Vector3(x * S, h * S + 0.8, z * S), 0);
  B.timers.set(P, 999); B.holder = P; B.holdT = 0;
  let t = 0;
  for (let k = 0; t < 45 && B.holder === P; t += FIXED, k++) { race.update(FIXED); if (process.env.TRACE && k % 60 === 0) console.log(`  t=${t.toFixed(0)} ` + race.cars.filter((c) => c !== P).map((c) => { const d = race.ai.get(c); return `${c.name}(${(c.currPos.x / S).toFixed(0)},${(c.currPos.y / S).toFixed(1)},${(c.currPos.z / S).toFixed(0)} r${d.route ? d.route.i : "-"} v${c.speed.toFixed(0)})`; }).join(" ")); }
  const ok = B.holder !== P;
  if (!ok) fails++;
  const pos = race.cars.filter((c) => c !== P).map((c) => `${c.name}(${(c.currPos.x / S).toFixed(0)},${(c.currPos.y / S).toFixed(1)},${(c.currPos.z / S).toFixed(0)})`).join(' ');
  console.log(`${ok ? '✔' : '✘'} ${name}: ${ok ? `robada a los ${t.toFixed(1)} s por ${B.holder?.name ?? '(arma)'}` : 'nadie llega en 45 s'}  ${ok ? '' : pos}`);
}
process.exit(fails ? 1 : 0);
