import * as THREE from 'three';
import { tileTexture, labelTexture, canTexture } from '../textures.js';
import { buildCircuit, startArch, room, mat } from './common.js';

// Circuito 2: "El supermercado". Pasillos, estanterías gigantes y carritos.
const ROOM = { x: 64, z: 36, h: 34 };

export default {
  id: 'super',
  name: 'Supermercado',
  desc: 'Pasillos, cajas-rampa y naranjas por el suelo',
  color: '#2bb673',
  build,
};

const PRODUCT_COLORS = ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#f06292', '#00acc1', '#ffffff', '#6d4c41'];

function build(B) {
  const { scene, box, cyl, ball } = B;
  const rnd = mulberry(77);

  room(B, {
    ...ROOM,
    floor: new THREE.MeshStandardMaterial({ map: tileTexture([32, 18]), roughness: 0.22, metalness: 0.05 }),
    wall: new THREE.MeshStandardMaterial({ color: '#e8efe9', roughness: 0.9 }),
    ceil: '#d9dde0',
    baseboard: '#2e7d32',
  });
  // franja verde en las paredes y carteles
  for (const [len, x, z, ry] of [[ROOM.x * 2, 0, -ROOM.z + 0.1, 0], [ROOM.x * 2, 0, ROOM.z - 0.1, Math.PI], [ROOM.z * 2, -ROOM.x + 0.1, 0, Math.PI / 2], [ROOM.z * 2, ROOM.x - 0.1, 0, -Math.PI / 2]]) {
    box(len, 2, 0.2, x, 24, z, '#2bb673', { rot: [0, ry, 0], solid: false, shadow: false });
  }
  const sign = (text, sub, color, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshStandardMaterial({ map: labelTexture([text, sub], color), emissive: '#ffffff', emissiveIntensity: 0.15, emissiveMap: labelTexture([text, sub], color) }));
    m.position.set(x, y, z); m.rotation.y = ry;
    scene.add(m);
  };
  sign('OFERTAS', '¡2x1 en pilas!', '#e53935', -30, 16, -ROOM.z + 0.3, 0);
  sign('FRUTA', 'fresca cada día', '#43a047', 20, 16, -ROOM.z + 0.3, 0);
  sign('CAJAS', 'gracias por su visita', '#1e88e5', 0, 16, ROOM.z - 0.3, Math.PI);
  // fluorescentes del techo
  const tube = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f4fbff', emissiveIntensity: 1.4 });
  for (let x = -48; x <= 48; x += 24) for (let z = -24; z <= 24; z += 16) box(12, 0.4, 1.4, x, ROOM.h - 0.5, z, tube, { solid: false, shadow: false });

  // ---------- Trazado ----------
  const circuit = buildCircuit(B, {
    points: [[-40, 21], [-26, 17], [-12, 23], [2, 16], [16, 22], [30, 17], [44, 23], [56, 13], [55, -1], [49, -12], [37, -21], [24, -14], [10, -22], [-4, -14], [-18, -22], [-32, -14], [-46, -22], [-57, -12], [-57, 3], [-51, 15]],
    start: [-33, 19],
    width: 7,
    limits: [ROOM.x - 1, ROOM.z - 1],
    barrier: { colors: ['#ffd400', '#222222'], height: 0.9, roughness: 0.35 },
  });
  const { samples, sampleNear, yawOf, spot } = circuit;
  const anim = [];
  const W = circuit.width;
  startArch(B, circuit, { color: '#2bb673', text: 'SÚPER CARRERA' });

  // ---------- Estantería central ----------
  const shelf = (x0, x1, z, depth = 8, h = 12) => {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    box(len, h, depth, cx, h / 2, z, '#cfd8dc');
    for (const side of [1, -1]) {
      for (let lv = 0; lv < 4; lv++) {
        const y = 1 + lv * 2.9;
        box(len, 0.25, 1.4, cx, y, z + side * (depth / 2 + 0.6), '#eceff1', { solid: false, shadow: false });
        let x = x0 + 0.3;
        while (x < x1 - 1) {
          const w = 1.2 + rnd() * 1.6, hh = 1.2 + rnd() * 1.3, c = PRODUCT_COLORS[(rnd() * PRODUCT_COLORS.length) | 0];
          box(w - 0.1, hh, 1.2, x + w / 2, y + 0.12 + hh / 2, z + side * (depth / 2 + 0.6), c, { solid: false, shadow: false });
          x += w;
        }
      }
    }
  };
  shelf(-32, 30, 0);
  // cabeceras con ofertas
  for (const x of [-34.5, 32.5]) {
    box(3, 6, 8, x, 3, 0, '#e53935');
    for (let k = 0; k < 6; k++) box(1.2, 1.2, 1.2, x + (rnd() - 0.5), 6.6 + k * 0, -3 + k * 1.2, PRODUCT_COLORS[k], { solid: false });
  }

  // ---------- Neveras al fondo ----------
  const fridgeGlow = new THREE.MeshStandardMaterial({ color: '#cfefff', emissive: '#bfe8ff', emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.3 });
  for (let x = -56; x <= 56; x += 8) {
    box(7.6, 14, 4, x, 7, -ROOM.z + 2.2, '#f5f5f5');
    box(6.6, 11, 0.2, x, 7.5, -ROOM.z + 4.25, fridgeGlow, { solid: false, shadow: false });
  }
  // ---------- Cajas registradoras ----------
  for (const x of [-40, -14, 12, 38]) {
    box(10, 3.6, 3.6, x, 1.8, ROOM.z - 3, '#37474f');
    box(10, 0.3, 3.8, x, 3.75, ROOM.z - 3, '#263238', { solid: false });
    box(1.6, 1.8, 1.4, x + 3, 4.8, ROOM.z - 3, '#111', { solid: false });
  }

  // ---------- Rampa: caja de cartón aplastada ----------
  {
    const s = sampleNear(-57, -7);
    const L = 8, H = 1.8, T = 0.4, Wd = W - 0.2, a = Math.asin(H / L), yaw = yawOf(s.t);
    const c = s.p.clone().addScaledVector(s.t, (L / 2) * Math.cos(a));
    box(Wd, T, L, c.x, H / 2 - (T / 2) * Math.cos(a), c.z, '#c8a165', { rot: [-a, yaw, 0], phys: { friction: 0.8 } });
    const back = s.p.clone().addScaledVector(s.t, L * Math.cos(a) - 1.2);
    box(Wd - 0.6, H - 0.3, 2, back.x, (H - 0.3) / 2, back.z, '#b88d52', { rot: [0, yaw, 0] });
    // flecha pintada
    box(1.6, 0.05, 3, c.x, H / 2 + 0.25, c.z, '#ffffff', { rot: [-a, yaw, 0], solid: false, shadow: false });
  }

  // ---------- Túnel: tabla sobre dos cajas de cereales ----------
  {
    const s = sampleNear(55.5, 4);
    const yaw = yawOf(s.t), top = 4.2, Lt = 5, side = s.n;
    for (const sd of [1, -1]) {
      const p = s.p.clone().addScaledVector(side, sd * (W / 2 + 2.6));
      const cereal = box(3.4, top, 6, p.x, top / 2, p.z, new THREE.MeshStandardMaterial({ map: labelTexture(['CHOCO', 'crunchy'], sd > 0 ? '#ff7043' : '#7e57c2') }), { rot: [0, yaw, 0] });
      cereal.castShadow = true;
    }
    box(W + 8.4, 0.5, Lt, s.p.x, top + 0.25, s.p.z, '#a1887f', { rot: [0, yaw, 0] });
  }

  // ---------- Carritos y pirámide de latas (fuera de pista) ----------
  const cart = (x, z, ry) => {
    const g = new THREE.Group();
    const wire = mat('#b0bec5', { metalness: 0.8, roughness: 0.3 });
    const add = (w, h, d, px, py, pz, m = wire) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); b.castShadow = true; g.add(b); };
    add(5, 0.2, 8, 0, 2.5, 0); add(0.2, 3.5, 8, 2.5, 4.2, 0); add(0.2, 3.5, 8, -2.5, 4.2, 0);
    add(5, 3.5, 0.2, 0, 4.2, 4); add(5, 3.5, 0.2, 0, 4.2, -4); add(5.4, 0.3, 0.3, 0, 6.6, -5, mat('#e53935'));
    for (const [px, pz] of [[2, 3], [-2, 3], [2, -3], [-2, -3]]) {
      add(0.2, 2.2, 0.2, px, 1.4, pz);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10).rotateZ(Math.PI / 2), mat('#212121')); w.position.set(px, 0.4, pz); g.add(w);
    }
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
    box(5.2, 6, 8.4, x, 3, z, '#000', { rot: [0, ry, 0] }).visible = false;
  };
  for (const [x, z, ry] of [[58, 27, 0.6], [-59, -28, -0.3], [40, 3, 1.2], [-44, 4, 0.4]]) { const p = spot(x, z, 5); if (p) cart(p[0], p[1], ry); }
  {
    const canMat = new THREE.MeshStandardMaterial({ map: canTexture(), roughness: 0.3, metalness: 0.6 });
    const [bx, bz] = spot(-14, 9, 5) || [-14, 9];
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4 - row; k++) {
        cyl(0.9, 0.9, 2.2, bx + (k - (3 - row) / 2) * 1.9, 1.1 + row * 2.2, bz, canMat, { seg: 12, solid: false });
      }
    }
    box(8, 9, 2, bx, 4.5, bz, '#000').visible = false;
  }
  // cartel de suelo mojado
  {
    const s = sampleNear(-55, -4);
    const p = s.p.clone().addScaledVector(s.n, (W / 2 + 2.8));
    const g = new THREE.Group();
    for (const sd of [1, -1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4, 0.12), mat('#ffd600'));
      m.position.set(0, 2, sd * 0.7); m.rotation.x = sd * 0.3; m.castShadow = true; g.add(m);
    }
    g.position.copy(p); g.rotation.y = yawOf(s.t);
    scene.add(g);
  }

  // ---------- Carteles de oferta giratorios colgados ----------
  {
    const starTex = labelTexture(['¡OFERTA!', '-50%'], '#e53935');
    for (const [x, z] of [[-26, 19], [10, 19], [24, -17], [-18, -18]]) {
      const s = sampleNear(x, z);
      const g = new THREE.Group();
      const sign = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.2, 12).rotateX(Math.PI / 2), [mat('#ffd600'), new THREE.MeshStandardMaterial({ map: starTex }), new THREE.MeshStandardMaterial({ map: starTex })]);
      sign.castShadow = false; g.add(sign);
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 20, 3), mat('#555'));
      wire.position.y = 12.5; g.add(wire);
      g.position.set(s.p.x, 10, s.p.z);
      g.traverse((o) => { o.userData.dynamic = true; });
      scene.add(g);
      const ph = x * 0.1;
      anim.push((t) => { g.rotation.y = t * 1.2 + ph; g.position.y = 10 + Math.sin(t * 1.5 + ph) * 0.3; });
    }
  }
  // ---------- Cintas de las cajas con productos moviéndose ----------
  {
    const items = [];
    for (const x of [-40, -14, 12, 38]) {
      for (let k = 0; k < 3; k++) {
        const it = new THREE.Mesh(new THREE.BoxGeometry(1, 0.9, 0.9), mat(PRODUCT_COLORS[(k * 3 + x) & 7 & 7]));
        it.castShadow = true; it.userData.dynamic = true;
        scene.add(it);
        items.push({ it, x, k });
      }
    }
    anim.push((t) => { for (const o of items) { const u = ((t * 0.25 + o.k / 3) % 1); o.it.position.set(o.x - 4.5 + u * 9, 4.4, ROOM.z - 3); } });
  }
  // ---------- Globos en la salida ----------
  {
    const s0 = samples[0];
    const cols = ['#ff4d6d', '#4dabf7', '#ffd43b', '#69db7c', '#b197fc'];
    const gs = [];
    for (const side of [1, -1]) {
      const base = s0.p.clone().addScaledVector(s0.n, side * (W / 2 + 1.6));
      cols.forEach((c, k) => {
        const g = new THREE.Group();
        const b = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), new THREE.MeshStandardMaterial({ color: c, roughness: 0.25 }));
        b.scale.y = 1.2; b.position.y = 4 + (k % 2); g.add(b);
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4, 3).translate(0, 2, 0), mat('#eee')));
        g.position.set(base.x + (k - 2) * 0.6, 7, base.z + ((k * 7) % 3 - 1) * 0.6);
        g.traverse((o) => { o.userData.dynamic = true; });
        scene.add(g); gs.push(g);
      });
    }
    anim.push((t) => gs.forEach((g, k) => { g.rotation.z = Math.sin(t * 1.3 + k) * 0.2; g.rotation.x = Math.cos(t * 1.1 + k * 1.7) * 0.15; }));
  }

  return {
    circuit,
    update: (t) => { for (const f of anim) f(t); },
    bounds: { x: ROOM.x - 1.5, z: ROOM.z - 1.5, h: ROOM.h - 1 },
    itemSpots: [0.3, 0.72],
    dust: [0.85, 0.85, 0.85],
    lights: {
      background: '#cfd8dc',
      hemi: ['#f2f7ff', '#9aa5ad', 0.75],
      sun: { color: '#f4f8ff', intensity: 2.4, offset: [10, 40, 14] },
      env: 0.45,
      points: [],
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
