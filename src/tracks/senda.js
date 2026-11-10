import * as THREE from 'three';
import { groundTex } from '../textures.js';
import { buildCircuit, room, trackRibbon, bannerTexture } from './common.js';
import { crawlKit } from './crawlkit.js';
import { rockWalls, rockField, pines, curtainMaterial, moon } from './diorama.js';

// Circuito 1 de Obstáculos · "La maqueta" (CRW-09..12): diorama de crawlers sobre mesa, con cortinas azules y luna.
// Un solo camino estrecho (A→B, la meta está donde la salida) con nueve obstáculos obligatorios que ocupan todo el ancho.
const R = { x: 74, z: 38, h: 44 };
const PTS = [[-44, 13], [-30, 13], [-16, 13], [-2, 13], [12, 13], [26, 13], [40, 13], [46, 13], [55.2, 9.2], [59, 0], [55.2, -9.2], [46, -13],
  [40, -13], [26, -13], [12, -13], [-2, -13], [-16, -13], [-30, -13], [-40, -13], [-46, -13], [-55.2, -9.2], [-59, 0], [-55.2, 9.2], [-46, 13]];

export default {
  id: 'senda', disc: 'obst',
  name: 'La maqueta', short: 'Maqueta',
  desc: 'Un solo camino y nueve obstáculos obligatorios',
  color: '#8d6e3f',
  medals: [160, 135, 115],
  music: 'parque', ambient: 'salon',
  build,
};

function build(B) {
  // ---------- Sala: cortinas azules, luna y tapete de césped ----------
  const gr = groundTex('grass', [16, 9]);
  const floorMat = new THREE.MeshStandardMaterial({ map: gr.map, normalMap: gr.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.95, color: '#a9b88a' });
  room(B, { x: R.x, z: R.z, h: R.h, floor: floorMat, wall: curtainMaterial(), ceil: '#070d24', baseboard: null });
  moon(B, { x: 20, y: 27, z: -R.z });

  // camino de tierra (también es la superficie de la cuesta)
  const dt = groundTex('dirt', [1, 1]);
  const dirtMat = new THREE.MeshStandardMaterial({ map: dt.map, normalMap: dt.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 1, color: '#c9ad82' });

  const circuit = buildCircuit(B, {
    points: PTS,
    start: [-44, 13],
    width: 2.6,
    limits: [R.x - 2, R.z - 2],
    hills: [{ at: [8, -13], len: 14, h: 1.5 }],
    hillMaterial: dirtMat,
    barrier: { colors: ['#6c7079'], thick: 0.6, hidden: true, wallHalf: 0.55 }, // solo colisión: las rocas son el dibujo
    chevrons: false,
  });
  trackRibbon(B, circuit, dirtMat, 0.15, 0.025);

  // ---------- Obstáculos (en orden de recorrido) ----------
  const K = crawlKit(B, circuit);
  K.steps(-29.8, 13);        // 1
  K.logPile(-10.1, 13);      // 2
  K.rampDouble(7.4, 13);     // 3
  K.coveredBridge(27.4, 13); // 4
  K.sandBank(59, 0);         // 5
  K.ford(31, -13);           // 6
  K.rockClimb(8, -13);       // 7
  K.rockGarden(-12.5, -13);  // 8
  K.tibetan(-33.6, -13);     // 9
  const T = K.finish();

  // salida / meta
  {
    const s0 = circuit.samples[0], yaw = circuit.yawOf(s0.t);
    for (const sd of [-1, 1]) { const p = s0.p.clone().addScaledVector(s0.n, sd * 1.55); B.cyl(0.12, 0.12, 2.2, p.x, 1.1, p.z, '#dddddd', { seg: 8, solid: false }); }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.7), new THREE.MeshBasicMaterial({ map: bannerTex('SALIDA · META'), side: THREE.DoubleSide }));
    banner.position.set(s0.p.x, 2.3, s0.p.z); banner.rotation.y = yaw + Math.PI;
    B.scene.add(banner);
  }

  // ---------- Decorado ----------
  rockWalls(B, circuit);
  rockField(B, circuit, { x0: -50, x1: 50, z0: -7, z1: 7, count: 34, rMin: 2.6, rMax: 5.2, hMin: 1.4, hMax: 2.6, away: 5, seed: 12 }); // montaña central
  rockField(B, circuit, { x0: -R.x + 3, x1: R.x - 3, z0: 22, z1: R.z - 2, count: 46, rMin: 3, rMax: 7, hMin: 1.1, hMax: 2.3, away: 4, seed: 21 });
  rockField(B, circuit, { x0: -R.x + 3, x1: R.x - 3, z0: -R.z + 2, z1: -22, count: 46, rMin: 3, rMax: 7, hMin: 1.1, hMax: 2.3, away: 4, seed: 22 });
  rockField(B, circuit, { x0: 63, x1: R.x - 2, z0: -22, z1: 22, count: 14, rMin: 3, rMax: 6, hMin: 1.1, hMax: 2, away: 4, seed: 23 });
  rockField(B, circuit, { x0: -R.x + 2, x1: -63, z0: -22, z1: 22, count: 14, rMin: 3, rMax: 6, hMin: 1.1, hMax: 2, away: 4, seed: 24 });
  pines(B, circuit, { x0: -52, x1: 52, z0: -8, z1: 8, count: 26, away: 6, seed: 4 });
  pines(B, circuit, { x0: -R.x + 4, x1: R.x - 4, z0: 18, z1: R.z - 3, count: 40, away: 7, seed: 5 });
  pines(B, circuit, { x0: -R.x + 4, x1: R.x - 4, z0: -R.z + 3, z1: -18, count: 40, away: 7, seed: 6 });

  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: R.h - 1 },
    zones: T.zones, hazards: T.hazards, gates: T.gates, safe: T.safe, pits: T.pits,
    step: T.step, update: T.update,
    dust: [0.7, 0.6, 0.45],
    lights: {
      background: '#0a1230',
      hemi: ['#c9d6ff', '#4a3a28', 0.75],
      sun: { color: '#fff1da', intensity: 3.1, offset: [16, 42, 22] },
      env: 0.4,
      points: [],
    },
  };
}

function bannerTex(text) { return bannerTexture(text, '#1565c0'); }
