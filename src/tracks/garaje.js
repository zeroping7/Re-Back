import { buildCircuit, startArch } from './common.js';
import { driftHall, driftVenue } from './driftkit.js';

// Drift: "El garaje nocturno" (DRI-08, DRI-09). Pista de drift RC de verdad: losetas, líneas pintadas, goma, zonas de clip,
// conos, neumáticos, tarima de pilotos, boxes y calle en miniatura.
const R = { x: 68, z: 48, h: 32 };
// DRI-08: trazado compacto (curvas más seguidas) y pista estrecha
const K = 0.7;
const k2 = ([x, z]) => [x * K, z * K];

export default {
  id: 'garaje', disc: 'drift',
  name: 'El garaje nocturno', short: 'Garaje',
  desc: 'Pista de drift de noche con neones y calle en miniatura',
  color: '#ff1f8e',
  medals: [2000, 4500, 8000],
  music: 'museo', ambient: 'salon',
  build,
};

function build(B) {
  const { floorMat, groundUV } = driftHall(B, R, { night: true });
  const circuit = buildCircuit(B, {
    points: [[-24, 42], [18, 36], [50, 42], [68, 28], [60, 8], [36, 6], [14, 18], [-8, 10], [-8, -6], [16, -18], [44, -14], [60, -18], [67, -30], [56, -43],
      [20, -42], [-6, -30], [-28, -42], [-56, -44], [-70, -30], [-66, -15], [-50, -12], [-39, -5], [-36, 4], [-40, 13], [-51, 19], [-65, 21], [-73, 31], [-62, 41]].map(k2),
    start: k2([-44, 40]),
    width: 5.5,
    limits: [R.x - 2, R.z - 2],
    hillMaterial: floorMat, groundUV,
    barrier: { colors: ['#f5f5f5', '#212121'], height: 0.45, thick: 0.35, roughness: 0.5 },
    chevrons: { bg: '#ff1f8e', fg: '#ffffff', max: 6 },
  });
  startArch(B, circuit, { color: '#ff1f8e', text: 'NOCHE DE DRIFT' });
  const V = driftVenue(B, circuit, R, { theme: 'night', seed: 23 });

  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: R.h - 1 },
    zones: [],
    clips: V.clips,
    update: V.update,
    dust: [0.6, 0.62, 0.66],
    lights: {
      background: '#0b0d12',
      hemi: ['#8fa4c8', '#2a2230', 0.45],
      sun: { color: '#cfd8ff', intensity: 1.6, offset: [-14, 34, 20] },
      env: 0.3,
      points: [{ color: '#ff4fb0', intensity: 220, distance: 80, decay: 1.4, pos: [-20, 22, 0] }, { color: '#4fe3ff', intensity: 220, distance: 80, decay: 1.4, pos: [24, 22, 0] }],
    },
  };
}
