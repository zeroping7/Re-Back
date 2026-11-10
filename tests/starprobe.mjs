const fakeCtx = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx }), getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init();
const { Race, FIXED } = await import('../src/race.js');
const { trackById } = await import('../src/tracks/index.js');
const { carById } = await import('../src/cars.js');
const { tuning } = await import('../src/tuning.js');
const trackId = process.argv[2];
const sfx = { play() {}, update() {}, hit() {}, stopEngine() {} };
const hud = { message() {}, setupMinimap() {}, update() {} };
const controls = { read: () => ({ steer: 0, throttle: 0, brake: 0 }), consumeFire: () => false };
const race = new Race({ renderer: null, envMap: null, sfx, controls, hud, trackDef: trackById(trackId), carDef: carById(process.argv[3] || 'pulga'), laps: 3, rivals: 0, difficulty: 0.94, baseTuning: tuning, practice: true, star: { taken: false }, onStar: () => 500 });
race.autoPlayer = true;
race.star.got = true; // no recoger: medir las pasadas
const c = race.circuit, N = c.N, ramp = c.elev.find((e) => e.kind === 'ramp'), top = (ramp.i1 - 1 + N) % N;
const s = c.samples[(top + 2) % N];
console.log('width', c.width.toFixed(1), 'spacing', c.spacing.toFixed(2), 'top.y', c.samples[top].p.y.toFixed(2), 'radius at star', s.radius?.toFixed(1));
let t = 0, best = 1e9, rec = null, lastLap = 0;
while (t < 200) {
  race.update(FIXED); t += FIXED;
  const P = race.player.currPos, st = race.state(race.player);
  const d = P.distanceTo(race.star.pos);
  if (d < best) { best = d; const lat = (P.x - s.p.x) * s.n.x + (P.z - s.p.z) * s.n.z, along = (P.x - s.p.x) * s.t.x + (P.z - s.p.z) * s.t.z; rec = { d, lat, along, dy: P.y - race.star.pos.y, v: race.player.speed }; }
  if (st.laps > lastLap) { console.log('lap', st.laps, JSON.stringify(Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, +v.toFixed(2)])))); best = 1e9; lastLap = st.laps; }
  if (st.laps >= 3) break;
}
