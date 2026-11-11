import * as THREE from 'three';
import { checkerTexture } from '../textures.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Grupos de colisión (membresía << 16 | filtro)
export const BARRIER_GROUPS = (0x0002 << 16) | 0xffff;  // bordes y paredes
export const CAR_GROUPS = (0x0004 << 16) | 0xffff;      // chasis de coches
export const WHEEL_RAY_GROUPS = (0x0001 << 16) | 0x0001; // rayos de ruedas: solo suelo/objetos
export const PROP_GROUPS = (0x0010 << 16) | 0xffff;     // objetos sueltos empujables
export const CAMERA_RAY_GROUPS = (0x0008 << 16) | 0x0003; // cámara: ignora coches

const matCache = new Map();
export function mat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!matCache.has(k)) {
    matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, flatShading: true, ...opts }));
  }
  return matCache.get(k);
}
export function clearMatCache() { matCache.clear(); }

// Ayudante para crear mallas estáticas con colisión
// S = escala del mundo: los circuitos se diseñan en unidades "pequeñas" y se amplían
// opts.mirror: circuito en espejo (CIR-23). El dibujo se refleja con escala X negativa en la escena;
// aquí se reflejan las físicas: x → -x y rotaciones (x, -y, -z, w).
export function createBuilder(scene, world, RAPIER, S = 1, { mirror = false, reverse = false } = {}) {
  const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const tmpE = new THREE.Euler();
  const MX = mirror ? -1 : 1;

  function collider(desc, pos, quat, { friction = 0.6, restitution = 0.1, groups } = {}) {
    const sh = desc.shape;
    if (sh.halfExtents) sh.halfExtents = { x: sh.halfExtents.x * S, y: sh.halfExtents.y * S, z: sh.halfExtents.z * S };
    if (sh.halfHeight !== undefined) sh.halfHeight *= S;
    if (sh.radius !== undefined) sh.radius *= S;
    if (sh.borderRadius !== undefined) sh.borderRadius *= S;
    desc.setTranslation(pos.x * S * MX, pos.y * S, pos.z * S);
    if (quat) desc.setRotation(mirror ? { x: quat.x, y: -quat.y, z: -quat.z, w: quat.w } : { x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    desc.setFriction(friction).setRestitution(restitution);
    if (groups !== undefined) desc.setCollisionGroups(groups);
    return world.createCollider(desc, fixed);
  }

  function place(m, x, y, z, rot) {
    m.position.set(x, y, z);
    tmpE.set(rot[0], rot[1], rot[2], 'YXZ');
    m.quaternion.setFromEuler(tmpE);
  }

  // Caja. rot = [x,y,z] Euler 'YXZ'
  function box(w, h, d, x, y, z, material, { rot = [0, 0, 0], solid = true, shadow = true, receive = true, phys = {} } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof material === 'string' ? mat(material) : material);
    place(m, x, y, z, rot);
    m.castShadow = shadow; m.receiveShadow = receive;
    scene.add(m);
    if (solid) collider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2), m.position, m.quaternion, phys);
    return m;
  }

  function cyl(rTop, rBot, h, x, y, z, material, { seg = 10, solid = true, shadow = true, rot = [0, 0, 0], phys = {} } = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), typeof material === 'string' ? mat(material) : material);
    place(m, x, y, z, rot);
    m.castShadow = shadow; m.receiveShadow = true;
    scene.add(m);
    if (solid) collider(RAPIER.ColliderDesc.cylinder(h / 2, Math.max(rTop, rBot)), m.position, m.quaternion, phys);
    return m;
  }

  function ball(r, x, y, z, material, { detail = 1, solid = true, phys = {} } = {}) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), typeof material === 'string' ? mat(material) : material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    if (solid) collider(RAPIER.ColliderDesc.ball(r), m.position, null, phys);
    return m;
  }

  // Muro invisible (o visible) de contención
  function wall(len, h, x, z, ry, { visible = false, material, thick = 2 } = {}) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    collider(RAPIER.ColliderDesc.cuboid(len / 2, h / 2, thick / 2), { x, y: h / 2, z }, q, { friction: 0.2, restitution: 0.3, groups: BARRIER_GROUPS });
    if (visible) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, thick), material);
      m.position.set(x, h / 2, z); m.quaternion.copy(q); m.receiveShadow = true;
      scene.add(m);
    }
  }

  // Objetos sueltos que los coches pueden empujar y tirar
  const dynamics = [];
  function dyn(geo, material, desc, x, y, z, { rot = [0, 0, 0], density = 0.15 } = {}) {
    const m = new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material);
    m.castShadow = true; m.receiveShadow = true; m.userData.dynamic = true;
    scene.add(m);
    tmpE.set(rot[0], rot[1], rot[2], 'YXZ');
    const q = new THREE.Quaternion().setFromEuler(tmpE);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x * S * MX, y * S, z * S)
      .setRotation(mirror ? { x: q.x, y: -q.y, z: -q.z, w: q.w } : { x: q.x, y: q.y, z: q.z, w: q.w }).setLinearDamping(0.3).setAngularDamping(0.4));
    desc.setDensity(density).setFriction(0.5).setRestitution(0.3).setCollisionGroups(PROP_GROUPS);
    world.createCollider(desc, body);
    dynamics.push({ body, mesh: m });
    return m;
  }
  const dynBox = (w, h, d, x, y, z, material, o) => dyn(new THREE.BoxGeometry(w, h, d), material, RAPIER.ColliderDesc.cuboid(w / 2 * S, h / 2 * S, d / 2 * S), x, y, z, o);
  const dynCyl = (r, h, x, y, z, material, o) => dyn(new THREE.CylinderGeometry(r, r, h, 12), material, RAPIER.ColliderDesc.cylinder(h / 2 * S, r * S), x, y, z, o);
  const dynBall = (r, x, y, z, material, o) => dyn(new THREE.IcosahedronGeometry(r, 1), material, RAPIER.ColliderDesc.ball(r * S), x, y, z, o);

  // Obstáculo móvil (OBS-01): cuerpo cinemático que empuja a los coches; las ruedas no lo pisan.
  // desc en unidades del mundo (ya escalado); set() en unidades de diseño.
  const _kq = new THREE.Quaternion(), _ky = new THREE.Vector3(0, 1, 0);
  function kin(mesh, desc, { groups = PROP_GROUPS, friction = 0.3, restitution = 0.5 } = {}) {
    mesh.traverse((o) => { o.userData.dynamic = true; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(mesh);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    desc.setFriction(friction).setRestitution(restitution).setCollisionGroups(groups);
    world.createCollider(desc, body);
    dynamics.push({ body, mesh });
    return {
      body, mesh,
      set(x, y, z, ry = 0, init = false) {
        _kq.setFromAxisAngle(_ky, ry);
        const t = { x: x * S * MX, y: y * S, z: z * S };
        const r = mirror ? { x: _kq.x, y: -_kq.y, z: -_kq.z, w: _kq.w } : { x: _kq.x, y: _kq.y, z: _kq.z, w: _kq.w };
        if (init) { body.setTranslation(t, true); body.setRotation(r, true); } else { body.setNextKinematicTranslation(t); body.setNextKinematicRotation(r); }
      },
    };
  }

  return { scene, world, RAPIER, fixed, collider, box, cyl, ball, wall, mat, S, MX, dynamics, dynBox, dynCyl, dynBall, dyn, kin, mirror, reverse };
}

// Construye el trazado: muestras, bordes, línea de salida, parrilla y utilidades
export function buildCircuit(B, def) {
  const { scene, RAPIER } = B;
  const width = def.width ?? 8.5;
  const pts = def.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const length = curve.getLength();
  const N = Math.round(length / 1.6);
  let samples = [];
  for (let i = 0; i < N; i++) {
    const u = i / N;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u).setY(0).normalize();
    samples.push({ p, t, n: new THREE.Vector3(-t.z, 0, t.x) });
  }
  // la salida, cerca del punto indicado
  {
    const [sx, sz] = def.start;
    let k = 0, bd = Infinity;
    samples.forEach((s, i) => { const d = (s.p.x - sx) ** 2 + (s.p.z - sz) ** 2; if (d < bd) { bd = d; k = i; } });
    samples.push(...samples.splice(0, k));
  }
  // al revés (CIR-23): mismo trazado recorrido en sentido contrario, misma línea de salida
  if (B.reverse) {
    samples = [samples[0], ...samples.slice(1).reverse()];
    for (const s of samples) { s.t.negate(); s.n.negate(); }
  }
  samples.forEach((s, i) => { s.i = i; s.h = 0; });

  // curvatura (radio) y velocidad recomendada para la IA
  for (let i = 0; i < N; i++) {
    const a = samples[(i - 2 + N) % N].t, b = samples[(i + 2) % N].t;
    const ang = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
    const cross = a.x * b.z - a.z * b.x;
    samples[i].radius = (1.6 * 4) / Math.max(ang, 1e-4);
    samples[i].turn = Math.sign(cross);
  }
  // fracción de vuelta → índice. Al revés, la misma fracción cae en el mismo sitio físico que en el original,
  // así los decorados colocados con at() no se mueven.
  const at = (f) => { const i = ((Math.round(f * N) % N) + N) % N; return B.reverse ? (N - i) % N : i; };
  // radio mínimo alrededor de un índice
  const minRadius = (i, back, fwd) => { let r = Infinity; for (let k = -back; k <= fwd; k++) r = Math.min(r, samples[(i + k + N) % N].radius); return r; };
  // índice del tramo más recto entre dos fracciones de la vuelta
  function straightest(f0, f1, back = 4, fwd = 10, avoid = []) {
    const i0 = B.reverse ? at(f1) : at(f0);
    let best = i0, br = -1;
    const n = Math.round(((f1 - f0 + 1) % 1 || 1) * N);
    for (let k = 0; k < n; k++) {
      const i = (i0 + k) % N;
      if (avoid.some(([a, b]) => cyclicIn(i, a - 6, b + 6, N))) continue;
      const r = minRadius(i, back, fwd);
      if (r > br) { br = r; best = i; }
    }
    return best;
  }

  // ---------- Elevación: cuestas (coseno) y rampas (salto) ----------
  const elev = [];
  for (const hl of def.hills || []) {
    const c = hl.frac !== undefined ? at(hl.frac) : nearestIdx(samples, hl.at);
    const half = Math.round(hl.len / 2 / 1.6);
    for (let k = -half; k <= half; k++) {
      const s = samples[(c + k + N) % N], u = k / half;
      const h = hl.h * (hl.double ? Math.pow(Math.sin(Math.PI * (u + 1)), 2) : 0.5 * (1 + Math.cos(Math.PI * u)));
      s.h = Math.max(s.h, h);
    }
    elev.push({ i0: c - half - 1, i1: c + half + 1, kind: 'hill', def: hl });
  }
  // Rampas de salto con rampa de aterrizaje (CIR-24): subida cóncava (lanza), plataforma corta y bajada
  // simétrica. Sin caras verticales: se puede recorrer en los dos sentidos (circuito al revés).
  for (const rp of def.ramps || []) {
    const n = Math.max(3, Math.round(rp.len / 1.6)), d = rp.deck ?? 3, total = n * 2 + d;
    const c = rp.idx ?? (rp.frac !== undefined ? straightest(rp.frac - 0.06, rp.frac + 0.06, 2, total + 4, elev.map((e) => [e.i0, e.i1])) : nearestIdx(samples, rp.at));
    for (let k = 0; k <= total; k++) {
      const s = samples[(c + k) % N];
      const u = k <= n ? k / n : k >= n + d ? (total - k) / n : 1;
      s.h = Math.max(s.h, rp.h * Math.pow(u, 1.5));
    }
    elev.push({ i0: c - 1, i1: c + total + 1, top: (c + n) % N, kind: 'ramp', def: rp });
  }
  for (const s of samples) s.p.y = s.h;

  // ---------- Bordes ----------
  const noBarrier = def.barrier === false;
  const st = noBarrier ? { colors: ['#ffffff'] } : def.barrier;
  let gaps = def.gaps && (B.reverse ? def.gaps.map(([a, b, sd]) => [(N - b) % N, (N - a) % N, sd === undefined ? sd : -sd]) : def.gaps);
  // huecos por fracción de vuelta (puentes sin bordes, OBS-01)
  if (def.gapFracs) gaps = [...(gaps || []), ...def.gapFracs.map(([a, b, sd]) => (B.reverse ? [at(b), at(a), sd === undefined ? sd : -sd] : [at(a), at(b), sd]))];
  // bordes visibles bajos y sobrios; la colisión es un muro invisible más alto
  const blockH = st.height ?? 0.6, blockT = st.thick ?? 0.6;
  const wallHalf = st.wallHalf ?? 1.1; // media altura del muro invisible de colisión (CRW-09: más bajo para no encajonar la cámara)
  const segs = [];
  for (const side of noBarrier ? [] : [1, -1]) {
    for (let i = 0; i < N; i++) {
      const a = samples[i], b = samples[(i + 1) % N];
      if (gaps && gaps.some(([from, to, sd]) => (sd === undefined || sd === side) && inRange(i, from, to, N))) continue;
      const pa = a.p.clone().addScaledVector(a.n, side * (width / 2 + blockT / 2));
      const pb = b.p.clone().addScaledVector(b.n, side * (width / 2 + blockT / 2));
      const mid = pa.clone().add(pb).multiplyScalar(0.5);
      const dir = pb.clone().sub(pa).setY(0);
      const len = dir.length();
      if (len < 0.2) continue;
      segs.push({ mid, yaw: Math.atan2(dir.x, dir.z), len: len + 0.12, h: (a.h + b.h) / 2, pitch: -Math.atan2(b.h - a.h, len) });
    }
  }
  const geo = st.round ? new THREE.CylinderGeometry(blockT / 2, blockT / 2, 1, 8).rotateX(Math.PI / 2) : new THREE.BoxGeometry(blockT, blockH, 1);
  const blockMesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: st.roughness ?? 0.45, flatShading: true }), segs.length);
  blockMesh.castShadow = true; blockMesh.receiveShadow = true;
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), qp = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);
  segs.forEach((sg, i) => {
    q.setFromAxisAngle(Y, sg.yaw).multiply(qp.setFromAxisAngle(X, sg.pitch)); // el borde sigue la pendiente: sin escalones entre bloques
    const y = st.round ? blockT / 2 : blockH / 2;
    m4.compose(new THREE.Vector3(sg.mid.x, y + sg.h, sg.mid.z), q, new THREE.Vector3(1, 1, sg.len - 0.08));
    blockMesh.setMatrixAt(i, m4);
    blockMesh.setColorAt(i, col.set(st.colors[i % st.colors.length]));
    B.collider(RAPIER.ColliderDesc.cuboid(blockT / 2, wallHalf, sg.len / 2), { x: sg.mid.x, y: wallHalf + sg.h, z: sg.mid.z }, q,
      { friction: 0.05, restitution: 0.5, groups: BARRIER_GROUPS });
  });
  if (segs.length && !st.hidden) scene.add(blockMesh); // hidden: solo colisión (el dibujo lo pone el circuito, p. ej. rocas)

  // ---------- Superficies elevadas (malla visible + colisión triangular sin aristas internas) ----------
  for (const e of elev) {
    const hw = width / 2 + blockT + 0.25;
    const LIFT = 0.03; // el dibujo sube un pelo sobre la física: así no compite con el suelo (z-fighting) donde la rampa muere en y=0
    const sub = 3; // subdivisiones entre muestras para que sea suave
    const rows = [];
    for (let i = e.i0; i < e.i1; i++) {
      const a = samples[(i + N) % N], b = samples[(i + 1 + N) % N];
      for (let k = 0; k < sub; k++) {
        const u = k / sub;
        const p = a.p.clone().lerp(b.p, u);
        const n = a.n.clone().lerp(b.n, u).normalize();
        const h = a.h + (b.h - a.h) * (e.kind === 'hill' ? (1 - Math.cos(Math.PI * u)) / 2 : u);
        rows.push({ p, n, h });
      }
    }
    const last = samples[(e.i1 + N) % N];
    rows.push({ p: last.p.clone(), n: last.n.clone(), h: last.h });
    const pos = [], uv = [], idx = [], phys = [], tri = [];
    let along = 0;
    rows.forEach((r, k) => {
      const l = r.p.clone().addScaledVector(r.n, hw), rr = r.p.clone().addScaledVector(r.n, -hw);
      if (k) along += r.p.distanceTo(rows[k - 1].p);
      const gl = def.groundUV ? def.groundUV(l.x, l.z) : [0, along / (hw * 2)];
      const gr = def.groundUV ? def.groundUV(rr.x, rr.z) : [1, along / (hw * 2)];
      // superficie (0,1) y faldones (2,3)
      pos.push(l.x, r.h + LIFT, l.z, rr.x, r.h + LIFT, rr.z, l.x, 0, l.z, rr.x, 0, rr.z);
      uv.push(...gl, ...gr, ...gl, ...gr);
      phys.push(l.x * B.S, r.h * B.S, l.z * B.S, rr.x * B.S, r.h * B.S, rr.z * B.S);
      if (k < rows.length - 1) {
        const a = k * 4, b = a + 4;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
        idx.push(a + 2, b + 2, a, a, b + 2, b);
        idx.push(a + 1, b + 1, a + 3, a + 3, b + 1, b + 3);
        const c = k * 2, d = c + 2;
        tri.push(c, d, c + 1, c + 1, d, d + 1);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const material = e.def.material || (e.kind === 'ramp' ? def.rampMaterial : def.hillMaterial) ||
      new THREE.MeshStandardMaterial({ color: e.def.color || def.hillColor || '#c8a165', roughness: 0.8 });
    if (e.kind === 'ramp') { material.polygonOffset = true; material.polygonOffsetFactor = -4; material.polygonOffsetUnits = -16; } // fuerte: en móviles con depth de 16 bits -2 no basta
    const mesh = new THREE.Mesh(g, material);
    mesh.receiveShadow = true; mesh.castShadow = true;
    scene.add(mesh);
    if (B.mirror) { // espejo: x negada y triángulos al revés
      for (let k = 0; k < phys.length; k += 3) phys[k] = -phys[k];
      for (let k = 0; k < tri.length; k += 3) { const t = tri[k + 1]; tri[k + 1] = tri[k + 2]; tri[k + 2] = t; }
    }
    const desc = RAPIER.ColliderDesc.trimesh(new Float32Array(phys), new Uint32Array(tri), RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES).setFriction(0.9);
    B.world.createCollider(desc, B.fixed);
  }

  // ---------- Carteles de flechas en las curvas cerradas ----------
  if (def.chevrons !== false) cornerSigns(scene, samples, width, blockT, def.chevrons || {});

  // ---------- Línea de salida ----------
  const s0 = samples[0];
  if (!def.noLine) {
  const line = new THREE.Mesh(new THREE.PlaneGeometry(width, 1.6), new THREE.MeshStandardMaterial({ map: checkerTexture(10, 2), roughness: 0.6 }));
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = Math.atan2(s0.t.x, s0.t.z);
  line.position.set(s0.p.x, 0.045 + s0.h, s0.p.z);
  line.receiveShadow = true;
  scene.add(line);
  }

  const C = { curve, samples, N, length, width, spacing: 1.6, elev, at, minRadius, straightest };
  function sampleNear(x, z) {
    let best = 0, bd = Infinity;
    for (const s of samples) { const d = (s.p.x - x) ** 2 + (s.p.z - z) ** 2; if (d < bd) { bd = d; best = s.i; } }
    return samples[best];
  }
  // búsqueda local (rápida) alrededor de un índice
  function nearestFrom(idx, x, z, back = 8, fwd = 20) {
    let best = idx, bd = Infinity;
    for (let k = -back; k <= fwd; k++) {
      const i = (idx + k + N) % N, s = samples[i];
      const d = (s.p.x - x) ** 2 + (s.p.z - z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  const yawOf = (t) => Math.atan2(t.x, t.z);

  // Parrilla de salida: 2 columnas detrás de la línea
  function gridSlot(i) {
    const row = Math.floor(i / 2), col = i % 2 ? -1 : 1;
    const back = Math.max(2, Math.round((4 + row * 4.5) / C.spacing));
    const s = samples[(N - back) % N];
    return { pos: s.p.clone().addScaledVector(s.n, col * C.width * 0.18), yaw: yawOf(s.t), idx: s.i };
  }

  // distancia de un punto al borde exterior de la pista (negativa = dentro)
  function clearance(x, z) {
    let bd = Infinity;
    for (const s of samples) { const d = (s.p.x - x) ** 2 + (s.p.z - z) ** 2; if (d < bd) bd = d; }
    return Math.sqrt(bd) - (C.width / 2 + blockT + 0.5);
  }
  // busca un hueco libre cerca de (x, z) para un objeto de radio r; null si no hay
  function spot(x, z, r, lim = def.limits || [1e9, 1e9]) {
    for (let rad = 0; rad < 40; rad += 1.5) {
      const steps = rad === 0 ? 1 : Math.ceil(rad * 2);
      for (let k = 0; k < steps; k++) {
        const a = (k / steps) * Math.PI * 2;
        const px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad;
        if (Math.abs(px) > lim[0] - r || Math.abs(pz) > lim[1] - r) continue;
        if (clearance(px, pz) > r) return [px, pz];
      }
    }
    return null;
  }

  return Object.assign(C, { sampleNear, nearestFrom, yawOf, gridSlot, clearance, spot });
}

function nearestIdx(samples, [x, z]) {
  let k = 0, bd = Infinity;
  samples.forEach((s, i) => { const d = (s.p.x - x) ** 2 + (s.p.z - z) ** 2; if (d < bd) { bd = d; k = i; } });
  return k;
}
function cyclicIn(i, a, b, N) {
  const n = ((b - a) % N + N) % N;
  return ((i - a) % N + N) % N <= n;
}

// Placas de turbo en las rectas más largas (lejos de curvas, rampas y salida)
export function autoBoosts(B, circuit, count = 2, used = []) {
  const N = circuit.N, zones = [];
  const avoid = [...circuit.elev.map((e) => [e.i0, e.i1]), [N - 8, 8], ...used];
  const tex = chevronTexture();
  for (let n = 0; n < count; n++) {
    let best = -1, br = 0;
    for (let i = 0; i < N; i++) {
      if (avoid.some(([a, b]) => cyclicIn(i, a - 10, b + 4, N))) continue;
      const r = circuit.minRadius(i, 6, 14);
      if (r > br) { br = r; best = i; }
    }
    if (best < 0 || br < 26) break;
    const s = circuit.samples[best];
    zones.push(trackPatch(B, circuit, [s.p.x, s.p.z], 5, 'boost', { map: tex, emissive: '#ffffff', opacity: 0.95 }));
    avoid.push([best - Math.round(N / 5), best + Math.round(N / 5)]);
  }
  return zones;
}

function inRange(i, from, to, N) {
  return from <= to ? i >= from && i <= to : i >= from || i <= to;
}

// Textura de cartel con texto
export function bannerTexture(text, bg = '#ff6a00', fg = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 96);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 64;
  do { g.font = `italic 900 ${size}px sans-serif`; size -= 2; } while (g.measureText(text).width > 480 && size > 20);
  g.fillText(text, 256, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Arco de salida genérico
export function startArch(B, circuit, { color = '#ff6a00', text = 'RE-BACK' } = {}) {
  const s0 = circuit.samples[0], w = circuit.width;
  const yaw = circuit.yawOf(s0.t);
  for (const side of [1, -1]) {
    const p = s0.p.clone().addScaledVector(s0.n, side * (w / 2 + 1.6));
    B.cyl(0.35, 0.35, 7, p.x, 3.5, p.z, '#dddddd', { seg: 8 });
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(w + 3.6, 1.6, 0.25), [
    mat(color), mat(color), mat(color), mat(color),
    new THREE.MeshStandardMaterial({ map: bannerTexture(text, color) }),
    new THREE.MeshStandardMaterial({ map: bannerTexture(text, color) }),
  ]);
  banner.position.set(s0.p.x, 6.6, s0.p.z);
  banner.rotation.y = yaw;
  banner.castShadow = true;
  B.scene.add(banner);
}

// Cinta de suelo bajo la pista (asfalto, tierra…)
export function trackRibbon(B, circuit, material, extra = 1, y = 0.02) {
  const S = circuit.samples, N = S.length, hw = circuit.width / 2 + extra;
  const pos = [], uv = [], idx = [];
  let v = 0;
  for (let i = 0; i <= N; i++) {
    const s = S[i % N];
    const l = s.p.clone().addScaledVector(s.n, hw), r = s.p.clone().addScaledVector(s.n, -hw);
    pos.push(l.x, y + s.h, l.z, r.x, y + s.h, r.z);
    uv.push(0, v, 1, v);
    v += 1.6 / (hw * 2);
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material.clone());
  m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1;
  m.receiveShadow = true;
  B.scene.add(m);
  return m;
}

// Habitación cerrada: suelo, paredes, techo y colisiones
export function room(B, { x, z, h, floor, wall, ceil = '#f4f1ea', baseboard = '#f2efe6' }) {
  const { scene, RAPIER } = B;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(x * 2, z * 2), floor);
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true;
  scene.add(fl);
  B.collider(RAPIER.ColliderDesc.cuboid(x + 5, 1, z + 5), { x: 0, y: -1, z: 0 }, null, { friction: 0.9 });
  const walls = [[x * 2, 0, -z, 0], [x * 2, 0, z, Math.PI], [z * 2, -x, 0, Math.PI / 2], [z * 2, x, 0, -Math.PI / 2]];
  for (const [len, wx, wz, ry] of walls) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(len, h), wall);
    w.position.set(wx, h / 2, wz); w.rotation.y = ry; w.receiveShadow = true;
    scene.add(w);
    if (baseboard) { const bb = B.box(len, 1.4, 0.4, wx, 0.7, wz, baseboard, { rot: [0, ry, 0], solid: false, shadow: false }); bb.translateZ(0.2); }
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    const off = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    B.collider(RAPIER.ColliderDesc.cuboid(len / 2, h / 2, 1), { x: wx + off.x, y: h / 2, z: wz + off.z }, q, { friction: 0.05, restitution: 0.5, groups: BARRIER_GROUPS });
  }
  const c = new THREE.Mesh(new THREE.PlaneGeometry(x * 2, z * 2), mat(ceil, { flatShading: false }));
  c.rotation.x = Math.PI / 2; c.position.y = h;
  scene.add(c);
}

// Fusiona las mallas estáticas de la escena por material (muchas menos llamadas de dibujo)
export function mergeStatic(scene) {
  scene.updateMatrixWorld(true);
  const groups = new Map();
  const victims = [];
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.userData.dynamic || !o.visible) return;
    if (!o.material.isMeshStandardMaterial && !o.material.isMeshBasicMaterial) return;
    const key = o.material.uuid + (o.castShadow ? 's' : '') + (o.receiveShadow ? 'r' : '');
    if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [] });
    groups.get(key).list.push(o);
  });
  for (const g of groups.values()) {
    if (g.list.length < 2) continue;
    const keepUV = !!(g.mat.map || g.mat.emissiveMap);
    const geos = [];
    for (const o of g.list) {
      let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      if (!keepUV) geo.deleteAttribute('uv');
      else if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      if (!geo.attributes.normal) geo.computeVertexNormals();
      geos.push(geo);
    }
    const merged = mergeGeometries(geos);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, g.mat);
    m.castShadow = g.cast; m.receiveShadow = g.recv;
    scene.add(m);
    victims.push(...g.list);
  }
  for (const o of victims) o.parent?.remove(o);
}

// Pasa el circuito (diseñado en unidades pequeñas) a coordenadas del mundo
export function scaleTrack(T, S, mirror = false) {
  const c = T.circuit;
  for (const s of c.samples) {
    s.p.multiplyScalar(S); s.radius *= S;
    if (mirror) { s.p.x = -s.p.x; s.t.x = -s.t.x; s.n.x = -s.n.x; s.turn = -s.turn; }
  }
  c.width *= S; c.spacing *= S; c.length *= S;
  T.bounds = { x: T.bounds.x * S, z: T.bounds.z * S, h: T.bounds.h * S };
  for (const z of T.zones || []) if (z.pos) { z.pos = z.pos.clone().multiplyScalar(S); z.r *= S; if (mirror) z.pos.x = -z.pos.x; }
  for (const z of T.zones || []) if (z.dir && mirror) z.dir.x = -z.dir.x;
  const L = T.lights;
  if (mirror) { L.sun = { ...L.sun, offset: [-L.sun.offset[0], L.sun.offset[1], L.sun.offset[2]] }; for (const p of L.points || []) p.pos = [-p.pos[0], p.pos[1], p.pos[2]]; }
  if (L.fog) L.fog = [L.fog[0], L.fog[1] * S, L.fog[2] * S];
  for (const p of L.points || []) { p.pos = p.pos.map((v) => v * S); p.distance *= S; p.intensity *= Math.pow(S, p.decay ?? 2); }
}

// Parche sobre la pista (zona de derrape, turbo…). Devuelve la zona para la carrera.
export function trackPatch(B, circuit, at, len, effect, { color = '#ffffff', map = null, normalMap = null, roughnessMap = null, alphaMap = null, opacity = 0.85, emissive = null, inset = 0.4, roughness, metalness, normalScale = 1, surface = null } = {}) {
  const S = circuit.samples, N = S.length;
  const c = circuit.sampleNear(at[0], at[1]).i;
  const half = Math.max(1, Math.round(len / 2 / 1.6));
  const hw = circuit.width / 2 - inset;
  const pos = [], uv = [], idx = [], col = [];
  for (let k = -half, n = 0; k <= half; k++, n++) {
    const s = S[(c + k + N) % N];
    const l = s.p.clone().addScaledVector(s.n, hw), r = s.p.clone().addScaledVector(s.n, -hw);
    pos.push(l.x, s.h + 0.05, l.z, r.x, s.h + 0.05, r.z);
    // con superficie realista, los extremos se difuminan
    const fade = surface ? Math.min(1, (half - Math.abs(k)) / Math.max(1, half * 0.3)) : 1;
    col.push(1, 1, 1, fade, 1, 1, 1, fade);
    uv.push(0, n / (half * 2) * len / (hw * 2), 1, n / (half * 2) * len / (hw * 2));
    if (k < half) { const a = n * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    color, map, normalMap, roughnessMap, alphaMap, vertexColors: !!surface, normalScale: new THREE.Vector2(normalScale, normalScale),
    transparent: true, opacity, roughness: roughness ?? (effect === 'slide' ? 0.05 : 0.4), metalness: metalness ?? (effect === 'slide' ? 0.3 : 0), depthWrite: !surface,
    emissive: emissive || '#000000', emissiveMap: emissive ? map : null, emissiveIntensity: emissive ? 0.9 : 0,
    polygonOffset: true, polygonOffsetFactor: -3,
  }));
  m.receiveShadow = true; m.userData.dynamic = true;
  B.scene.add(m);
  return { from: (c - half + N) % N, to: (c + half) % N, effect, mesh: m, surface };
}

export function chevronTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0d47a1'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#4fc3f7';
  for (const y of [8, 72]) { g.beginPath(); g.moveTo(14, y + 40); g.lineTo(64, y); g.lineTo(114, y + 40); g.lineTo(114, y + 56); g.lineTo(64, y + 16); g.lineTo(14, y + 56); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Carteles con flechas en el exterior de las curvas cerradas (para leer el trazado de lejos)
function cornerSigns(scene, samples, width, blockT, { bg = '#d62828', fg = '#ffffff', maxR = 9, max = 8 } = {}) {
  const N = samples.length;
  const runs = [];
  let cur = null;
  for (let i = 0; i < N; i++) {
    const s = samples[i];
    if (s.radius < maxR) {
      if (!cur) cur = { apex: i, r: s.radius, turn: s.turn, len: 0 };
      cur.len++;
      if (s.radius < cur.r) { cur.r = s.radius; cur.apex = i; cur.turn = s.turn; }
    } else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  const corners = runs.filter((c) => c.apex > 6 && c.apex < N - 6 && samples[c.apex].h < 0.05).sort((a, b) => a.r - b.r).slice(0, max);
  const tex = { '-1': chevronSignTexture(bg, fg, -1), '1': chevronSignTexture(bg, fg, 1) };
  const mats = { '-1': new THREE.MeshStandardMaterial({ map: tex['-1'], emissive: '#ffffff', emissiveMap: tex['-1'], emissiveIntensity: 0.25, roughness: 0.5 }),
    '1': new THREE.MeshStandardMaterial({ map: tex['1'], emissive: '#ffffff', emissiveMap: tex['1'], emissiveIntensity: 0.25, roughness: 0.5 }) };
  const back = mat('#333333');
  const board = new THREE.PlaneGeometry(2.8, 1.3);
  const post = new THREE.CylinderGeometry(0.07, 0.07, 1.1, 5);
  for (const c of corners) {
    // turn < 0 = curva a la izquierda (el exterior queda a la derecha, +n)
    const dir = c.turn < 0 ? -1 : 1;
    for (const k of [-3, 0, 3]) {
      const s = samples[(c.apex + k + N) % N];
      const out = s.n.clone().multiplyScalar(-c.turn || 1);
      const p = s.p.clone().addScaledVector(out, width / 2 + blockT + 1.6);
      const yaw = Math.atan2(-s.t.x, -s.t.z);
      const m = new THREE.Mesh(board, mats[String(dir)]);
      m.position.set(p.x, s.h + 1.75, p.z); m.rotation.y = yaw; m.castShadow = true;
      const b = new THREE.Mesh(board, back);
      b.position.copy(m.position); b.rotation.y = yaw + Math.PI;
      scene.add(m, b);
      for (const sd of [-1, 1]) {
        const po = new THREE.Mesh(post, back);
        po.position.set(p.x + Math.cos(yaw) * sd * 1.1, s.h + 0.55, p.z - Math.sin(yaw) * sd * 1.1);
        scene.add(po);
      }
    }
  }
}

function chevronSignTexture(bg, fg, dir) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 120;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 120);
  g.strokeStyle = '#ffffff55'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 114);
  g.fillStyle = fg;
  for (let k = 0; k < 3; k++) {
    const x0 = 46 + k * 70;
    g.beginPath();
    if (dir < 0) { g.moveTo(x0 + 34, 14); g.lineTo(x0, 60); g.lineTo(x0 + 34, 106); g.lineTo(x0 + 56, 106); g.lineTo(x0 + 22, 60); g.lineTo(x0 + 56, 14); }
    else { g.moveTo(x0 + 22, 14); g.lineTo(x0 + 56, 60); g.lineTo(x0 + 22, 106); g.lineTo(x0, 106); g.lineTo(x0 + 34, 60); g.lineTo(x0, 14); }
    g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
