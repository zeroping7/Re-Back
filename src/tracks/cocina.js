import { buildCircuit, startArch } from './common.js';
import { driftHall, driftVenue } from './driftkit.js';

// Drift: "El club de drift" (DRI-08, DRI-09). Pista de drift RC de verdad: losetas, líneas pintadas, goma, zonas de clip,
// conos, neumáticos, tarima de pilotos, boxes y calle en miniatura.
const R = { x: 60, z: 48, h: 34 };
// DRI-08: trazado compacto (curvas más seguidas) y pista estrecha
const K = 0.7;
const k2 = ([x, z]) => [x * K, z * K];

export default {
  id: 'cocina', disc: 'drift',
  name: 'El club de drift', short: 'Club',
  desc: 'Nave con losetas, clips y pilotos en la tarima',
  color: '#ff3d00',
  medals: [2500, 5500, 9000],
  music: 'super', ambient: 'salon',
  build,
};

function build(B) {
  const { floorMat, groundUV } = driftHall(B, R, { night: false });
  const circuit = buildCircuit(B, {
    points: [[-48, 36], [-28, 38], [-6, 32], [16, 38], [40, 36], [58, 26], [60, 8], [46, -4], [26, 2], [8, 12], [-10, 4], [-6, -14], [16, -24], [38, -24],
      [52, -22], [61, -30], [58, -41], [44, -45], [14, -42], [-14, -36], [-38, -42], [-56, -38], [-63, -26], [-58, -14], [-47, -8], [-42, 2], [-47, 12], [-58, 17], [-64, 26], [-60, 34]].map(k2),
    start: k2([-40, 36]),
    width: 6.6,
    limits: [R.x - 2, R.z - 2],
    hillMaterial: floorMat, groundUV,
    barrier: { colors: ['#fafafa', '#fafafa', '#fafafa', '#e53935'], height: 0.45, thick: 0.35, roughness: 0.5 },
    chevrons: { bg: '#ff3d00', fg: '#ffffff', max: 6 },
  });
  startArch(B, circuit, { color: '#ff3d00', text: 'CLUB DE DRIFT RC' });
  const V = driftVenue(B, circuit, R, { theme: 'club', seed: 7 });

  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: R.h - 1 },
    zones: [],
    clips: V.clips,
    update: V.update,
    dust: [0.86, 0.88, 0.9],
    lights: {
      background: '#20242a',
      hemi: ['#f2f6ff', '#6d7377', 0.75],
      sun: { color: '#ffffff', intensity: 2.6, offset: [10, 36, -24] },
      env: 0.5,
      points: [{ color: '#ffffff', intensity: 200, distance: 80, decay: 1.4, pos: [0, 28, 0] }],
    },
  };
}
