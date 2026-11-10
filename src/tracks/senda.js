import * as THREE from 'three';
import { groundTex } from '../textures.js';
import { buildCircuit, startArch } from './common.js';
import { indoor, windowWall } from './kit.js';
import { crawlKit } from './crawlkit.js';

// Obstáculos 2.0 (CRW-08): prototipo del parque de crawlers. Escalones, puente de troncos y pasarela estrecha.
const R = { x: 60, z: 40, h: 30 };

export default {
  id: 'senda', disc: 'obst',
  name: 'El tapete de pruebas', short: 'Tapete',
  desc: 'Escalones, puente de troncos y pasarela',
  color: '#8d6e3f',
  medals: [75, 60, 50],
  music: 'parque', ambient: 'salon',
  build,
};

function build(B) {
  const { floorMat, groundUV } = indoor(B, R, { floor: 'grass', repeat: [8, 5], color: '#b5a37a', roughness: 0.95, wall: '#d9d2c3' });
  windowWall(B, R, 0, 30);
  const circuit = buildCircuit(B, {
    points: [[-34, 22], [-8, 24], [18, 22], [36, 14], [38, -2], [22, -12], [2, -8], [-16, -14], [-34, -10], [-42, 4]],
    start: [-26, 23],
    width: 6,
    limits: [R.x - 2, R.z - 2],
    hillMaterial: floorMat, groundUV,
    barrier: { colors: ['#8d6e3f', '#d7c49e'], thick: 0.5, round: true, roughness: 0.9 },
    chevrons: false,
  });
  startArch(B, circuit, { color: '#6d4c41', text: 'PARQUE CRAWLER' });
  const K = crawlKit(B, circuit);
  K.steps(0.2);
  K.logBridge(0.45);
  K.walkway(0.72);
  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: R.h - 1 },
    zones: K.zones, hazards: K.hazards.filter((h) => h.r > 0),
    step: K.step, update: K.update,
    dust: [0.7, 0.6, 0.45],
    lights: {
      background: '#1b1d2a',
      hemi: ['#e8f0ff', '#8a6a4a', 0.6],
      sun: { color: '#fff0d6', intensity: 3, offset: [12, 34, -24] },
      env: 0.4,
      points: [],
    },
  };
}
