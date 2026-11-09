import * as THREE from 'three';
import { surfaceTex, groundTex } from '../textures.js';
import { buildCircuit, startArch, mat, trackPatch } from './common.js';
import { indoor, windowWall, placer, mulberry, obstacleKit } from './kit.js';

// Obstáculos 2: "El fregadero" (OBS-06). Encimera de mármol con cascadas del grifo, jabón, esponjas y patitos.
const R = { x: 80, z: 62, h: 36 };

export default {
  id: 'fregadero', disc: 'obst',
  name: 'El fregadero', short: 'Fregadero',
  desc: 'Cascadas, jabón resbaladizo y patitos',
  color: '#29b6f6',
  medals: [82, 70, 61],
  music: 'muelle', ambient: 'salon',
  build,
};

function duck(scale = 1) {
  const g = new THREE.Group(), y = mat('#ffd60a'), o = mat('#ff8800');
  const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), y); b.scale.set(1.25, 0.85, 1); b.position.y = 0; g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), y); h.position.set(0.8, 0.95, 0); g.add(h);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6).rotateZ(-Math.PI / 2), o); beak.position.set(1.5, 0.9, 0); g.add(beak);
  for (const e of [-0.25, 0.25]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), mat('#111111')); eye.position.set(1.25, 1.12, e); g.add(eye); }
  g.scale.setScalar(scale);
  return g;
}

function build(B) {
  const { scene, box, cyl } = B;
  const rnd = mulberry(63);
  const { floorMat, groundUV } = indoor(B, R, { floor: 'marble', repeat: [7, 5], color: '#f1f4f6', roughness: 0.18, wall: '#d6eaf2' });
  windowWall(B, R, -16, 30);
  const board = groundTex('plank', [1, 1]);
  const boardMat = new THREE.MeshStandardMaterial({ map: board.map, color: '#c58b52', roughness: 0.7 });

  const circuit = buildCircuit(B, {
    points: [[-54, 32], [-32, 38], [-10, 32], [12, 38], [36, 36], [54, 26], [56, 8], [42, -2], [24, 6], [8, 0], [12, -16], [32, -22], [52, -20], [58, -34],
      [40, -42], [14, -36], [-6, -42], [-28, -38], [-50, -36], [-58, -20], [-44, -10], [-24, -14], [-14, -2], [-28, 10], [-48, 8], [-60, 20]],
    start: [-42, 36],
    width: 7,
    limits: [R.x - 2, R.z - 2],
    ramps: [{ frac: 0.52, len: 10, h: 2.0, material: boardMat }],
    hills: [{ frac: 0.14, len: 30, h: 1.6, double: true }, { frac: 0.79, len: 40, h: 2.8, material: boardMat }],
    gapFracs: [[0.765, 0.815]], // tabla de cortar: puente sin bordes
    hillMaterial: floorMat, groundUV,
    barrier: { colors: ['#29b6f6', '#ffffff'], thick: 0.6, round: true, roughness: 0.4 },
    chevrons: { bg: '#0277bd', fg: '#ffffff', max: 6 },
  });
  startArch(B, circuit, { color: '#0288d1', text: 'GRAN PREMIO DEL FREGADERO' });
  const K = obstacleKit(B, circuit);
  const put = placer(circuit);
  const zones = K.zones;

  // ---------- Obstáculos ----------
  K.waterfall(0.25, { side: 1, force: 30 });
  // patitos de goma que cruzan
  const mkDuck = () => { const g = new THREE.Group(); const d = duck(1.15); d.position.y = 0.25; g.add(d); return g; };
  K.slider(0.33, { mesh: mkDuck(), w: 2.6, h: 1.6, d: 2.2, period: 3.4 });
  K.slider(0.38, { mesh: mkDuck(), w: 2.6, h: 1.6, d: 2.2, period: 3.4, phase: Math.PI });
  // pastilla de jabón: tramo resbaladizo
  {
    const f = K.frame(0.44, 12);
    const wx = surfaceTex('wax', [1, 3]);
    zones.push(trackPatch(B, circuit, [f.c.x, f.c.z], 18, 'slide', { ...wx, color: '#f8bbd0', opacity: 0.9, roughness: 0.05, metalness: 0.2, surface: 'wax' }));
    const soap = box(5, 2, 3.2, f.c.x + f.n.x * 6.5, 1, f.c.z + f.n.z * 6.5, '#f48fb1', { rot: [0, f.yaw + 0.4, 0] }); void soap;
  }
  // esponjas: badenes
  K.bumps(0.62, { n: 3, gap: 3, r: 0.6, color: (k) => (k % 2 ? '#fdd835' : '#66bb6a') });
  // cuchara giratoria
  K.spinner(0.69, { color: '#cfd8dc', period: 4.6, dir: -1 });
  K.waterfall(0.9, { side: -1, force: 32, pulse: 3.2 });
  K.slalom(0.07, { n: 3, gap: 4, r: 0.9, h: 2.2, make: (f, k) => { cyl(0.9, 0.7, 2.2, f.p.x, 1.1, f.p.z, k % 2 ? '#ef5350' : '#42a5f5', { seg: 12, solid: false }); } });

  // ---------- Decorado ----------
  // pila del fregadero y grifo
  const sink = { x: -R.x + 22, z: -R.z + 9 };
  box(36, 3, 15, sink.x, 1.5, sink.z, '#cfd8dc');
  box(32, 0.3, 12, sink.x, 3.1, sink.z, '#607d8b', { solid: false, shadow: false });
  cyl(1.4, 1.6, 16, sink.x, 8, sink.z - 6, '#b0bec5', { seg: 10, solid: false });
  cyl(1.2, 1.2, 10, sink.x, 16, sink.z - 1, '#b0bec5', { seg: 10, rot: [Math.PI / 2, 0, 0], solid: false });
  // escurridor con platos
  put(40, 14, 9, (x, z) => { box(16, 1, 10, x, 0.5, z, '#eceff1'); for (let k = 0; k < 5; k++) cyl(4.4, 4.4, 0.5, x - 6 + k * 3, 5, z, k % 2 ? '#ffffff' : '#bbdefb', { seg: 18, rot: [0, 0, Math.PI / 2 - 0.15], solid: false }); });
  // botellas de jabón, vasos, estropajos
  for (const [x, z, c] of [[-38, 20, '#66bb6a'], [30, -34, '#ab47bc'], [-4, 18, '#ffa726'], [44, -30, '#26c6da']]) {
    put(x, z, 3, (px, pz) => { cyl(2.2, 2.4, 8, px, 4, pz, c, { seg: 12 }); cyl(0.8, 1.6, 2, px, 9, pz, c, { seg: 10, solid: false }); cyl(0.9, 0.9, 1.2, px, 10.6, pz, '#ffffff', { seg: 10, solid: false }); });
  }
  for (const [x, z] of [[-18, -26], [28, 20], [-40, -2]]) {
    put(x, z, 2.6, (px, pz) => { const g = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.7, 5.5, 14, 1, true), new THREE.MeshPhysicalMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide })); g.position.set(px, 2.75, pz); g.userData.dynamic = true; scene.add(g); B.collider(B.RAPIER.ColliderDesc.cylinder(2.75, 2.1), { x: px, y: 2.75, z: pz }); });
  }
  for (const [x, z] of [[2, -22], [-48, -22], [48, 2]]) put(x, z, 3, (px, pz) => { box(4.5, 1.6, 3, px, 0.8, pz, '#fdd835', { rot: [0, rnd() * 3, 0] }); box(4.5, 0.5, 3, px, 1.85, pz, '#43a047', { rot: [0, 0, 0], solid: false }); });
  // patitos de adorno
  for (const [x, z] of [[-30, -26], [20, 22]]) put(x, z, 3, (px, pz) => { const d = duck(2.2); d.position.set(px, 1.9, pz); d.rotation.y = rnd() * 6; d.traverse((o) => { o.castShadow = true; }); scene.add(d); B.collider(B.RAPIER.ColliderDesc.ball(2.4), { x: px, y: 2, z: pz }); });

  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: R.h - 1 },
    zones, hazards: K.hazards,
    step: K.step, update: K.update,
    dust: [0.9, 0.94, 0.97],
    lights: {
      background: '#182026',
      hemi: ['#e6f6ff', '#7a8c94', 0.6],
      sun: { color: '#fff6e6', intensity: 3.0, offset: [-10, 36, -22] },
      env: 0.5,
      points: [{ color: '#e6f7ff', intensity: 220, distance: 80, decay: 1.4, pos: [0, 28, 0] }],
    },
  };
}
