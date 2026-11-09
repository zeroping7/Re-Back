import * as THREE from 'three';
import { bookCoverTexture, groundTex } from '../textures.js';
import { buildCircuit, startArch, mat } from './common.js';
import { indoor, windowWall, placer, mulberry, obstacleKit } from './kit.js';

// Obstáculos 1: "El escritorio" (OBS-06). Rampas-libro, puente de reglas, lápices, gomas y un ventilador.
const R = { x: 78, z: 60, h: 36 };

export default {
  id: 'escritorio', disc: 'obst',
  name: 'El escritorio', short: 'Escritorio',
  desc: 'Libros, reglas, lápices y un ventilador',
  color: '#8bc34a',
  medals: [82, 70, 61],
  music: 'parque', ambient: 'salon',
  build,
};

function build(B) {
  const { scene, box, cyl } = B;
  const rnd = mulberry(41);
  const { floorMat, groundUV } = indoor(B, R, { floor: 'plank', repeat: [10, 7], color: '#c99b6a', roughness: 0.5, wall: '#cfd8e6' });
  windowWall(B, R, 14, 30);
  const book = (title, color) => new THREE.MeshStandardMaterial({ map: bookCoverTexture(title, color), roughness: 0.6 });
  const ruler = groundTex('plank', [1, 1]);
  const rulerMat = new THREE.MeshStandardMaterial({ map: ruler.map, color: '#ffe082', roughness: 0.4 });

  const circuit = buildCircuit(B, {
    points: [[-52, 34], [-28, 38], [-4, 34], [20, 38], [44, 34], [56, 20], [50, 4], [32, 2], [16, 12], [0, 6], [4, -10], [24, -16], [46, -14], [56, -28],
      [44, -40], [18, -38], [-4, -30], [-24, -38], [-46, -36], [-56, -22], [-46, -8], [-30, -14], [-20, -2], [-32, 10], [-50, 8], [-58, 22]],
    start: [-40, 37],
    width: 7,
    limits: [R.x - 2, R.z - 2],
    ramps: [{ frac: 0.1, len: 10, h: 2.2, material: book('ATLAS', '#1565c0') }, { frac: 0.6, len: 9, h: 1.8, material: book('MATES', '#c62828') }],
    hills: [{ frac: 0.37, len: 46, h: 3.2, material: rulerMat }],
    gapFracs: [[0.335, 0.405]], // puente de reglas: sin bordes
    hillMaterial: floorMat, groundUV,
    barrier: { colors: ['#7cb342', '#f1f8e9'], thick: 0.6, round: true, roughness: 0.6 },
    chevrons: { bg: '#33691e', fg: '#ffffff', max: 6 },
  });
  startArch(B, circuit, { color: '#558b2f', text: 'PRUEBA DEL ESCRITORIO' });
  const K = obstacleKit(B, circuit);
  const put = placer(circuit);

  // ---------- Obstáculos ----------
  // lápices de pie (eslalon)
  K.slalom(0.2, { n: 5, gap: 4, make: (f, k) => {
    const c = ['#fdd835', '#e53935', '#1e88e5', '#43a047', '#fb8c00'][k % 5];
    cyl(0.9, 0.9, 3.4, f.p.x, 1.7, f.p.z, c, { seg: 6, solid: false });
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 6), mat('#f3d9b1')); tip.position.set(f.p.x, 4.1, f.p.z); tip.castShadow = true; scene.add(tip);
  } });
  // gomas de borrar que van y vienen
  K.slider(0.29, { color: '#f48fb1', period: 3.0 });
  K.slider(0.5, { color: '#90caf9', period: 2.6, phase: 1.5 });
  // regla giratoria sobre una chincheta
  K.spinner(0.7, { color: '#ffe082', period: 4.2 });
  K.slider(0.78, { color: '#f48fb1', period: 3.4, phase: 0.7, w: 2.6 });
  // ventilador de sobremesa
  K.fan(0.86, { side: 1, force: 36 });
  // lápices tumbados: badenes
  K.bumps(0.94, { n: 4, gap: 2, color: (k) => ['#fdd835', '#e53935', '#1e88e5', '#43a047'][k % 4], r: 0.5 });

  // ---------- Decorado ----------
  // monitor, teclado y lámpara
  put(2, -R.z + 8, 12, (x, z) => { box(34, 20, 1.6, x, 16, z, '#263238', { solid: false }); box(31, 17, 0.2, x, 16, z + 0.9, '#4fc3f7', { solid: false, shadow: false }); cyl(1.2, 1.2, 8, x, 4, z, '#37474f', { seg: 8 }); box(12, 0.8, 8, x, 0.4, z, '#37474f'); });
  put(26, 20, 9, (x, z) => { box(16, 1.2, 6, x, 0.6, z, '#eceff1'); for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) box(1, 0.4, 1, x - 6.6 + i * 1.2, 1.4, z - 2 + j * 1.3, '#cfd8dc', { solid: false, shadow: false }); });
  const lamp = { x: -R.x + 12, z: -R.z + 12 };
  cyl(4, 5, 1.2, lamp.x, 0.6, lamp.z, '#ef6c00', { seg: 14 }); cyl(0.5, 0.5, 22, lamp.x, 11, lamp.z, '#ef6c00', { seg: 8, solid: false });
  const shade = new THREE.Mesh(new THREE.ConeGeometry(6, 6, 14, 1, true), mat('#ff9800', { side: THREE.DoubleSide })); shade.position.set(lamp.x + 5, 22, lamp.z + 5); shade.rotation.set(0.5, 0, -0.5); scene.add(shade);
  // pilas de libros, bote de lápices, taza, sacapuntas
  const titles = [['CUENTOS', '#6a1b9a'], ['FÍSICA', '#00838f'], ['DIBUJO', '#ef6c00'], ['HISTORIA', '#4e342e']];
  for (const [x, z] of [[-36, 22], [38, -26], [-8, -18], [36, 18]]) {
    put(x, z, 7, (px, pz) => { let y = 0; for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) { const [t, c] = titles[Math.floor(rnd() * 4)]; const h = 1.6 + rnd() * 1.4; const m = box(10, h, 7.5, px, y + h / 2, pz, c, { rot: [0, rnd() * 0.6 - 0.3, 0] }); m.material = [mat('#f5f0e1'), mat(c), book(t, c), mat(c), mat('#f5f0e1'), mat('#f5f0e1')]; y += h; } });
  }
  put(-44, -22, 4, (x, z) => { cyl(3, 3, 7, x, 3.5, z, '#5c6bc0', { seg: 14 }); for (let k = 0; k < 5; k++) cyl(0.35, 0.35, 9, x + rnd() * 3 - 1.5, 7.5, z + rnd() * 3 - 1.5, ['#fdd835', '#e53935', '#43a047'][k % 3], { seg: 6, rot: [rnd() * 0.3, 0, rnd() * 0.3], solid: false }); });
  put(14, -26, 3.5, (x, z) => { cyl(2.8, 2.3, 5, x, 2.5, z, '#fafafa', { seg: 14 }); });
  for (const [x, z] of [[-16, 22], [46, -2], [-40, 0]]) put(x, z, 2.2, (px, pz) => box(3, 1.6, 2, px, 0.8, pz, ['#f48fb1', '#90caf9', '#a5d6a7'][Math.floor(rnd() * 3)], { rot: [0, rnd() * 3, 0] }));

  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: R.h - 1 },
    zones: K.zones, hazards: K.hazards,
    step: K.step, update: K.update,
    dust: [0.8, 0.7, 0.55],
    lights: {
      background: '#1b1d2a',
      hemi: ['#e8f0ff', '#8a6a4a', 0.55],
      sun: { color: '#fff0d6', intensity: 3.1, offset: [12, 34, -24] },
      env: 0.4,
      points: [{ color: '#ffc477', intensity: 300, distance: 80, decay: 1.4, pos: [lamp.x + 6, 18, lamp.z + 6] }],
    },
  };
}
