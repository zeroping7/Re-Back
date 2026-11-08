import * as THREE from 'three';
import { parquetTexture, rugTexture, wallpaperTexture, bookCoverTexture, canTexture } from '../textures.js';
import { buildCircuit, mat, BARRIER_GROUPS } from './common.js';

// Circuito 1: "El salón". Escala de juguete: 1 unidad ≈ 22 cm.
const ROOM = { x: 48, z: 34, h: 30 };

export default {
  id: 'salon',
  name: 'El salón',
  desc: 'Parqué, rampa-libro y túnel bajo la mesa',
  color: '#e8a23b',
  build,
};

function build(B) {
  const { scene, RAPIER, box, cyl, collider } = B;

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
  const circuit = buildCircuit(B, {
    points: [
      [-18, 26], [4, 26.5], [24, 25], [36, 17], [39, 4], [37, -10], [29, -21], [15, -25.5],
      [0, -25], [-13, -22], [-21, -14], [-29, -11], [-36, -4], [-38, 8], [-33, 20],
    ],
    start: [-12, 26],
    width: 8.5,
    barrier: { colors: ['#e63946', '#f1c40f', '#2a9df4', '#2ecc71', '#ff8c1a', '#9b59b6'] },
  });
  const W = circuit.width;
  const { samples, sampleNear, yawOf } = circuit;
  const s0 = samples[0];

  // Alfombra en el centro (visual, ligeramente elevada)
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(6, 0.03, 4);
  rug.receiveShadow = true;
  scene.add(rug);

  // Arco de salida con dos latas
  for (const side of [1, -1]) {
    const c = s0.p.clone().addScaledVector(s0.n, side * (W / 2 + 2.2));
    const can = cyl(1.3, 1.3, 5.2, c.x, 2.6, c.z, new THREE.MeshStandardMaterial({ map: canTexture(), roughness: 0.3, metalness: 0.6 }), { seg: 16 });
    can.rotation.y = side * 1.2;
    cyl(1.15, 1.3, 0.3, c.x, 5.35, c.z, mat('#c9ccd1', { metalness: 0.8, roughness: 0.3 }), { seg: 16, solid: false });
  }

  // ---------- Rampa: libro gigante ----------
  {
    const s = sampleNear(4, 26.5);
    const L = 7.5, H = 1.7, T = 0.6, BW = W - 0.2;
    const a = Math.asin(H / L);
    const yaw = yawOf(s.t);
    const c = s.p.clone().addScaledVector(s.t, (L / 2) * Math.cos(a));
    const cover = bookCoverTexture('FÍSICA', '#1f4e8c');
    const bookMat = [mat('#f4ecd8'), mat('#f4ecd8'), new THREE.MeshStandardMaterial({ map: cover, roughness: 0.6 }), mat('#1f4e8c'), mat('#1f4e8c'), mat('#f4ecd8')];
    const m = box(BW, T, L, c.x, H / 2 - (T / 2) * Math.cos(a), c.z, bookMat, { rot: [-a, yaw, 0], phys: { friction: 0.8 } });
    m.userData.ramp = true;
    // Taco que sostiene el libro
    const back = s.p.clone().addScaledVector(s.t, L * Math.cos(a) - 0.9);
    box(BW - 1, H - 0.4, 1.2, back.x, (H - 0.4) / 2, back.z, '#c0392b', { rot: [0, yaw, 0] });
  }

  // ---------- Lápices: badenes ----------
  for (const [x, z, off] of [[39, 7, 0], [39, 1, 0]]) {
    const s = sampleNear(x, z);
    const yaw = yawOf(s.t);
    const p = s.p.clone().addScaledVector(s.t, off);
    const pencil = cyl(0.17, 0.17, W + 1, p.x, 0.17, p.z, '#f4c430', { seg: 6, rot: [0, yaw, Math.PI / 2] });
    pencil.updateMatrix();
  }

  // ---------- Mesa de centro: túnel ----------
  {
    const s = sampleNear(8, -25.5);
    const yaw = yawOf(s.t);
    const top = 3.8, Lt = 13, Wt = W + 4.5;
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


  return {
    circuit,
    bounds: { x: ROOM.x - 1.5, z: ROOM.z - 1.5, h: ROOM.h - 1 },
    itemSpots: [0.2, 0.47, 0.75],
    lights: {
      background: '#1b1d2a',
      hemi: ['#e3ecff', '#8a6a4a', 0.5],
      sun: { color: '#fff0d6', intensity: 3.2, offset: [8, 34, -26] },
      env: 0.35,
      points: [{ color: '#ffc477', intensity: 260, distance: 70, decay: 1.4, pos: [lampPos.x, 18, lampPos.z] }],
    },
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

