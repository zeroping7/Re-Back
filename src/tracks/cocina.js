import * as THREE from 'three';
import { labelTexture, surfaceTex } from '../textures.js';
import { buildCircuit, startArch, mat } from './common.js';
import { indoor, windowWall, placer, mulberry } from './kit.js';

// Drift 1: "La cocina encerada" (DRI-08). Baldosas recién fregadas, ancho y de curvas enlazadas.
const R = { x: 76, z: 62, h: 36 };

export default {
  id: 'cocina', disc: 'drift',
  name: 'La cocina encerada', short: 'Cocina',
  desc: 'Baldosas brillantes y curvas enlazadas',
  color: '#4dd0e1',
  medals: [3000, 6000, 10000],
  music: 'super', ambient: 'salon',
  build,
};

function build(B) {
  const { scene, RAPIER, box, cyl, collider } = B;
  const rnd = mulberry(7);
  const { floorMat, groundUV } = indoor(B, R, { floor: 'tile', repeat: [19, 15.5], color: '#bfe0e6', roughness: 0.12, metalness: 0.05, wall: '#f3e2b8' });
  windowWall(B, R, -10, 34);

  const circuit = buildCircuit(B, {
    points: [[-48, 36], [-28, 38], [-6, 32], [16, 38], [40, 36], [58, 26], [60, 8], [46, -4], [26, 2], [8, 12], [-10, 4], [-6, -14], [16, -24], [38, -24],
      [52, -22], [61, -30], [58, -41], [44, -45], [14, -42], [-14, -36], [-38, -42], [-56, -38], [-63, -26], [-58, -14], [-47, -8], [-42, 2], [-47, 12], [-58, 17], [-64, 26], [-60, 34]],
    start: [-40, 36],
    width: 11,
    limits: [R.x - 2, R.z - 2],
    hillMaterial: floorMat, groundUV,
    barrier: { colors: ['#00acc1', '#ffffff'], thick: 0.7, round: true, roughness: 0.5 },
    chevrons: { bg: '#00838f', fg: '#ffffff', max: 6 },
  });
  startArch(B, circuit, { color: '#00acc1', text: 'DERRAPE EN LA COCINA' });
  const put = placer(circuit);

  // brillo de cera a lo largo de las curvas (solo aspecto: toda la pista desliza en esta disciplina)
  const wax = surfaceTex('wax', [1, 3]);
  void wax;

  // ---------- Decorado gigante ----------
  // nevera y muebles contra la pared
  box(22, 34, 10, R.x - 12, 17, -R.z + 6, '#eceff1', { phys: { friction: 0.1 } });
  box(0.6, 12, 0.6, R.x - 22, 20, -R.z + 13.4, '#90a4ae', { solid: false });
  box(60, 14, 9, -R.x + 31, 7, -R.z + 5.5, '#8d6e63');
  box(62, 1.2, 11, -R.x + 31, 14.6, -R.z + 6, '#cfd8dc', { solid: false });
  // patas de mesa y sillas
  for (const [x, z] of [[-4, 20], [-4, -4], [30, 20], [30, -4]]) put(x, z, 1.6, (px, pz) => cyl(1.1, 1.1, 22, px, 11, pz, '#6d4c41', { seg: 10 }));
  box(46, 1.4, 34, 13, 22.5, 8, '#8d6e63', { solid: false, shadow: false });
  // cajas de cereales, botes y fruta
  const boxes = [['CRUJI', 'cereales', '#ef6c00'], ['ARROZ', 'largo', '#1565c0'], ['GALLE', 'tas', '#6a1b9a']];
  boxes.forEach(([a, b2, col], k) => put([-40, 20, 48][k], [16, -34, 12][k], 5, (x, z) => {
    const tex = new THREE.MeshStandardMaterial({ map: labelTexture([a, b2], col), roughness: 0.7 });
    const m = box(7, 10, 3, x, 5, z, col, { rot: [0, rnd() * 3, 0] });
    m.material = [mat(col), mat(col), mat(col), mat(col), tex, tex];
  }));
  for (const [x, z, c] of [[-24, 18, '#e53935'], [36, -34, '#fdd835'], [-46, -22, '#43a047'], [8, -8, '#fb8c00']]) {
    put(x, z, 3.2, (px, pz) => { const m = B.ball(2.6, px, 2.6, pz, c, { detail: 2 }); m.scale.y = 0.92; });
  }
  for (const [x, z] of [[-20, -22], [48, -6], [-52, 2]]) {
    put(x, z, 2.6, (px, pz) => { cyl(2, 1.6, 4.2, px, 2.1, pz, '#fafafa', { seg: 14 }); const h = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.3, 6, 12), mat('#fafafa')); h.position.set(px + 2.2, 2.2, pz); scene.add(h); });
  }
  // cubo de fregar y fregona
  put(20, 24, 4, (x, z) => { cyl(3.4, 2.8, 5.5, x, 2.75, z, '#1e88e5', { seg: 14 }); cyl(0.3, 0.3, 20, x + 1, 12, z, '#a1887f', { seg: 6, rot: [0.25, 0, 0.1], solid: false }); });
  collider(RAPIER.ColliderDesc.cuboid(0.1, 0.1, 0.1), { x: 0, y: -5, z: 0 });

  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: R.h - 1 },
    zones: [],
    dust: [0.92, 0.95, 0.97],
    lights: {
      background: '#1a2226',
      hemi: ['#eaf6ff', '#7d8f8a', 0.6],
      sun: { color: '#fff4de', intensity: 3.0, offset: [10, 36, -24] },
      env: 0.5,
      points: [{ color: '#fff1d0', intensity: 220, distance: 80, decay: 1.4, pos: [10, 28, 6] }],
    },
  };
}
