import * as THREE from 'three';
import { labelTexture, canTexture, groundTex } from '../textures.js';
import { buildCircuit, startArch, room, mat, trackPatch, autoBoosts } from './common.js';

// Circuito 2: "El supermercado". Pasillos, estanterías gigantes y carritos.
const ROOM = { x: 84, z: 48, h: 40 };

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

  const tl = groundTex('tile', [42, 24]);
  const floorMat = new THREE.MeshStandardMaterial({ map: tl.map, normalMap: tl.normalMap, roughness: 0.18, metalness: 0.05 });
  const groundUV = (x, z) => [(x + ROOM.x) / (ROOM.x * 2), (ROOM.z - z) / (ROOM.z * 2)];
  room(B, {
    ...ROOM,
    floor: floorMat,
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
  sign('OFERTAS', '¡2x1 en pilas!', '#e53935', -40, 18, -ROOM.z + 0.3, 0);
  sign('FRUTA', 'fresca cada día', '#43a047', 30, 18, -ROOM.z + 0.3, 0);
  sign('CAJAS', 'gracias por su visita', '#1e88e5', 0, 16, ROOM.z - 0.3, Math.PI);
  // fluorescentes del techo
  const tube = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f4fbff', emissiveIntensity: 1.4 });
  for (let x = -72; x <= 72; x += 24) for (let z = -32; z <= 32; z += 16) box(12, 0.4, 1.4, x, ROOM.h - 0.5, z, tube, { solid: false, shadow: false });

  // ---------- Trazado ----------
  const card = groundTex('cardboard', [1, 1]);
  const circuit = buildCircuit(B, {
    points: [[-60, 28], [-44, 22], [-28, 30], [-12, 22], [4, 30], [20, 22], [36, 30], [52, 22], [66, 28], [77, 18], [70, 6], [77, -6], [70, -20], [58, -28],
      [44, -22], [30, -32], [14, -22], [-2, -32], [-18, -22], [-34, -32], [-50, -24], [-64, -31], [-77, -20], [-70, -6], [-78, 8], [-74, 22]],
    start: [-52, 25],
    width: 7,
    limits: [ROOM.x - 1, ROOM.z - 1],
    hills: [{ frac: 0.62, len: 30, h: 1.6 }, { frac: 0.2, len: 34, h: 0.9, double: true }, { frac: 0.82, len: 22, h: 1.3 }],
    ramps: [{ frac: 0.42, len: 9, h: 1.8 }],
    hillMaterial: floorMat,
    rampMaterial: new THREE.MeshStandardMaterial({ map: card.map, normalMap: card.normalMap, roughness: 0.85 }),
    groundUV,
    barrier: { colors: ['#ffd400', '#222222'], height: 0.9, roughness: 0.35 },
  });

  const { samples, sampleNear, yawOf, spot } = circuit;
  const W = circuit.width;
  const anim = [];

  // punto relativo a la pista: avance y desplazamiento lateral (fracción del ancho)
  const onTrack = (x, z, along = 0, lat = 0) => { const s = circuit.sampleNear(x, z); return s.p.clone().addScaledVector(s.t, along).addScaledVector(s.n, lat * circuit.width / 2); };
  const zones = [];
  // suelo recién fregado (derrapa) y turbos
  const wet = groundTex('wet', [1, 3]);
  const curvy = (f0, f1) => { let best = circuit.at(f0), br = Infinity; for (let f = f0; f < f1; f += 0.005) { const i = circuit.at(f); const r = circuit.minRadius(i, 3, 3); if (r < br) { br = r; best = i; } } return samples[best].p; };
  const wetAt = [];
  for (const [f0, f1] of [[0.33, 0.4], [0.86, 0.95]]) {
    const p = curvy(f0, f1); wetAt.push(p);
    zones.push(Object.assign(trackPatch(B, circuit, [p.x, p.z], 18, 'slide', { map: wet.map, normalMap: wet.normalMap, color: '#d6f2ff', opacity: 0.6 }), { particles: [0.6, 0.85, 1] }));
  }
  zones.push(...autoBoosts(B, circuit, 2, zones.map((z) => [z.from, z.to])));
  // pirámide de latas en la pista
  {
    const s = samples[circuit.at(0.12)];
    const canMat = new THREE.MeshStandardMaterial({ map: canTexture(), roughness: 0.3, metalness: 0.6 });
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) {
      const p = s.p.clone().addScaledVector(s.n, (k - (3 - row) / 2) * 1.5 + 1.2);
      B.dynCyl(0.7, 1.8, p.x, s.p.y + 0.9 + row * 1.85, p.z, canMat, { density: 0.06 });
    }
  }
  // cajas de cartón y rollos de papel
  for (const [i, l] of [[0, -0.4], [0, 0.1], [2.4, -0.15]]) {
    const sb = samples[circuit.at(0.55)];
    const p = sb.p.clone().addScaledVector(sb.t, i).addScaledVector(sb.n, l * W / 2);
    B.dynBox(2, 2, 2, p.x, p.y + 1.1, p.z, '#c8a165', { rot: [0, i * 0.3, 0], density: 0.05 });
  }
  { const sb = samples[circuit.at(0.55)]; const p = sb.p.clone().addScaledVector(sb.t, 0.2).addScaledVector(sb.n, -0.15 * W / 2); B.dynBox(2, 2, 2, p.x, p.y + 3.2, p.z, '#b88d52', { density: 0.05 }); }
  for (let k = 0; k < 6; k++) {
    const sb = samples[circuit.at(0.18)];
    const p = sb.p.clone().addScaledVector(sb.t, (k % 3) * 1.4).addScaledVector(sb.n, (-0.4 + Math.floor(k / 3) * 0.3) * W / 2);
    B.dynCyl(0.6, 1.2, p.x, p.y + 0.65, p.z, '#ffffff', { density: 0.03 });
  }
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
  shelf(-45, 43, 0);
  // cabeceras con ofertas
  for (const x of [-47.5, 45.5]) {
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
  for (const x of [-60, -30, 0, 30, 60]) {
    box(10, 3.6, 3.6, x, 1.8, ROOM.z - 3, '#37474f');
    box(10, 0.3, 3.8, x, 3.75, ROOM.z - 3, '#263238', { solid: false });
    box(1.6, 1.8, 1.4, x + 3, 4.8, ROOM.z - 3, '#111', { solid: false });
  }

  // ---------- Túnel: tabla sobre dos cajas de cereales ----------
  {
    const s = samples[circuit.straightest(0.03, 0.1, 4, 4, circuit.elev.map((e) => [e.i0, e.i1]))];
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
  for (const [x, z, ry] of [[78, 40, 0.6], [-78, -40, -0.3], [62, 6, 1.2], [-58, 6, 0.4]]) { const p = spot(x, z, 5); if (p) cart(p[0], p[1], ry); }
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
    const s = circuit.sampleNear(wetAt[0].x, wetAt[0].z);
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
    for (const [k0, f] of [[0, 0.15], [1, 0.35], [2, 0.66], [3, 0.78]].map(([k, f]) => [k, f])) {
      const s = samples[circuit.at(f)]; const x = k0 * 10;
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
    for (const x of [-60, -30, 0, 30, 60]) {
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
    zones,
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
