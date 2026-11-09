import * as THREE from 'three';
import { surfaceTex, rugTexture, wallpaperTexture, bookCoverTexture, canTexture, groundTex } from '../textures.js';
import { buildCircuit, mat, BARRIER_GROUPS, trackPatch, autoBoosts } from './common.js';

// Circuito 1: "El salón". Escala de juguete: 1 unidad ≈ 22 cm.
const ROOM = { x: 64, z: 46, h: 34 };
const FLOOR_REPEAT = [30, 21.5];

export default {
  id: 'salon',
  name: 'El salón',
  short: 'Salón',
  desc: 'Parqué, rampa-libro y túnel bajo la mesa',
  color: '#e8a23b',
  build,
};

function build(B) {
  const { scene, RAPIER, box, cyl, collider } = B;

  // ---------- Suelo y paredes ----------
  const pq = groundTex('parquet', FLOOR_REPEAT);
  const floorMat = new THREE.MeshStandardMaterial({ map: pq.map, normalMap: pq.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.32, metalness: 0.0 });
  // UV del suelo para que las cuestas lleven exactamente el mismo parqué
  const groundUV = (x, z) => [(x + ROOM.x) / (ROOM.x * 2), (ROOM.z - z) / (ROOM.z * 2)];
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
    collider(RAPIER.ColliderDesc.cuboid(len / 2, ROOM.h / 2, 1), { x: x + off.x, y: ROOM.h / 2, z: z + off.z }, q, { friction: 0.05, restitution: 0.5, groups: BARRIER_GROUPS });
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
  box(0.3, 20, 10, ROOM.x - 0.2, 10, 20, '#9a6a43', { solid: false });
  cyl(0.35, 0.35, 0.8, ROOM.x - 0.7, 10, 16.5, '#d4af37', { rot: [0, 0, Math.PI / 2], solid: false });
  // Cuadros
  box(10, 7, 0.3, -ROOM.x + 0.2, 14, -10, '#3b3b3b', { rot: [0, Math.PI / 2, 0], solid: false });
  box(9, 6, 0.32, -ROOM.x + 0.25, 14, -10, '#e9a23b', { rot: [0, Math.PI / 2, 0], solid: false });
  box(8, 10, 0.3, 20, 16, ROOM.z - 0.2, '#3b3b3b', { solid: false });
  box(7, 9, 0.32, 20, 16, ROOM.z - 0.25, '#5b8fd1', { solid: false });


  // ---------- Trazado ----------
  const bookTex = bookCoverTexture('FÍSICA', '#1f4e8c');
  bookTex.wrapS = bookTex.wrapT = THREE.RepeatWrapping;
  const circuit = buildCircuit(B, {
    points: [
      [-40, 38], [-15, 39], [10, 38], [30, 36], [46, 30], [56, 19], [47, 7], [52, -4], [58, -18], [50, -32], [36, -38], [20, -38],
      [6, -36], [-6, -30], [-10, -18], [0, -8], [14, -14], [26, -6], [22, 8], [8, 14], [-8, 8], [-18, -4], [-30, -14], [-44, -26],
      [-56, -20], [-58, -4], [-50, 8], [-56, 22], [-52, 34],
    ],
    start: [-30, 38.5],
    width: 7,
    limits: [ROOM.x - 1, ROOM.z - 1],
    hills: [{ frac: 0.82, len: 30, h: 1.6 }, { frac: 0.22, len: 22, h: 1.2 }, { frac: 0.5, len: 40, h: 1.0, double: true }],
    ramps: [{ frac: 0.07, len: 9, h: 1.8 }],
    hillMaterial: floorMat,
    rampMaterial: new THREE.MeshStandardMaterial({ map: bookTex, roughness: 0.55 }),
    groundUV,
    barrier: { colors: ['#c62828', '#f5f5f5'] },
    chevrons: { bg: '#c62828', fg: '#ffffff' },
  });

  const W = circuit.width;
  const { samples, sampleNear, yawOf, spot } = circuit;
  const s0 = samples[0];
  const anim = [];

  // punto relativo a la pista: avance y desplazamiento lateral (fracción del ancho)
  const onTrack = (x, z, along = 0, lat = 0) => { const s = circuit.sampleNear(x, z); return s.p.clone().addScaledVector(s.t, along).addScaledVector(s.n, lat * circuit.width / 2); };
  const zones = [];
  // suelo recién encerado (derrapa) y flechas de turbo
  const wax = surfaceTex('wax', [1, 3]);
  const curvy = (f0, f1) => { let best = circuit.at(f0), br = Infinity; for (let f = f0; f < f1; f += 0.005) { const i = circuit.at(f); const r = circuit.minRadius(i, 3, 3); if (r < br) { br = r; best = i; } } return samples[best].p; };
  for (const [f0, f1] of [[0.6, 0.72], [0.9, 0.98]]) {
    const p = curvy(f0, f1);
    zones.push(trackPatch(B, circuit, [p.x, p.z], 18, 'slide', { ...wax, color: '#ffffff', opacity: 1, roughness: 1, metalness: 0.1, surface: 'wax' }));
  }
  zones.push(...autoBoosts(B, circuit, 2, zones.map((z) => [z.from, z.to])));
  // bolos para derribar
  {
    const s = samples[circuit.at(0.27)];
    const c = s.p.clone();
    const pinM = mat('#fafafa', { flatShading: false, roughness: 0.3 });
    let k = 0;
    for (let row = 0; row < 3; row++) for (let j = 0; j <= row; j++) {
      const p = c.clone().addScaledVector(s.t, row * 1.3).addScaledVector(s.n, (j - row / 2) * 1.3);
      B.dynCyl(0.4, 2.2, p.x, s.p.y + 1.1, p.z, k++ % 2 ? pinM : mat('#e53935'), { density: 0.08 });
    }
  }

  // Alfombra (visual)
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(12, 0.03, 24);
  rug.receiveShadow = true;
  scene.add(rug);

  // Arco de salida con dos latas
  for (const side of [1, -1]) {
    const c = s0.p.clone().addScaledVector(s0.n, side * (W / 2 + 2.2));
    const can = cyl(1.3, 1.3, 5.2, c.x, 2.6, c.z, new THREE.MeshStandardMaterial({ map: canTexture(), roughness: 0.3, metalness: 0.6 }), { seg: 16 });
    can.rotation.y = side * 1.2;
    cyl(1.15, 1.3, 0.3, c.x, 5.35, c.z, mat('#c9ccd1', { metalness: 0.8, roughness: 0.3 }), { seg: 16, solid: false });
  }

  // ---------- Mesa de centro: túnel ----------
  {
    const s = samples[circuit.straightest(0.36, 0.44, 4, 4, circuit.elev.map((e) => [e.i0, e.i1]))];
    const yaw = yawOf(s.t);
    const top = 3.8, Lt = 9, Wt = W + 4.2;
    const fwd = s.t, side = s.n, c = s.p;
    box(Wt, 0.7, Lt, c.x, top, c.z, '#c89b6d', { rot: [0, yaw, 0] });
    box(Wt - 0.6, 0.25, Lt - 0.6, c.x, top + 0.45, c.z, '#d8b088', { rot: [0, yaw, 0], solid: false });
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      const lp = c.clone().addScaledVector(side, sx * (Wt / 2 - 0.5)).addScaledVector(fwd, sz * (Lt / 2 - 0.6));
      box(0.7, top, 0.7, lp.x, top / 2, lp.z, '#5b3a22', { rot: [0, yaw, 0] });
    }
    const mug = c.clone().addScaledVector(side, 2).addScaledVector(fwd, 1.5);
    cyl(1, 0.9, 2, mug.x, top + 1.35, mug.z, '#ffffff', { seg: 12 });
    const book = c.clone().addScaledVector(side, -2).addScaledVector(fwd, -1.5);
    box(4, 0.6, 5.5, book.x, top + 0.65, book.z, '#2e8b57', { rot: [0, yaw + 0.3, 0] });
  }

  // ---------- Sofá con gato dormido ----------
  {
    const [sx, sz] = spot(12, 26, 13) || [12, 26];
    const fab = '#3f7f8c', fabDark = '#346a75';
    box(22, 2.2, 8, sx, 1.6, sz, fab);
    box(22, 6.5, 2.2, sx, 3.8, sz + 4.2, fabDark);
    box(2.2, 4.4, 9, sx - 12, 2.7, sz + 0.5, fabDark);
    box(2.2, 4.4, 9, sx + 12, 2.7, sz + 0.5, fabDark);
    for (const k of [-7, 0, 7]) box(6.8, 1.2, 6.6, sx + k, 3.3, sz - 0.4, fab, { solid: false });
    for (const k of [-7, 0, 7]) box(6.4, 4, 1.4, sx + k, 5.6, sz + 2.8, fab, { rot: [0.15, 0, 0], solid: false });
    for (const a of [-1, 1]) for (const b of [-1, 1]) box(0.8, 0.5, 0.8, sx + a * 12, 0.25, sz + b * 3.8, '#2b1b10', { solid: false });
    box(4.2, 4.2, 1, sx - 7.5, 5.6, sz + 2, '#f39c12', { rot: [0.3, 0.2, 0.2], solid: false });
    // gato
    const cat = new THREE.Group();
    const fur = mat('#f0a04b'), dark = mat('#c46f22');
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), fur); body.scale.set(1.3, 0.75, 1); cat.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 8), fur); head.position.set(1.8, 0.1, 0.4); cat.add(head);
    for (const e of [-0.45, 0.45]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 4), dark); ear.position.set(1.9, 0.95, 0.4 + e); cat.add(ear);
    }
    const tail = new THREE.Group(); tail.position.set(-1.9, 0, 0);
    const tseg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.6, 6).translate(0, 1.3, 0), dark);
    tseg.rotation.z = 1.2; tail.add(tseg); cat.add(tail);
    cat.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    cat.position.set(sx + 3, 4.6, sz - 0.6); cat.rotation.y = 0.3;
    cat.userData.dynamic = true; cat.traverse((o) => { o.userData.dynamic = true; });
    scene.add(cat);
    anim.push((t) => { tail.rotation.y = Math.sin(t * 2.2) * 0.8; body.scale.y = 0.75 + Math.sin(t * 1.6) * 0.04; });
  }

  // ---------- Tren de juguete dando vueltas sobre la alfombra ----------
  {
    const [cx, cz] = spot(32, -20, 9) || [32, -20];
    const R = 6.5;
    const rail = new THREE.Mesh(new THREE.TorusGeometry(R, 0.18, 4, 48), mat('#7a5a3a'));
    rail.rotation.x = Math.PI / 2; rail.position.set(cx, 0.12, cz); scene.add(rail);
    const rail2 = rail.clone(); rail2.scale.setScalar((R + 0.9) / R); scene.add(rail2);
    const cars = [];
    const colors = ['#d32f2f', '#1976d2', '#fbc02d', '#388e3c'];
    for (let k = 0; k < 4; k++) {
      const g = new THREE.Group();
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.2), mat(colors[k]));
      c.position.y = 0.9; c.castShadow = true; g.add(c);
      if (k === 0) {
        const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.9, 6), mat('#222'));
        chim.position.set(0, 1.9, 0.6); g.add(chim);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.8), mat('#222')); cab.position.set(0, 1.9, -0.6); g.add(cab);
      }
      for (const wz of [-0.7, 0.7]) for (const wx of [-0.75, 0.75]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 8).rotateZ(Math.PI / 2), mat('#333'));
        w.position.set(wx, 0.3, wz); g.add(w);
      }
      g.traverse((o) => { o.userData.dynamic = true; });
      scene.add(g); cars.push(g);
    }
    anim.push((t) => {
      cars.forEach((g, k) => {
        const a = t * 0.45 - k * 0.38;
        g.position.set(cx + Math.cos(a) * (R + 0.45), 0, cz + Math.sin(a) * (R + 0.45));
        g.rotation.y = -a;
      });
    });
  }

  // ---------- Mueble TV con dibujos animados ----------
  {
    const [tx, tz] = spot(-30, -ROOM.z + 2.2, 7) || [-30, -ROOM.z + 2.2];
    box(16, 4.5, 4.4, tx, 2.25, tz, '#f2f2f2');
    box(15, 0.2, 4, tx, 4.6, tz, '#dcdcdc', { solid: false });
    box(15, 8.5, 0.6, tx, 9.6, tz - 0.8, '#111111', { solid: false });
    const scrMat = new THREE.MeshStandardMaterial({ color: '#1a2a3a', emissive: '#2a4a7a', emissiveIntensity: 0.9, roughness: 0.15 });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(14, 7.6), scrMat);
    scr.position.set(tx, 9.6, tz - 0.45); scr.userData.dynamic = true; scene.add(scr);
    box(2, 0.5, 1.6, tx, 4.95, tz, '#111111', { solid: false });
    const tvCols = ['#ff5a5f', '#3ec1d3', '#ffd23f', '#7bd389', '#a06cd5'];
    anim.push((t) => { const k = Math.floor(t * 0.7) % tvCols.length; scrMat.emissive.set(tvCols[k]).multiplyScalar(0.55 + 0.1 * Math.sin(t * 9)); });
  }

  // ---------- Estantería (pared izquierda) ----------
  {
    const x = -ROOM.x + 2, z0 = 10;
    box(4, 22, 16, x, 11, z0, '#f5f5f5');
    const r = mulberry(11);
    const colors = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400'];
    for (let shelf = 0; shelf < 4; shelf++) {
      const y = 1 + shelf * 5.2;
      box(4.1, 0.4, 16, x, y, z0, '#e6e6e6', { solid: false });
      let z = z0 - 7.3;
      while (z < z0 + 7) {
        const w = 0.8 + r() * 0.9, h = 2.8 + r() * 1.6;
        box(3.2, h, w, x + 0.2, y + 0.2 + h / 2, z + w / 2, colors[(r() * colors.length) | 0], { solid: false, shadow: false });
        z += w + 0.05;
      }
    }
  }

  // ---------- Planta en maceta ----------
  {
    const [px, pz] = spot(-ROOM.x + 4, -ROOM.z + 4, 3.5) || [-ROOM.x + 4, -ROOM.z + 4];
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

  // ---------- Lámpara de pie con globos ----------
  const [lx, lz] = spot(ROOM.x - 4, ROOM.z - 4, 3) || [ROOM.x - 4, ROOM.z - 4];
  const lampPos = new THREE.Vector3(lx, 0, lz);
  {
    cyl(2, 2.4, 0.5, lx, 0.25, lz, '#333333', { seg: 12 });
    cyl(0.25, 0.25, 18, lx, 9, lz, '#333333', { seg: 6 });
    const shade = cyl(2.2, 3.4, 3.4, lx, 19, lz, new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffcf80', emissiveIntensity: 0.8, side: THREE.DoubleSide }), { seg: 12, solid: false });
    shade.castShadow = false;
    const bcol = ['#ff4d6d', '#4dabf7', '#ffd43b'];
    const balloons = bcol.map((c, k) => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 0.1 }));
      b.scale.y = 1.2; b.position.y = 7; b.castShadow = true; g.add(b);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6, 3).translate(0, 3, 0), mat('#eeeeee'));
      g.add(str);
      g.position.set(lx - 1.2 + k * 1.2, 12, lz - 1);
      g.traverse((o) => { o.userData.dynamic = true; });
      scene.add(g);
      return g;
    });
    anim.push((t) => balloons.forEach((g, k) => { g.rotation.z = Math.sin(t * 1.1 + k) * 0.18 - 0.15 + k * 0.15; g.rotation.x = Math.cos(t * 0.9 + k * 2) * 0.12; }));
  }

  // ---------- Robot de juguete que saluda ----------
  {
    const [rx, rz] = spot(-34, 24, 2.5) || [-34, 24];
    const g = new THREE.Group();
    const metal = mat('#b0bec5', { metalness: 0.6, roughness: 0.35 });
    const red = mat('#e53935');
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(2.4, 2.8, 1.6), metal, 0, 3.4, 0);
    add(new THREE.BoxGeometry(1.8, 1.5, 1.4), metal, 0, 5.6, 0);
    for (const e of [-0.45, 0.45]) add(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshStandardMaterial({ color: '#00e5ff', emissive: '#00e5ff', emissiveIntensity: 1 }), e, 5.7, 0.72);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 4), red, 0, 6.7, 0);
    add(new THREE.SphereGeometry(0.2, 6, 4), red, 0, 7.15, 0);
    for (const l of [-0.6, 0.6]) add(new THREE.BoxGeometry(0.7, 2, 0.8), red, l, 1, 0);
    add(new THREE.BoxGeometry(0.5, 1.8, 0.5), metal, -1.5, 3.4, 0);
    const arm = new THREE.Group(); arm.position.set(1.45, 4.5, 0); g.add(arm);
    const a2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5).translate(0, 0.8, 0), metal); a2.castShadow = true; arm.add(a2);
    g.position.set(rx, 0, rz);
    g.rotation.y = Math.atan2(s0.p.x - rx, s0.p.z - rz);
    g.traverse((o) => { o.userData.dynamic = true; });
    scene.add(g);
    B.collider(RAPIER.ColliderDesc.cuboid(1.3, 3.5, 1), { x: rx, y: 3.5, z: rz });
    anim.push((t) => { arm.rotation.z = -0.4 - Math.abs(Math.sin(t * 3)) * 1.2; });
  }

  // ---------- Detalles sueltos ----------
  {
    const put = (x, z, r, fn) => { const p = spot(x, z, r); if (p) fn(p[0], p[1]); };
    // pato de goma gigante
    put(-6, 12, 3, (x, z) => {
      const y = mat('#ffd60a'), o = mat('#ff8800');
      const b = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 10), y); b.scale.set(1.2, 0.8, 1); b.position.set(x, 1.8, z); b.castShadow = true; scene.add(b);
      const h = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), y); h.position.set(x + 1.8, 3.9, z); h.castShadow = true; scene.add(h);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 6).rotateZ(-Math.PI / 2), o); beak.position.set(x + 3.3, 3.7, z); scene.add(beak);
      for (const e of [-0.5, 0.5]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), mat('#111')); eye.position.set(x + 2.7, 4.3, z + e); scene.add(eye); }
      collider(RAPIER.ColliderDesc.ball(2.6), { x, y: 2, z });
    });
  }

  return {
    circuit,
    bounds: { x: ROOM.x - 1.5, z: ROOM.z - 1.5, h: ROOM.h - 1 },
    itemSpots: [0.3, 0.7],
    zones,
    update: (t) => { for (const f of anim) f(t); },
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

