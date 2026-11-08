import * as THREE from 'three';
import { parquetTexture, rugTexture, checkerTexture, wallpaperTexture, bookCoverTexture, canTexture } from './textures.js';

// Circuito 1: "El salón". Escala de juguete: 1 unidad ≈ 22 cm del mundo real.
export const TRACK_WIDTH = 8.5;
// Grupo de colisión de bordes y paredes: los rayos de las ruedas lo ignoran
export const BARRIER_GROUPS = (0x0002 << 16) | 0xffff;
export const WHEEL_RAY_GROUPS = (0x0001 << 16) | 0x0001;
const ROOM = { x: 48, z: 34, h: 30 };

const matCache = new Map();
function mat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!matCache.has(k)) {
    matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, flatShading: true, ...opts }));
  }
  return matCache.get(k);
}

export function buildTrack(scene, world, RAPIER) {
  const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();

  function collider(desc, pos, quat, { friction = 0.6, restitution = 0.1, groups } = {}) {
    desc.setTranslation(pos.x, pos.y, pos.z);
    if (quat) desc.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    desc.setFriction(friction).setRestitution(restitution);
    if (groups !== undefined) desc.setCollisionGroups(groups);
    world.createCollider(desc, fixed);
  }

  // Caja con malla + colisión. rot = [x,y,z] Euler 'YXZ'
  function box(w, h, d, x, y, z, material, { rot = [0, 0, 0], solid = true, shadow = true, receive = true, phys = {} } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof material === 'string' ? mat(material) : material);
    m.position.set(x, y, z);
    tmpE.set(rot[0], rot[1], rot[2], 'YXZ');
    m.quaternion.setFromEuler(tmpE);
    m.castShadow = shadow; m.receiveShadow = receive;
    scene.add(m);
    if (solid) collider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2), m.position, m.quaternion, phys);
    return m;
  }

  function cyl(rTop, rBot, h, x, y, z, material, { seg = 10, solid = true, shadow = true, rot = [0, 0, 0] } = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), typeof material === 'string' ? mat(material) : material);
    m.position.set(x, y, z);
    tmpE.set(rot[0], rot[1], rot[2], 'YXZ');
    m.quaternion.setFromEuler(tmpE);
    m.castShadow = shadow; m.receiveShadow = true;
    scene.add(m);
    if (solid) collider(RAPIER.ColliderDesc.cylinder(h / 2, Math.max(rTop, rBot)), m.position, m.quaternion);
    return m;
  }

  // ---------- Suelo y paredes ----------
  const floorMat = new THREE.MeshStandardMaterial({ map: parquetTexture([22, 15.5]), roughness: 0.38, metalness: 0.0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x * 2, ROOM.z * 2), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  collider(RAPIER.ColliderDesc.cuboid(ROOM.x + 5, 1, ROOM.z + 5), { x: 0, y: -1, z: 0 }, null, { friction: 0.9 });

  const wallMat = new THREE.MeshStandardMaterial({ map: wallpaperTexture([10, 3]), roughness: 0.9 });
  const walls = [
    [ROOM.x * 2, 0, -ROOM.z, 0], [ROOM.x * 2, 0, ROOM.z, Math.PI],
    [ROOM.z * 2, -ROOM.x, 0, Math.PI / 2], [ROOM.z * 2, ROOM.x, 0, -Math.PI / 2],
  ];
  for (const [len, x, z, ry] of walls) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(len, ROOM.h), wallMat);
    w.position.set(x, ROOM.h / 2, z); w.rotation.y = ry; w.receiveShadow = true;
    scene.add(w);
    // rodapié
    const bb = box(len, 1.4, 0.4, x, 0.7, z, '#f2efe6', { rot: [0, ry, 0], solid: false, shadow: false });
    bb.translateZ(0.2);
    // colisión de pared
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    const off = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    collider(RAPIER.ColliderDesc.cuboid(len / 2, ROOM.h / 2, 1), { x: x + off.x, y: ROOM.h / 2, z: z + off.z }, q, { friction: 0.2, restitution: 0.3, groups: BARRIER_GROUPS });
  }
  // techo (solo visual, cierra la habitación)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x * 2, ROOM.z * 2), mat('#f4f1ea', { flatShading: false }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h;
  scene.add(ceil);

  // Ventana en la pared del fondo (de ahí entra el sol)
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), new THREE.MeshBasicMaterial({ color: '#bfe3ff' }));
  sky.position.set(-6, 15, -ROOM.z + 0.05);
  scene.add(sky);
  const frame = '#ffffff';
  box(31, 0.8, 0.6, -6, 23, -ROOM.z + 0.3, frame, { solid: false });
  box(31, 0.8, 0.6, -6, 7, -ROOM.z + 0.3, frame, { solid: false });
  box(0.8, 16, 0.6, -21.1, 15, -ROOM.z + 0.3, frame, { solid: false });
  box(0.8, 16, 0.6, 9.1, 15, -ROOM.z + 0.3, frame, { solid: false });
  box(0.5, 16, 0.4, -6, 15, -ROOM.z + 0.3, frame, { solid: false });
  box(31, 0.4, 0.4, -6, 15, -ROOM.z + 0.3, frame, { solid: false });
  box(33, 0.6, 2.2, -6, 6.6, -ROOM.z + 1.1, frame, { solid: false }); // alféizar
  // Cortinas
  box(4, 22, 0.6, -24, 13, -ROOM.z + 0.8, '#d6824a', { solid: false });
  box(4, 22, 0.6, 12, 13, -ROOM.z + 0.8, '#d6824a', { solid: false });

  // Puerta (pared derecha)
  box(0.3, 20, 10, ROOM.x - 0.2, 10, 14, '#9a6a43', { solid: false });
  cyl(0.35, 0.35, 0.8, ROOM.x - 0.7, 10, 10.5, '#d4af37', { rot: [0, 0, Math.PI / 2], solid: false });
  // Cuadros
  box(10, 7, 0.3, -ROOM.x + 0.2, 14, -10, '#3b3b3b', { rot: [0, Math.PI / 2, 0], solid: false });
  box(9, 6, 0.32, -ROOM.x + 0.25, 14, -10, '#e9a23b', { rot: [0, Math.PI / 2, 0], solid: false });
  box(8, 10, 0.3, 20, 16, ROOM.z - 0.2, '#3b3b3b', { solid: false });
  box(7, 9, 0.32, 20, 16, ROOM.z - 0.25, '#5b8fd1', { solid: false });

  // ---------- Trazado ----------
  const pts = [
    [-18, 26], [4, 26.5], [24, 25], [36, 17], [39, 4], [37, -10], [29, -21], [15, -25.5],
    [0, -25], [-13, -22], [-21, -14], [-29, -11], [-36, -4], [-38, 8], [-33, 20],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const length = curve.getLength();
  const N = Math.round(length / 1.6);
  const samples = [];
  for (let i = 0; i < N; i++) {
    const u = i / N;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u).setY(0).normalize();
    samples.push({ p, t, n: new THREE.Vector3(-t.z, 0, t.x), u });
  }
  // La salida va en la recta de abajo
  {
    let k = 0, bd = Infinity;
    samples.forEach((s, i) => { const d = (s.p.x + 12) ** 2 + (s.p.z - 26) ** 2; if (d < bd) { bd = d; k = i; } });
    samples.push(...samples.splice(0, k));
  }

  // Alfombra en el centro (visual, ligeramente elevada)
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(6, 0.03, 4);
  rug.receiveShadow = true;
  scene.add(rug);

  // Bordes de pista: bloques de juguete de colores (instanciados)
  const blockColors = ['#e63946', '#f1c40f', '#2a9df4', '#2ecc71', '#ff8c1a', '#9b59b6'];
  const blockH = 1.0, blockT = 0.7;
  const segs = [];
  for (const side of [1, -1]) {
    for (let i = 0; i < N; i++) {
      const a = samples[i], b = samples[(i + 1) % N];
      const pa = a.p.clone().addScaledVector(a.n, side * (TRACK_WIDTH / 2 + blockT / 2));
      const pb = b.p.clone().addScaledVector(b.n, side * (TRACK_WIDTH / 2 + blockT / 2));
      const mid = pa.clone().add(pb).multiplyScalar(0.5);
      const dir = pb.clone().sub(pa);
      const len = dir.length();
      if (len < 0.2) continue;
      segs.push({ mid, yaw: Math.atan2(dir.x, dir.z), len: len + 0.12 });
    }
  }
  const blockGeo = new THREE.BoxGeometry(blockT, blockH, 1);
  const blockMesh = new THREE.InstancedMesh(blockGeo, new THREE.MeshStandardMaterial({ roughness: 0.45, flatShading: true }), segs.length);
  blockMesh.castShadow = true; blockMesh.receiveShadow = true;
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  segs.forEach((s, i) => {
    tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw);
    m4.compose(new THREE.Vector3(s.mid.x, blockH / 2, s.mid.z), tmpQ, new THREE.Vector3(1, 1, s.len - 0.08));
    blockMesh.setMatrixAt(i, m4);
    blockMesh.setColorAt(i, col.set(blockColors[i % blockColors.length]));
    collider(RAPIER.ColliderDesc.cuboid(blockT / 2, blockH / 2 + 0.6, s.len / 2), { x: s.mid.x, y: blockH / 2 + 0.6, z: s.mid.z }, tmpQ,
      { friction: 0.1, restitution: 0.35, groups: BARRIER_GROUPS });
  });
  scene.add(blockMesh);

  // Línea de salida (cuadros)
  const s0 = samples[0];
  const startLine = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH, 1.6), new THREE.MeshStandardMaterial({ map: checkerTexture(10, 2), roughness: 0.6 }));
  startLine.rotation.x = -Math.PI / 2;
  startLine.rotation.z = Math.atan2(s0.t.x, s0.t.z);
  startLine.position.set(s0.p.x, 0.04, s0.p.z);
  startLine.receiveShadow = true;
  scene.add(startLine);
  // Arco de salida con dos latas
  for (const side of [1, -1]) {
    const c = s0.p.clone().addScaledVector(s0.n, side * (TRACK_WIDTH / 2 + 2.2));
    const can = cyl(1.3, 1.3, 5.2, c.x, 2.6, c.z, new THREE.MeshStandardMaterial({ map: canTexture(), roughness: 0.3, metalness: 0.6 }), { seg: 16 });
    can.rotation.y = side * 1.2;
    cyl(1.15, 1.3, 0.3, c.x, 5.35, c.z, mat('#c9ccd1', { metalness: 0.8, roughness: 0.3 }), { seg: 16, solid: false });
  }

  function sampleNear(x, z) {
    let best = 0, bd = Infinity;
    samples.forEach((s, i) => { const d = (s.p.x - x) ** 2 + (s.p.z - z) ** 2; if (d < bd) { bd = d; best = i; } });
    return samples[best];
  }
  function yawOf(t) { return Math.atan2(t.x, t.z); }

  // ---------- Rampa: libro gigante ----------
  {
    const s = sampleNear(4, 26.5);
    const L = 7.5, H = 1.7, T = 0.6, W = TRACK_WIDTH - 0.2;
    const a = Math.asin(H / L);
    const yaw = yawOf(s.t);
    const c = s.p.clone().addScaledVector(s.t, (L / 2) * Math.cos(a));
    const cover = bookCoverTexture('FÍSICA', '#1f4e8c');
    const bookMat = [mat('#f4ecd8'), mat('#f4ecd8'), new THREE.MeshStandardMaterial({ map: cover, roughness: 0.6 }), mat('#1f4e8c'), mat('#1f4e8c'), mat('#f4ecd8')];
    const m = box(W, T, L, c.x, H / 2 - (T / 2) * Math.cos(a), c.z, bookMat, { rot: [-a, yaw, 0], phys: { friction: 0.8 } });
    m.userData.ramp = true;
    // Taco que sostiene el libro
    const back = s.p.clone().addScaledVector(s.t, L * Math.cos(a) - 0.9);
    box(W - 1, H - 0.4, 1.2, back.x, (H - 0.4) / 2, back.z, '#c0392b', { rot: [0, yaw, 0] });
  }

  // ---------- Lápices: badenes ----------
  for (const [x, z, off] of [[39, 7, 0], [39, 1, 0]]) {
    const s = sampleNear(x, z);
    const yaw = yawOf(s.t);
    const p = s.p.clone().addScaledVector(s.t, off);
    const pencil = cyl(0.17, 0.17, TRACK_WIDTH + 1, p.x, 0.17, p.z, '#f4c430', { seg: 6, rot: [0, yaw, Math.PI / 2] });
    pencil.updateMatrix();
  }

  // ---------- Mesa de centro: túnel ----------
  {
    const s = sampleNear(8, -25.5);
    const yaw = yawOf(s.t);
    const top = 3.8, Lt = 13, Wt = TRACK_WIDTH + 4.5;
    const fwd = s.t, side = s.n;
    const c = s.p;
    box(Wt, 0.7, Lt, c.x, top, c.z, '#c89b6d', { rot: [0, yaw, 0] });
    box(Wt - 0.6, 0.25, Lt - 0.6, c.x, top + 0.45, c.z, '#d8b088', { rot: [0, yaw, 0], solid: false });
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      const lp = c.clone().addScaledVector(side, sx * (Wt / 2 - 0.6)).addScaledVector(fwd, sz * (Lt / 2 - 0.6));
      box(0.8, top, 0.8, lp.x, top / 2, lp.z, '#5b3a22', { rot: [0, yaw, 0] });
    }
    // Objetos sobre la mesa
    const mug = c.clone().addScaledVector(side, 2).addScaledVector(fwd, 2);
    cyl(1, 0.9, 2, mug.x, top + 1.35, mug.z, '#ffffff', { seg: 12 });
    const book = c.clone().addScaledVector(side, -2).addScaledVector(fwd, -2);
    box(4, 0.6, 5.5, book.x, top + 0.65, book.z, '#2e8b57', { rot: [0, yaw + 0.3, 0] });
  }

  // ---------- Sofá (en el centro, mirando a la tele) ----------
  {
    const sx = 6, sz = 8, fab = '#3f7f8c', fabDark = '#346a75';
    box(22, 2.2, 8, sx, 1.6, sz, fab);                 // base
    box(22, 6.5, 2.2, sx, 3.8, sz + 4.2, fabDark);     // respaldo
    box(2.2, 4.4, 9, sx - 12, 2.7, sz + 0.5, fabDark); // brazos
    box(2.2, 4.4, 9, sx + 12, 2.7, sz + 0.5, fabDark);
    for (const k of [-7, 0, 7]) box(6.8, 1.2, 6.6, sx + k, 3.3, sz - 0.4, fab, { solid: false });
    for (const k of [-7, 0, 7]) box(6.4, 4, 1.4, sx + k, 5.6, sz + 2.8, fab, { rot: [0.15, 0, 0], solid: false });
    for (const a of [-1, 1]) for (const b of [-1, 1]) box(0.8, 0.5, 0.8, sx + a * 12, 0.25, sz + b * 3.8, '#2b1b10', { solid: false });
    box(4.2, 4.2, 1, sx - 7.5, 5.6, sz + 2, '#f39c12', { rot: [0.3, 0.2, 0.2], solid: false }); // cojín
  }

  // ---------- Mueble TV (pared del fondo, a la derecha de la ventana) ----------
  {
    box(16, 4.5, 4.4, 26, 2.25, -31.8, '#f2f2f2');
    box(15, 0.2, 4, 26, 4.6, -31.8, '#dcdcdc', { solid: false });
    box(15, 8.5, 0.6, 26, 9.6, -32.6, '#111111', { solid: false });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(14, 7.6), new THREE.MeshStandardMaterial({ color: '#1a2a3a', emissive: '#2a4a7a', emissiveIntensity: 0.6, roughness: 0.15 }));
    scr.position.set(26, 9.6, -32.25); scene.add(scr);
    box(2, 0.5, 1.6, 26, 4.95, -31.8, '#111111', { solid: false });
  }

  // ---------- Estantería (pared izquierda) ----------
  {
    const x = -46, z0 = 8;
    box(4, 22, 18, x, 11, z0, '#f5f5f5');
    const r = mulberry(11);
    const colors = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400'];
    for (let shelf = 0; shelf < 4; shelf++) {
      const y = 1 + shelf * 5.2;
      box(4.1, 0.4, 18, x, y, z0, '#e6e6e6', { solid: false });
      let z = z0 - 8.3;
      while (z < z0 + 8) {
        const w = 0.8 + r() * 0.9, h = 2.8 + r() * 1.6;
        box(3.2, h, w, x + 0.2, y + 0.2 + h / 2, z + w / 2, colors[(r() * colors.length) | 0], { solid: false, shadow: false });
        z += w + 0.05;
      }
    }
  }

  // ---------- Planta en maceta (esquina) ----------
  {
    const px = -42, pz = -29;
    cyl(3, 2.2, 5, px, 2.5, pz, '#c0643b', { seg: 10 });
    cyl(2.8, 2.8, 0.3, px, 4.9, pz, '#4a3020', { seg: 10, solid: false });
    const leaf = mat('#3f8f3f'), leaf2 = mat('#2f7a35');
    const r = mulberry(5);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const l = new THREE.Mesh(new THREE.ConeGeometry(1.2, 8 + r() * 4, 4), i % 2 ? leaf : leaf2);
      l.position.set(px + Math.cos(a) * 1.5, 9, pz + Math.sin(a) * 1.5);
      l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      l.castShadow = true;
      scene.add(l);
    }
  }

  // ---------- Lámpara de pie (luz cálida) ----------
  const lampPos = new THREE.Vector3(42, 0, 28);
  {
    cyl(2, 2.4, 0.5, lampPos.x, 0.25, lampPos.z, '#333333', { seg: 12 });
    cyl(0.25, 0.25, 18, lampPos.x, 9, lampPos.z, '#333333', { seg: 6 });
    const shade = cyl(2.2, 3.4, 3.4, lampPos.x, 19, lampPos.z, new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffcf80', emissiveIntensity: 0.8, side: THREE.DoubleSide }), { seg: 12, solid: false });
    shade.castShadow = false;
  }

  // ---------- Juguetes y detalles sueltos (fuera de pista) ----------
  {
    // Cubos de juguete con letras
    const cubes = [[-16, 4, '#e63946', 0.3], [-13.5, 6.5, '#2a9df4', 0.8], [-15, 5, '#f1c40f', 0.1]];
    cubes.forEach(([x, z, c, ry], i) => box(2.4, 2.4, 2.4, x, 1.2 + (i === 2 ? 2.4 : 0), z, c, { rot: [0, ry, 0] }));
    // Balón
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 1), mat('#f5f5f5'));
    ball.position.set(-21, 3, 7); ball.castShadow = true; scene.add(ball);
    const ball2 = new THREE.Mesh(new THREE.IcosahedronGeometry(3.02, 1), new THREE.MeshStandardMaterial({ color: '#e74c3c', flatShading: true, wireframe: true }));
    ball2.position.copy(ball.position); scene.add(ball2);
    collider(RAPIER.ColliderDesc.ball(3), ball.position, null, { restitution: 0.6 });
    // Zapatilla
    box(3, 1.4, 7, 30, 0.7, 31.5, '#4a6fa5', { rot: [0, 1.4, 0] });
    box(3.1, 0.4, 7.1, 30, 0.2, 31.5, '#f5f5f5', { rot: [0, 1.4, 0], solid: false });
    // Mando de la tele
    box(1.6, 0.5, 5, 18, 0.25, -3, '#222222', { rot: [0, -0.7, 0] });
    // Bloques apilados en la esquina
    box(5, 2.5, 2.5, 41, 1.25, -28, '#2ecc71');
    box(2.5, 2.5, 5, 41, 3.75, -28, '#9b59b6', { rot: [0, 0.3, 0] });
    // Revistas
    box(6, 0.4, 8, -42, 0.2, 29, '#e67e22', { rot: [0, 0.2, 0] });
    box(6, 0.4, 8, -41.6, 0.6, 29.3, '#ecf0f1', { rot: [0, -0.15, 0] });
  }

  const s1 = samples[1];
  return {
    curve, samples, length,
    lampPos,
    start: { pos: samples[0].p.clone().addScaledVector(samples[0].t, -4), yaw: yawOf(s1.t) },
    bounds: { x: ROOM.x - 1.5, z: ROOM.z - 1.5, h: ROOM.h - 1 },
    sampleNear,
    yawOf,
  };
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
