import * as THREE from 'three';
import { rockTextures } from './diorama.js';
import { mat, trackPatch, bannerTexture } from './common.js';
import { mulberry } from './kit.js';
import { groundTex, surfaceTex } from '../textures.js';

// Piezas del parque de crawlers (CRW-02, CRW-10). Todo en unidades de diseño (el mundo es ×2).
// Cada pieza se coloca sobre un tramo RECTO del camino por su posición (x, z) y ocupa TODO el ancho:
// no hay forma de esquivarla. Cada una registra su puerta numerada (CRW-11), los puntos de reaparición,
// los fosos (caída desde puentes) y los avisos para la IA (frenar y, en los estrechos, ir por el centro).
const WOOD = ['#a1744a', '#8d6238', '#b5885a', '#9b6c43'];
const LOG = ['#7a5230', '#6b4527', '#8a5f3a', '#74492a'];
export const ROCK = ['#80858d', '#6b7079', '#8e9299', '#60646d', '#8a8176'];
const PHYS = { friction: 1.3, restitution: 0.04 };
const RIDE = 0.9;
// Parámetros (diseño) y longitudes de cada obstáculo: el circuito los usa para colocarlos casi seguidos (CRW-13)
const P = {
  steps: { n: 24, rise: 0.1334, tread: 0.5, top: 2.4 },
  logs: { n: 50, extra: 52 },
  ramp: { up: 7.5, deck: 3.6, h: 2.6, logs: 70 },
  sand: { mounds: 48 },
  ford: { rocks: 76, depth: 0.44, bank: 0.52 },
  climb: { rocks: 64 },
  garden: { rocks: 100 },
  tib: { ramp: 6.5, deck: 12, h: 2.2, w: 0.95 },
};
export const LEN = {
  steps: 2 * P.steps.n * P.steps.tread + P.steps.top, logs: 18, ramp: P.ramp.up * 2 + P.ramp.deck, bridge: 4 * 2 + 6.5 + 1,
  sand: 26, ford: 16, climb: 17, garden: 16, tib: P.tib.ramp * 2 + P.tib.deck + 1,
}; // altura aproximada del centro del coche sobre el suelo (mundo)

export function crawlKit(B0, circuit) {
  let B = B0, flat = null; // flat: obstáculo que se está construyendo inclinado (CRW-18)
  const SC = B.S, MX = B.MX;
  const W = circuit.width, sp = circuit.spacing, samples = circuit.samples;
  const gates = [], safe = [], pits = [], hazards = [], zones = [], visuals = [];
  const rnd = mulberry(77);
  const world = (v) => new THREE.Vector3(v.x * SC * MX, 0, v.z * SC);
  const pl = groundTex('plank', [2, 1]);
  const plankMat = new THREE.MeshStandardMaterial({ map: pl.map, normalMap: pl.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.85, color: '#cfa77d' });

  // Tramo del camino centrado en (x, z) de longitud L: pos(a, lat) = punto a metros a lo largo y lat al lado
  function frame(x, z, L, name, { entry = 2, exit = 2 } = {}) {
    const c = circuit.sampleNear(x, z).i, s = samples[c];
    const t = s.t.clone(), n = s.n.clone(), half = Math.ceil(L / 2 / sp);
    const f = { i: c, t, n, yaw: Math.atan2(t.x, t.z), L, y0: s.h, i0: c - half, i1: c + half, c: s.p.clone(),
      idx: (a) => c + Math.round(a / sp),
      pos: (a, lat = 0) => s.p.clone().addScaledVector(t, a).addScaledVector(n, lat) };
    if (tiltNext) { // CRW-18: en la cuesta, la pieza se construye plana y se gira entera para apoyarla sobre la pendiente
      const ang = Math.atan2(groundAt(f, L / 2) - groundAt(f, -L / 2), L);
      if (Math.abs(ang) > 0.01) { B = tiltBuilder(B0, new THREE.Vector3(f.c.x, f.y0, f.c.z), t.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(), ang); flat = f; f.tilt = ang; }
    }
    const ig = f.i0 - entry, ie = f.i1 + exit;
    gates.push({ i: ig, name });
    safe.push(ig, ie);
    return f;
  }
  // La IA frena en el obstáculo y, si es estrecho (hold), va por el centro
  function narrow(f, slow, hold = false) {
    for (let a = -f.L / 2 - 4; a <= f.L / 2 + 1; a += 4.5) hazards.push({ pos: world(f.pos(a)), r: 0, slow, hold: hold ? 9 : 0 });
  }
  // Foso bajo una plataforma: si el coche está por debajo, se ha caído (top = altura de la plataforma, diseño)
  function pit(f, a0, a1, top) { pits.push(f.tilt ? { i0: f.idx(a0 * Math.cos(f.tilt)), i1: f.idx(a1 * Math.cos(f.tilt)), top: top * SC + 0.2 } : { i0: f.idx(a0), i1: f.idx(a1), y: (f.y0 + top) * SC + 0.2 }); }

  // Losa cuya cara SUPERIOR va de (a0, h0) a (a1, h1)
  function surf(f, a0, h0, a1, h1, { lat = 0, w = W * 0.94, th = 0.22, material = plankMat, solid = true } = {}) {
    const dh = h1 - h0, da = a1 - a0, ang = Math.atan2(dh, da), len = Math.hypot(da, dh) + 0.08;
    const p = f.pos((a0 + a1) / 2 + Math.sin(ang) * th / 2, lat);
    return B.box(w, th, len, p.x, f.y0 + (h0 + h1) / 2 - Math.cos(ang) * th / 2, p.z, material, { rot: [-ang, f.yaw, 0], solid, phys: PHYS });
  }
  // Viga invisible de cima plana (colisión) bajo la cara superior de un tronco: las ruedas no resbalan por el lomo redondo
  function beam(f, a0, h0, a1, h1, lat, w, th = 0.3) {
    const dh = h1 - h0, da = a1 - a0, ang = Math.atan2(dh, da), len = Math.hypot(da, dh) + 0.3;
    const p = f.pos((a0 + a1) / 2 + Math.sin(ang) * th / 2, lat), y = f.y0 + (h0 + h1) / 2 - Math.cos(ang) * th / 2;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-ang, f.yaw, 0, 'YXZ'));
    B.collider(B.RAPIER.ColliderDesc.cuboid(w / 2, th / 2, len / 2), { x: p.x, y, z: p.z }, q, PHYS);
  }
  // Tronco cuya parte SUPERIOR va de (a0, h0) a (a1, h1)
  function logAlong(f, a0, h0, a1, h1, lat, r, color, solid = true) {
    const dh = h1 - h0, da = a1 - a0, ang = Math.atan2(dh, da), len = Math.hypot(da, dh) + 0.3;
    const p = f.pos((a0 + a1) / 2 + Math.sin(ang) * r, lat);
    return B.cyl(r, r, len, p.x, f.y0 + (h0 + h1) / 2 - Math.cos(ang) * r, p.z, color, { seg: 8, rot: [Math.PI / 2 - ang, f.yaw, 0], solid, phys: PHYS });
  }
  // Tronco atravesado, con el centro a altura y
  function logAcross(f, a, y, lat, r, len, color, { solid = true, yawJ = 0 } = {}) {
    const p = f.pos(a, lat);
    return B.cyl(r, r, len, p.x, f.y0 + y, p.z, color, { seg: 8, rot: [0, f.yaw + yawJ, Math.PI / 2], solid, phys: PHYS });
  }
  const post = (f, a, lat, h, r, color, y0 = 0) => { const p = f.pos(a, lat); return B.cyl(r, r, h, p.x, f.y0 + y0 + h / 2, p.z, color, { seg: 6, solid: false }); };

  // Suelo (diseño) en el tramo f a la distancia a; sigue la colina de la cuesta
  const hAt = (i) => samples[((i % circuit.N) + circuit.N) % circuit.N].h;
  // altura del suelo interpolada entre muestras (en cuestas empinadas redondear deja rocas medio enterradas o colgando)
  const groundAt = (f, a) => { const u = f.i + a / sp, i = Math.floor(u), t = u - i; return hAt(i) * (1 - t) + hAt(i + 1) * t; };
  const slopeAt = (f, a) => (groundAt(f, a + 0.4) - groundAt(f, a - 0.4)) / 0.8;
  const SAND = ['#d9bd84', '#cfae72', '#e3c88f', '#c8a766'];

  // Roca suelta de forma variada (bola facetada, losa inclinada o tocón de cinco-ocho lados); `e` = cuánto sobresale del suelo
  // CRW-23: las rocas sueltas llevan textura de granito (un material por color)
  const rockMats = new Map(), white = new THREE.Color('#ffffff');
  const rockMat = (color) => {
    if (typeof color !== 'string') return color;
    if (!rockMats.has(color)) { const t = rockTextures(); rockMats.set(color, new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.1, 1.1), color: new THREE.Color(color).lerp(white, 0.4), roughness: 0.92, flatShading: true })); }
    return rockMats.get(color);
  };
  function rock(f, a, lat, r, e, color, kind = (rnd() * 3) | 0) {
    color = rockMat(color);
    if (kind) e *= 0.72; // las losas y tocones tienen la cima plana: más bajos para que el chasis no se enganche
    const p = f.pos(a, lat), y = flat === f ? f.y0 : groundAt(f, a); // en una pieza inclinada, el suelo local es plano
    e = Math.max(0.04, e - (flat === f ? 0 : Math.abs(slopeAt(f, a))) * r * 0.9); // en pendiente la cara de abajo asoma más
    if (kind === 0) return B.ball(r, p.x, y + e - r, p.z, color, { detail: rnd() < 0.5 ? 0 : 1, phys: PHYS });
    if (kind === 1) {
      const w = r * (1.6 + rnd() * 0.8), d = r * (1.2 + rnd() * 0.8), h = Math.max(e * 1.6, r * 0.7);
      return B.box(w, h, d, p.x, y + e - h / 2 - 0.02, p.z, color, { rot: [(rnd() - 0.5) * 0.35, rnd() * 6.28, (rnd() - 0.5) * 0.35], phys: PHYS });
    }
    const h = r * (1.0 + rnd() * 1.2);
    return B.cyl(r * (0.55 + rnd() * 0.25), r, h, p.x, y + e - h / 2 - 0.02, p.z, color, { seg: 5 + ((rnd() * 4) | 0), rot: [(rnd() - 0.5) * 0.3, rnd() * 6.28, (rnd() - 0.5) * 0.3], phys: PHYS });
  }
  // Reparte `count` rocas al azar por el tramo (sin que se pisen mucho)
  function scatter(f, a0, a1, count, { rMin = 0.18, rMax = 0.38, eMin = 0.1, eMax = 0.3, colors = ROCK, kinds, wide = W / 2 - 0.1, overlap = 0.72, big = null } = {}) {
    const placed = [];
    for (let k = 0, tries = 0; k < count && tries < count * 60; tries++) {
      const a = a0 + rnd() * (a1 - a0), lat = (rnd() * 2 - 1) * wide, isBig = big && rnd() < big[0], r = (rMin + rnd() * (rMax - rMin)) * (isBig ? big[1] : 1);
      if (placed.some((q) => Math.hypot(q.a - a, q.lat - lat) < (q.r + r) * overlap)) continue;
      placed.push({ a, lat, r });
      rock(f, a, lat, r, (eMin + rnd() * (eMax - eMin)) * (isBig ? big[2] : 1), colors[(rnd() * colors.length) | 0], kinds ? kinds[(rnd() * kinds.length) | 0] : undefined);
      k++;
    }
  }

  // 1 · Escalones de madera: subir n peldaños (4 veces más alto que antes), meseta y bajar
  function steps(x, z, { n = P.steps.n, rise = P.steps.rise, tread = P.steps.tread, top = P.steps.top, wide = 0.94 } = {}) {
    const L = LEN.steps, f = frame(x, z, L, 'Escalones de madera');
    let a = -L / 2;
    const slab = (len, h) => { const p = f.pos(a + len / 2); B.box(W * wide, h, len, p.x, f.y0 + h / 2, p.z, plankMat, { rot: [0, f.yaw, 0], phys: PHYS }); a += len; };
    for (let k = 1; k <= n; k++) slab(tread, rise * k);
    slab(top, rise * n);
    for (let k = n; k >= 1; k--) slab(tread, rise * k);
    narrow(f, 5);
    return f;
  }

  // 2 · Troncos sueltos: una maraña de troncos largos y cortos, de grosor y rumbo al azar
  function logPile(x, z, { n = P.logs.n, extra = P.logs.extra } = {}) {
    const L = LEN.logs, f = frame(x, z, L, 'Troncos sueltos');
    for (let k = 0; k < n; k++) {
      const r = 0.1 + rnd() * 0.1, top = 0.1 + rnd() * 0.1;
      logAcross(f, -L / 2 + 0.7 + rnd() * (L - 1.4), top - r, (rnd() - 0.5) * 0.3, r, W * (0.95 + rnd() * 0.05), LOG[k % 4], { yawJ: (rnd() - 0.5) * 0.9 });
    }
    for (let k = 0; k < extra; k++) { // troncos cortos encima, sueltos y de cualquier rumbo
      const r = 0.06 + rnd() * 0.06, a = -L / 2 + 1 + rnd() * (L - 2), lat = (rnd() * 2 - 1) * (W / 2 - 0.4);
      const p = f.pos(a, lat);
      B.cyl(r, r, 0.7 + rnd() * 0.8, p.x, f.y0 + r * 1.1 + rnd() * 0.1, p.z, LOG[(k + 1) % 4], { seg: 7, rot: [0, rnd() * 6.28, Math.PI / 2], phys: PHYS });
    }
    narrow(f, 4.5);
    return f;
  }

  // 3 · Rampa de troncos: sube, meseta y baja, con troncos sueltos repartidos al azar
  function rampDouble(x, z, { up = P.ramp.up, deck = P.ramp.deck, h = P.ramp.h } = {}) {
    const L = LEN.ramp, f = frame(x, z, L, 'Rampa de troncos');
    const a0 = -L / 2, a1 = a0 + up, a2 = a1 + deck, a3 = a2 + up;
    surf(f, a0, 0, a1, h); surf(f, a1, h, a2, h); surf(f, a2, h, a3, 0);
    const hAt = (a) => (a < a0 ? 0 : a < a1 ? h * (a - a0) / up : a < a2 ? h : a < a3 ? h * (a3 - a) / up : 0);
    for (let k = 0; k < P.ramp.logs; k++) {
      const a = a0 + 0.4 + rnd() * (L - 0.8), r = 0.07 + rnd() * 0.06, len = W * (0.4 + rnd() * 0.55), lat = (rnd() - 0.5) * (W - len);
      logAcross(f, a, hAt(a) + r * 0.45, lat, r, len, LOG[k % 4], { yawJ: (rnd() - 0.5) * 1.0 });
    }
    narrow(f, 4.5);
    return f;
  }

  // 4 · Puente de troncos cubierto: dos raíles de troncos (las ruedas deben ir sobre ellos) con tejado de madera
  function coveredBridge(x, z, { ramp = 4, flat = 6.5, h = 0.5, gauge = 0.72, r = 0.3 } = {}) {
    const L = LEN.bridge, f = frame(x, z, L, 'Puente de troncos');
    const a0 = -L / 2 + 0.5, a1 = a0 + ramp, a2 = a1 + flat, a3 = a2 + ramp;
    for (const sd of [-1, 1]) {
      const lat = sd * gauge / 2;
      logAlong(f, a0, 0, a1, h, lat, r, LOG[(sd + 2) & 3], false); beam(f, a0, 0, a1, h, lat, r * 1.5);
      logAlong(f, a1 - 0.2, h, a2 + 0.2, h, lat, r, LOG[(sd + 3) & 3], false); beam(f, a1 - 0.2, h, a2 + 0.2, h, lat, r * 1.5);
      logAlong(f, a2, h, a3, 0, lat, r, LOG[(sd + 4) & 3], false); beam(f, a2, h, a3, 0, lat, r * 1.5);
      for (const a of [a1 + 0.5, a2 - 0.5]) post(f, a, lat, h - r, 0.12, WOOD[1]);
    }
    for (let a = a1 + 1; a < a2; a += 2.2) logAcross(f, a, h - r * 2 - 0.06, 0, 0.1, gauge + 0.7, WOOD[2], { solid: false });
    // tejado a dos aguas sobre postes
    const hp = 2.3, ang = 0.32, span = 1.4;
    for (const a of [a1 + 0.3, (a1 + a2) / 2, a2 - 0.3]) for (const sd of [-1, 1]) post(f, a, sd * 1.1, hp, 0.11, WOOD[0]);
    for (const sd of [-1, 1]) {
      const p = f.pos((a1 + a2) / 2, sd * span / 2 * 0.98);
      B.box(span * 1.03, 0.1, flat + 1.6, p.x, f.y0 + hp + 0.1 + Math.tan(ang) * span / 4, p.z, '#8a5a35', { rot: [0, f.yaw, sd * ang], solid: false });
    }
    const ridge = f.pos((a1 + a2) / 2);
    B.box(0.2, 0.14, flat + 1.8, ridge.x, f.y0 + hp + 0.1 + Math.tan(ang) * span / 2, ridge.z, '#3e2a18', { rot: [0, f.yaw, 0], solid: false });
    pit(f, a1 + 0.3, a2 - 0.3, h);
    narrow(f, 3.8, true);
    return f;
  }

  // 5 · Banco de arena en la curva: arena blanda que frena mucho, con montículos de distinta altura repartidos al azar
  const sandTex = surfaceTex('sand', [1, 2]);
  function sandBank(x, z, L = LEN.sand) {
    const f = frame(x, z, L, 'Banco de arena');
    zones.push(trackPatch(B, circuit, [x, z], L, 'sand', { ...sandTex, color: '#ffffff', opacity: 1, roughness: 1, metalness: 0, normalScale: 1.2, inset: 0.1, surface: 'sand' }));
    const placed = [];
    for (let k = 0, tries = 0; k < P.sand.mounds && tries < 3000; tries++) {
      // CRW-25: al revés, mismo sitio físico que en el original (los montículos están probados para que haya paso)
      const i0 = f.i0 + 2 + Math.floor(rnd() * (f.i1 - f.i0 - 3)), i = B0.reverse ? f.i0 + f.i1 - i0 : i0, s = samples[i], s2 = samples[B0.reverse ? i - 1 : i + 1];
      const u = rnd(), lat = (rnd() * 2 - 1) * (W / 2 - 0.15) * (B0.reverse ? -1 : 1), tall = rnd() < 0.22, e = tall ? 0.34 + rnd() * 0.24 : 0.05 + rnd() * 0.2, r = tall ? 0.75 + rnd() * 0.4 : 0.35 + rnd() * 0.4;
      const px = s.p.x + (s2.p.x - s.p.x) * u + s.n.x * lat, pz = s.p.z + (s2.p.z - s.p.z) * u + s.n.z * lat;
      if (placed.some((q) => Math.hypot(q.x - px, q.z - pz) < (q.r + r) * 0.5)) continue;
      placed.push({ x: px, z: pz, r });
      B.ball(r, px, s.h + e - r, pz, SAND[k & 3], { detail: 1, phys: { friction: 1.5, restitution: 0.02 } });
      k++;
    }
    for (let i = f.i0; i <= f.i1; i += 3) hazards.push({ pos: world(samples[((i % circuit.N) + circuit.N) % circuit.N].p), r: 0, slow: 3.2 });
    return f;
  }

  // 6 · Vado de agua lleno de rocas de formas y tamaños al azar
  const wt = surfaceTex('water', [1, 4]), wt2 = surfaceTex('water', [1.7, 5]);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', map: wt.map, normalMap: wt.normalMap, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.03, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.02, clearcoatNormalMap: wt2.normalMap, clearcoatNormalScale: new THREE.Vector2(0.5, 0.5),
    envMapIntensity: 1.6, transparent: true, opacity: 0.88, vertexColors: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
  });
  visuals.push((t) => { wt.normalMap.offset.set(0, -t * 0.05); wt2.normalMap.offset.set(0, -t * 0.08); wt.map.offset.set(0, -t * 0.03); });
  function ford(x, z, L = LEN.ford) {
    const f = frame(x, z, L, 'Vado de agua');
    const pos = [], uv = [], col = [], idx = [], hw = W / 2 + 0.1;
    let v = 0;
    for (let i = f.i0, k = 0; i <= f.i1; i++, k++) {
      const s = samples[i], fade = Math.min(1, k / 2, (f.i1 - i) / 2);
      for (const sd of [1, -1]) { const q = s.p.clone().addScaledVector(s.n, sd * hw); pos.push(q.x, f.y0 + P.ford.depth, q.z); col.push(1, 1, 1, fade); }
      uv.push(0, v, 1, v); v += sp / (hw * 2);
      if (i < f.i1) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, waterMat); m.userData.dynamic = true; m.receiveShadow = true; B.scene.add(m);
    for (let a = -L / 2 + 1.5; a < L / 2; a += 3.4) zones.push({ pos: f.pos(a), r: W * 0.7, effect: 'wet', surface: 'water' });
    scatter(f, -L / 2 + 2, L / 2 - 1.5, P.ford.rocks, { rMin: 0.12, rMax: 0.3, eMin: 0.08, eMax: 0.2, overlap: 0.7 });
    narrow(f, 3.2);
    return f;
  }

  // 7 · Cuesta de roca: la elevación la crea `hills` en buildCircuit; aquí va el pedregal que la cubre
  function rockClimb(x, z, L = LEN.climb) {
    const f = frame(x, z, L, 'Cuesta de roca');
    scatter(f, -L / 2 + 1, L / 2 - 1, P.climb.rocks, { rMin: 0.12, rMax: 0.34, eMin: 0.08, eMax: 0.24, overlap: 0.5, big: [0.12, 1.6, 1.2] });
    narrow(f, 3.6);
    return f;
  }

  // 8 · Jardín de rocas: pedregal denso de rocas al azar (el coche se inclina y tiene que trepar)
  function rockGarden(x, z) {
    const L = LEN.garden, f = frame(x, z, L, 'Jardín de rocas');
    scatter(f, -L / 2 + 0.6, L / 2 - 0.6, P.garden.rocks, { rMin: 0.1, rMax: 0.36, eMin: 0.1, eMax: 0.24, overlap: 0.45, big: [0.16, 1.9, 1.05] });
    narrow(f, 3);
    return f;
  }

  // 9 · Puente tibetano alto: rampas largas y empinadas y una calzada casi justa para el coche; los lados son un barranco de rocas
  function tibetan(x, z, { ramp = P.tib.ramp, deck = P.tib.deck, h = P.tib.h, w = P.tib.w, sag = 0.14 } = {}) {
    const L = LEN.tib, f = frame(x, z, L, 'Puente tibetano');
    const a0 = -L / 2 + 0.5, a1 = a0 + ramp, a2 = a1 + deck, a3 = a2 + ramp;
    const yAt = (a) => { const u = Math.min(1, Math.max(0, (a - a1) / deck)); return h - sag * 4 * u * (1 - u); };
    surf(f, a0, 0, a1, h, { w }); surf(f, a2, h, a3, 0, { w });
    const nSeg = Math.round(deck / 1.5);
    for (let k = 0; k < nSeg; k++) { // cubierta resistente (oscura) siguiendo la comba
      const s0 = a1 + k * deck / nSeg, s1 = a1 + (k + 1) * deck / nSeg;
      surf(f, s0, yAt(s0), s1, yAt(s1), { w, th: 0.14, material: mat('#3d2b1a') });
    }
    for (let a = a1 + 0.2; a < a2 - 0.1; a += 0.42) { // tablillas sueltas por encima
      const y = yAt(a), slope = Math.atan2(yAt(a + 0.2) - yAt(a - 0.2), 0.4), p = f.pos(a);
      B.box(w + 0.1, 0.07, 0.34, p.x, f.y0 + y + 0.035, p.z, WOOD[(Math.round(a * 7) & 3)], { rot: [-slope, f.yaw + (rnd() - 0.5) * 0.06, 0], solid: false });
    }
    for (const sd of [-1, 1]) for (const a of [a1, a2]) post(f, a, sd * (w / 2 + 0.16), 0.95, 0.07, WOOD[1], h - 0.3); // solo los anclajes, sin barandillas
    // barranco: bloques de roca a ambos lados de la calzada (no se puede rodear el puente por el suelo)
    const hRamp = (a) => (a < a1 ? h * Math.max(0, a - a0) / ramp : a <= a2 ? h : h * Math.max(0, a3 - a) / ramp);
    for (const sd of [-1, 1]) for (let a = a0 + 0.8; a <= a3 - 0.8; a += 0.75) { // barranco bajo (por debajo de la calzada) a los lados
      const e = Math.min(0.5, hRamp(a) * 0.85); if (e < 0.14) continue;
      const r = 0.34 + rnd() * 0.05; rock(f, a + (rnd() - 0.5) * 0.3, sd * (w / 2 + r + 0.02), r, e, ROCK[(rnd() * 5) | 0], 0);
    }
    pit(f, a1 + 0.3, a2 - 0.3, h - sag);
    narrow(f, 3.5, true);
    return f;
  }

  // Puerta numerada (CRW-11): dos postes rojiblancos y un cartel con el número
  function gateVisual(s, num) {
    const hw = W / 2 - 0.1;
    for (const sd of [-1, 1]) {
      const p = s.p.clone().addScaledVector(s.n, sd * hw);
      B.cyl(0.07, 0.07, 0.9, p.x, s.h + 0.45, p.z, '#f5f5f5', { seg: 6, solid: false });
      B.cyl(0.07, 0.07, 0.9, p.x, s.h + 1.35, p.z, '#e53935', { seg: 6, solid: false });
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), new THREE.MeshBasicMaterial({ map: bannerTexture(`OBSTÁCULO ${num}`, '#c62828'), side: THREE.DoubleSide }));
    m.position.set(s.p.x, s.h + 1.95, s.p.z); m.rotation.y = Math.atan2(s.t.x, s.t.z) + Math.PI; // la cara con texto mira a quien llega
    B.scene.add(m);
  }

  // Al terminar: puertas numeradas por orden de recorrido (también al revés) y puntos de reaparición
  function finish() {
    gates.sort((a, b) => a.i - b.i);
    // CRW-17: sin postes ni carteles; las puertas solo sirven de checkpoint interno
    return {
      gates, safe: [...new Set([0, ...safe])].sort((a, b) => a - b), pits, hazards, zones,
      step: () => {}, update: (t) => { for (const f of visuals) f(t); },
    };
  }

  // Piezas rígidas (escalones, troncos, rampas y puentes): en cuesta se inclinan enteras
  let tiltNext = false;
  const tilted = (fn) => (...args) => { tiltNext = true; try { return fn(...args); } finally { tiltNext = false; B = B0; flat = null; } };
  return { steps: tilted(steps), logPile: tilted(logPile), rampDouble: tilted(rampDouble), coveredBridge: tilted(coveredBridge), sandBank, ford, rockClimb, rockGarden, tibetan: tilted(tibetan), finish };
}

// Constructor que gira todo lo que crea un ángulo `ang` alrededor del eje `axis` que pasa por `o` (mallas y colisiones)
function tiltBuilder(B, o, axis, ang) {
  const q = new THREE.Quaternion().setFromAxisAngle(axis, ang);
  const M = new THREE.Matrix4().makeTranslation(o.x, o.y, o.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-o.x, -o.y, -o.z));
  const tf = (m) => { m.applyMatrix4(M); return m; };
  const tp = (p) => new THREE.Vector3(p.x, p.y, p.z).sub(o).applyQuaternion(q).add(o);
  const collider = (desc, pos, quat, opts) => B.collider(desc, tp(pos), quat ? q.clone().multiply(new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w)) : q.clone(), opts);
  const C = B.RAPIER.ColliderDesc;
  return {
    ...B, collider,
    scene: { add: (...objs) => { for (const m of objs) B.scene.add(tf(m)); } },
    box(w, h, d, x, y, z, material, opt = {}) {
      const m = tf(B.box(w, h, d, x, y, z, material, { ...opt, solid: false }));
      if (opt.solid !== false) B.collider(C.cuboid(w / 2, h / 2, d / 2), m.position, m.quaternion, opt.phys || {});
      return m;
    },
    cyl(rTop, rBot, h, x, y, z, material, opt = {}) {
      const m = tf(B.cyl(rTop, rBot, h, x, y, z, material, { ...opt, solid: false }));
      if (opt.solid !== false) B.collider(C.cylinder(h / 2, Math.max(rTop, rBot)), m.position, m.quaternion, opt.phys || {});
      return m;
    },
    ball(r, x, y, z, material, opt = {}) {
      const m = tf(B.ball(r, x, y, z, material, { ...opt, solid: false }));
      if (opt.solid !== false) B.collider(C.ball(r), m.position, null, opt.phys || {});
      return m;
    },
  };
}
