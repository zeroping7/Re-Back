import * as THREE from 'three';
import { carOnStand } from './showroom.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { CAMERA_RAY_GROUPS } from './tracks/common.js';

// ---------- Fantasma de Contrarreloj (UX-11) ----------
// Se guarda la mejor vuelta: posición y giro del coche a 30 Hz, cuantizados a 16 bits (base64 en el móvil).
export const GHOST_HZ = 30;
const PQ = 0.02; // precisión de posición (u)
const gkey = (k) => 'reback.ghost.' + k;

export function loadGhost(key) {
  try {
    const g = JSON.parse(localStorage.getItem(gkey(key)) || 'null');
    if (!g) return null;
    const bin = atob(g.data), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const q = new Int16Array(u8.buffer), f = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) f[i] = (i % 7) < 3 ? q[i] * PQ : q[i] / 32767;
    return { time: g.time, car: g.car, color: g.color, frames: f, n: f.length / 7 };
  } catch { return null; }
}

export function saveGhost(key, { time, car, color, frames }) {
  try {
    const q = new Int16Array(frames.length);
    for (let i = 0; i < frames.length; i++) q[i] = Math.max(-32767, Math.min(32767, Math.round((i % 7) < 3 ? frames[i] / PQ : frames[i] * 32767)));
    const u8 = new Uint8Array(q.buffer);
    let bin = '';
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    localStorage.setItem(gkey(key), JSON.stringify({ time, car, color, data: btoa(bin) }));
    return true;
  } catch { return false; }
}

// Modelo translúcido para el fantasma
export function ghostModel(def, color) {
  const inner = carOnStand(def, color);
  inner.position.set(0, 0, 0);
  const g = new THREE.Group();
  g.add(inner);
  const cache = new Map();
  g.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false; o.receiveShadow = false; o.renderOrder = 3;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    const out = ms.map((m) => {
      if (!cache.has(m)) {
        const c = new THREE.MeshStandardMaterial({ color: m.color ? m.color.clone().lerp(new THREE.Color('#9fd8ff'), 0.45) : '#9fd8ff', map: m.map || null,
          transparent: true, opacity: 0.36, depthWrite: false, roughness: 0.3, emissive: '#3a7bd5', emissiveIntensity: 0.35 });
        cache.set(m, c);
      }
      return cache.get(m);
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
  return g;
}

// Pone un modelo en el instante t de una grabación (frames: 7 valores por muestra)
const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion();
export function poseAt(obj, frames, n, t, hz = GHOST_HZ, stride = 7, off = 0) {
  const x = Math.max(0, Math.min(n - 1.001, t * hz)), i = Math.floor(x), k = x - i;
  const a = i * stride + off, b = (i + 1) * stride + off;
  obj.position.set(frames[a] + (frames[b] - frames[a]) * k, frames[a + 1] + (frames[b + 1] - frames[a + 1]) * k, frames[a + 2] + (frames[b + 2] - frames[a + 2]) * k);
  _q0.set(frames[a + 3], frames[a + 4], frames[a + 5], frames[a + 6]);
  _q1.set(frames[b + 3], frames[b + 4], frames[b + 5], frames[b + 6]);
  if (_q0.dot(_q1) < 0) _q1.set(-_q1.x, -_q1.y, -_q1.z, -_q1.w);
  obj.quaternion.slerpQuaternions(_q0, _q1, k);
}

// Entre dos muestras (repetición): fa/fb Float32Array, k 0..1, off = desplazamiento del objeto
export function poseLerp(obj, fa, fb, k, off) {
  obj.position.set(fa[off] + (fb[off] - fa[off]) * k, fa[off + 1] + (fb[off + 1] - fa[off + 1]) * k, fa[off + 2] + (fb[off + 2] - fa[off + 2]) * k);
  _q0.set(fa[off + 3], fa[off + 4], fa[off + 5], fa[off + 6]);
  _q1.set(fb[off + 3], fb[off + 4], fb[off + 5], fb[off + 6]);
  if (_q0.dot(_q1) < 0) _q1.set(-_q1.x, -_q1.y, -_q1.z, -_q1.w);
  obj.quaternion.slerpQuaternions(_q0, _q1, k);
}

// ---------- Repetición (UX-12) ----------
// Graba todos los coches y objetos sueltos a 30 Hz y las explosiones; luego lo reproduce con cámaras de TV.
export class ReplayRecorder {
  constructor(race) {
    this.race = race;
    this.stride = (race.cars.length + race.dynamics.length) * 7;
    this.frames = [];
    this.events = [];
    this.t = 0; this.on = true;
  }
  get now() { return this.frames.length / GHOST_HZ; }
  capture() {
    if (!this.on) return;
    const R = this.race, f = new Float32Array(this.stride);
    let o = 0;
    for (const c of R.cars) {
      const p = c.currPos, q = c.currQuat;
      f[o++] = p.x; f[o++] = p.y; f[o++] = p.z; f[o++] = q.x; f[o++] = q.y; f[o++] = q.z; f[o++] = q.w;
    }
    for (const d of R.dynamics) {
      const p = d.body.translation(), q = d.body.rotation();
      f[o++] = p.x; f[o++] = p.y; f[o++] = p.z; f[o++] = q.x; f[o++] = q.y; f[o++] = q.z; f[o++] = q.w;
    }
    this.frames.push(f);
    if (this.frames.length > GHOST_HZ * 60 * 6) this.on = false; // tope: 6 minutos
  }
  event(type, pos) { if (this.on) this.events.push({ t: this.now, type, pos: pos.clone() }); }
}

// Realizador: elige cámaras junto a la pista y corta entre ellas siguiendo al coche
export class Director {
  constructor(race) {
    this.race = race;
    const c = race.circuit, N = c.N, b = race.bounds, W = c.width;
    this.spots = [];
    const step = Math.max(6, Math.round(N / 16));
    for (let i = 0, k = 0; i < N; i += step, k++) {
      const s = c.samples[i], side = k % 2 ? 1 : -1, out = W / 2 + 3 + (k % 3);
      const p = s.p.clone().addScaledVector(s.n, side * out);
      p.y = s.p.y + 1.2 + (k % 4) * 0.9;
      p.x = THREE.MathUtils.clamp(p.x, -b.x + 1, b.x - 1); p.z = THREE.MathUtils.clamp(p.z, -b.z + 1, b.z - 1);
      this.spots.push({ i, p });
    }
    this.shot = null; this.shotT = 0; this.n = 0;
    this.ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
  }

  visible(from, to) {
    const d = to.clone().sub(from), l = d.length(); d.divideScalar(l);
    this.ray.origin = { x: from.x, y: from.y, z: from.z }; this.ray.dir = { x: d.x, y: d.y, z: d.z };
    const hit = this.race.world.castRay(this.ray, l - 1.5, true, undefined, CAMERA_RAY_GROUPS);
    return !hit;
  }

  // cámara de TV más cercana por delante del coche y con el coche a la vista
  pickTv(idx, p) {
    const N = this.race.circuit.N;
    let best = null, bd = Infinity;
    for (const sp of this.spots) {
      const ahead = (sp.i - idx + N) % N;
      if (ahead > N * 0.18 && ahead < N * 0.97) continue;
      const d = sp.p.distanceTo(p);
      if (d < 5 || d > 45) continue;
      const score = d + (ahead > N / 2 ? 25 : 0);
      if (score < bd && this.visible(sp.p, p.clone().setY(p.y + 0.5))) { bd = score; best = sp; }
    }
    return best;
  }

  update(dt, car, idx) {
    const cam = this.race.camera, p = car.model.position;
    this.shotT -= dt;
    const sh = this.shot;
    const lost = sh && sh.kind === 'tv' && (sh.p.distanceTo(p) > 48 || (this.n % 8 === 0 && !this.visible(sh.p, p.clone().setY(p.y + 0.5))));
    this.n++;
    if (!sh || this.shotT <= 0 || lost) {
      const r = Math.random(), prev = sh?.kind;
      let kind = r < 0.62 ? 'tv' : r < 0.78 ? 'chase' : r < 0.9 ? 'heli' : 'side';
      if (kind === prev && kind !== 'tv') kind = 'tv';
      let spot = null;
      if (kind === 'tv') { spot = this.pickTv(idx, p); if (!spot) kind = 'chase'; }
      this.shot = { kind, p: spot?.p.clone(), side: Math.random() < 0.5 ? 1 : -1, cut: true };
      this.shotT = kind === 'tv' ? 4 + Math.random() * 2 : 3 + Math.random() * 2;
    }
    const s = this.shot, f = new THREE.Vector3(0, 0, 1).applyQuaternion(car.model.quaternion).setY(0).normalize();
    const look = p.clone(); look.y += 0.4;
    let want, fov = 50;
    if (s.kind === 'tv') {
      want = s.p;
      const d = want.distanceTo(p);
      fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(3.2 / d)), 9, 55); // zoom: el coche siempre del mismo tamaño
    } else if (s.kind === 'chase') {
      want = p.clone().addScaledVector(f, -6.5); want.y = p.y + 1.6; look.addScaledVector(f, 4); fov = 58;
    } else if (s.kind === 'heli') {
      want = p.clone().addScaledVector(f, -10); want.y = p.y + 14; fov = 45;
    } else {
      const sd = new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(s.side * 5);
      want = p.clone().add(sd).addScaledVector(f, 1.5); want.y = p.y + 0.7; fov = 55;
    }
    if (s.cut || s.kind === 'tv') { cam.position.copy(want); s.cut = false; } else cam.position.lerp(want, 1 - Math.exp(-dt * 6));
    const b = this.race.bounds;
    cam.position.x = THREE.MathUtils.clamp(cam.position.x, -b.x, b.x); cam.position.z = THREE.MathUtils.clamp(cam.position.z, -b.z, b.z);
    cam.position.y = Math.min(cam.position.y, b.h);
    cam.lookAt(look);
    cam.fov += (fov - cam.fov) * (s.kind === 'tv' ? 1 - Math.exp(-dt * 8) : 1);
    if (Math.abs(cam.fov - fov) > 20) cam.fov = fov;
    cam.updateProjectionMatrix();
  }
}
