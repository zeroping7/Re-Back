import * as THREE from 'three';
import { checkerTexture } from '../textures.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Grupos de colisión (membresía << 16 | filtro)
export const BARRIER_GROUPS = (0x0002 << 16) | 0xffff;  // bordes y paredes
export const CAR_GROUPS = (0x0004 << 16) | 0xffff;      // chasis de coches
export const WHEEL_RAY_GROUPS = (0x0001 << 16) | 0x0001; // rayos de ruedas: solo suelo/objetos
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
export function createBuilder(scene, world, RAPIER, S = 1) {
  const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const tmpE = new THREE.Euler();

  function collider(desc, pos, quat, { friction = 0.6, restitution = 0.1, groups } = {}) {
    const sh = desc.shape;
    if (sh.halfExtents) sh.halfExtents = { x: sh.halfExtents.x * S, y: sh.halfExtents.y * S, z: sh.halfExtents.z * S };
    if (sh.halfHeight !== undefined) sh.halfHeight *= S;
    if (sh.radius !== undefined) sh.radius *= S;
    if (sh.borderRadius !== undefined) sh.borderRadius *= S;
    desc.setTranslation(pos.x * S, pos.y * S, pos.z * S);
    if (quat) desc.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
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

  return { scene, world, RAPIER, fixed, collider, box, cyl, ball, wall, mat };
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
  samples.forEach((s, i) => { s.i = i; });

  // curvatura (radio) y velocidad recomendada para la IA
  for (let i = 0; i < N; i++) {
    const a = samples[(i - 2 + N) % N].t, b = samples[(i + 2) % N].t;
    const ang = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
    const cross = a.x * b.z - a.z * b.x;
    samples[i].radius = (1.6 * 4) / Math.max(ang, 1e-4);
    samples[i].turn = Math.sign(cross); // +1 / -1 según el lado de la curva
  }

  // ---------- Bordes ----------
  const st = def.barrier;
  const blockH = st.height ?? 1.0, blockT = st.thick ?? 0.7;
  const segs = [];
  for (const side of [1, -1]) {
    for (let i = 0; i < N; i++) {
      const a = samples[i], b = samples[(i + 1) % N];
      if (def.gaps && def.gaps.some(([from, to, sd]) => (sd === undefined || sd === side) && inRange(i, from, to, N))) continue;
      const pa = a.p.clone().addScaledVector(a.n, side * (width / 2 + blockT / 2));
      const pb = b.p.clone().addScaledVector(b.n, side * (width / 2 + blockT / 2));
      const mid = pa.clone().add(pb).multiplyScalar(0.5);
      const dir = pb.clone().sub(pa);
      const len = dir.length();
      if (len < 0.2) continue;
      segs.push({ mid, yaw: Math.atan2(dir.x, dir.z), len: len + 0.12 });
    }
  }
  const geo = st.round ? new THREE.CylinderGeometry(blockT / 2, blockT / 2, 1, 8).rotateX(Math.PI / 2) : new THREE.BoxGeometry(blockT, blockH, 1);
  const blockMesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: st.roughness ?? 0.45, flatShading: true }), segs.length);
  blockMesh.castShadow = true; blockMesh.receiveShadow = true;
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  segs.forEach((s, i) => {
    q.setFromAxisAngle(Y, s.yaw);
    const y = st.round ? blockT / 2 : blockH / 2;
    m4.compose(new THREE.Vector3(s.mid.x, y, s.mid.z), q, new THREE.Vector3(1, 1, s.len - 0.08));
    blockMesh.setMatrixAt(i, m4);
    blockMesh.setColorAt(i, col.set(st.colors[i % st.colors.length]));
    B.collider(RAPIER.ColliderDesc.cuboid(blockT / 2, 1.1, s.len / 2), { x: s.mid.x, y: 1.1, z: s.mid.z }, q,
      { friction: 0.1, restitution: 0.35, groups: BARRIER_GROUPS });
  });
  scene.add(blockMesh);

  // ---------- Línea de salida ----------
  const s0 = samples[0];
  const line = new THREE.Mesh(new THREE.PlaneGeometry(width, 1.6), new THREE.MeshStandardMaterial({ map: checkerTexture(10, 2), roughness: 0.6 }));
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = Math.atan2(s0.t.x, s0.t.z);
  line.position.set(s0.p.x, 0.045, s0.p.z);
  line.receiveShadow = true;
  scene.add(line);

  const C = { curve, samples, N, length, width, spacing: 1.6 };
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

  return Object.assign(C, { sampleNear, nearestFrom, yawOf, gridSlot });
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
    pos.push(l.x, y, l.z, r.x, y, r.z);
    uv.push(0, v, 1, v);
    v += 1.6 / (hw * 2);
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
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
    B.collider(RAPIER.ColliderDesc.cuboid(len / 2, h / 2, 1), { x: wx + off.x, y: h / 2, z: wz + off.z }, q, { friction: 0.2, restitution: 0.3, groups: BARRIER_GROUPS });
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
export function scaleTrack(T, S) {
  const c = T.circuit;
  for (const s of c.samples) { s.p.multiplyScalar(S); s.radius *= S; }
  c.width *= S; c.spacing *= S; c.length *= S;
  T.bounds = { x: T.bounds.x * S, z: T.bounds.z * S, h: T.bounds.h * S };
  for (const z of T.zones || []) { z.pos = z.pos.clone().multiplyScalar(S); z.r *= S; }
  const L = T.lights;
  if (L.fog) L.fog = [L.fog[0], L.fog[1] * S, L.fog[2] * S];
  for (const p of L.points || []) { p.pos = p.pos.map((v) => v * S); p.distance *= S; p.intensity *= Math.pow(S, p.decay ?? 2); }
}
