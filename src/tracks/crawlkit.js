import * as THREE from 'three';
import { mat } from './common.js';

// Piezas del parque de crawlers (CRW-02). Todo en unidades de diseño; cada pieza se coloca sobre el trazado
// en un tramo recto: along = distancia a lo largo, lat = desplazamiento lateral.
export function crawlKit(B, circuit) {
  const W = circuit.width, samples = circuit.samples, N = circuit.N;
  const hazards = [];
  const used = [];
  const avoid = () => [...circuit.elev.map((e) => [e.i0, e.i1]), [N - 10, 10], ...used];
  const WOOD = ['#a1744a', '#8d6238', '#b5885a'], LOG = ['#7a5230', '#6b4527', '#8a5f3a'];

  function frame(frac, len) {
    const i = circuit.straightest(frac - 0.03, frac + 0.03, 3, len + 3, avoid());
    used.push([i - 2, i + len + 3]);
    const s = samples[((i % N) + N) % N];
    const t = s.t.clone(), n = s.n.clone(), c = s.p.clone();
    const yaw = Math.atan2(t.x, t.z);
    const pos = (along, lat = 0) => c.clone().addScaledVector(t, along).addScaledVector(n, lat);
    return { i, c, t, n, yaw, pos, len: len * circuit.spacing };
  }
  // caja alineada con la pista, centrada en (along, lat), con su cara superior a altura top
  function slab(f, along, lat, w, h, d, top, color, { pitch = 0 } = {}) {
    const p = f.pos(along, lat);
    return B.box(w, h, d, p.x, top - h / 2, p.z, color, { rot: [pitch, f.yaw, 0], phys: { friction: 1.2, restitution: 0.05 } });
  }
  function log(f, along, lat, r, len, top, { pitch = 0, color = LOG[0], axis = 'along' } = {}) {
    const p = f.pos(along, lat);
    if (axis === 'along') return B.cyl(r, r, len, p.x, top - r, p.z, color, { seg: 8, rot: [pitch - Math.PI / 2, f.yaw, 0], phys: { friction: 1.2, restitution: 0.05 } });
    return B.cyl(r, r, len, p.x, top - r, p.z, color, { seg: 8, rot: [0, f.yaw, Math.PI / 2], phys: { friction: 1.2, restitution: 0.05 } });
  }
  const pick = (a, k) => a[k % a.length];

  // Escalones de madera: subir n peldaños, meseta, bajar n peldaños
  function steps(frac, { n = 3, rise = 0.15, tread = 1.6, top = 4, width = 0.8 } = {}) {
    const f = frame(frac, Math.ceil((2 * n * tread + top) / circuit.spacing) + 2);
    let a = 1;
    for (let k = 1; k <= n; k++) { slab(f, a + tread / 2, 0, W * width, rise * k, tread, rise * k, pick(WOOD, k)); a += tread; }
    slab(f, a + top / 2, 0, W * width, rise * n, top, rise * n, pick(WOOD, 7)); a += top;
    for (let k = n; k >= 1; k--) { slab(f, a + tread / 2, 0, W * width, rise * k, tread, rise * k, pick(WOOD, k + 1)); a += tread; }
    return f;
  }

  // Puente de troncos: dos raíles (rampa, plano, rampa) sobre los que van las ruedas
  function logBridge(frac, { h = 0.55, ramp = 5, flat = 6, gauge = 0.78, r = 0.3 } = {}) {
    const f = frame(frac, Math.ceil((2 * ramp + flat) / circuit.spacing) + 2);
    const pitch = -Math.atan2(h, ramp);
    const L = Math.hypot(h, ramp) + 0.4;
    for (const sd of [-1, 1]) {
      const lat = sd * gauge / 2;
      log(f, 1 + ramp / 2, lat, r, L, h / 2 + r * 0 + 0.0, { pitch, color: pick(LOG, sd + 2) });
      log(f, 1 + ramp + flat / 2, lat, r, flat + 0.3, h, { color: pick(LOG, sd + 3) });
      log(f, 1 + ramp + flat + ramp / 2, lat, r, L, h / 2, { pitch: -pitch, color: pick(LOG, sd + 4) });
    }
    // travesaños para que parezca un puente
    for (let k = 0; k < 4; k++) log(f, 1 + ramp + 0.5 + k * (flat - 1) / 3, 0, 0.14, gauge + 0.9, h - 0.3, { axis: 'across', color: pick(WOOD, k) });
    hazards.push({ pos: f.pos(1 + ramp + flat / 2).clone(), r: 0, slow: 0, lat: 0 });
    return f;
  }

  // Pasarela estrecha y elevada sin barandilla
  function walkway(frac, { h = 0.5, len = 7, wide = 1.15, ramp = 3 } = {}) {
    const f = frame(frac, Math.ceil((len + 2 * ramp) / circuit.spacing) + 2);
    const pitch = -Math.atan2(h, ramp), L = Math.hypot(h, ramp) + 0.2;
    slab(f, 1 + ramp / 2, 0, wide, 0.12, L, h / 2 + 0.06, WOOD[0], { pitch });
    slab(f, 1 + ramp + len / 2, 0, wide, 0.14, len, h, WOOD[1]);
    slab(f, 1 + ramp + len + ramp / 2, 0, wide, 0.12, L, h / 2 + 0.06, WOOD[2], { pitch: -pitch });
    for (let k = 0; k <= 4; k++) slab(f, 1 + ramp + k * len / 4, 0, wide + 0.3, 0.1, 0.3, h - 0.14, pick(WOOD, k + 2));
    return f;
  }

  return { steps, logBridge, walkway, hazards, zones: [], step: () => {}, update: () => {} };
}
