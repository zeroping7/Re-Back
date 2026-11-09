import * as THREE from 'three';
import { buildCircuit, startArch, mat } from './common.js';
import { indoor, placer, mulberry } from './kit.js';

// Drift 2: "El garaje" (DRI-08). Cemento pulido, manchas de aceite, neumáticos y un coche de verdad aparcado.
const R = { x: 68, z: 48, h: 32 };
// DRI-08: trazado compacto (curvas más seguidas) y pista estrecha
const K = 0.7;
const k2 = ([x, z]) => [x * K, z * K];

export default {
  id: 'garaje', disc: 'drift',
  name: 'El garaje', short: 'Garaje',
  desc: 'Cemento pulido, horquillas y neumáticos',
  color: '#ffb300',
  medals: [1200, 3000, 5500],
  music: 'museo', ambient: 'salon',
  build,
};

function build(B) {
  const { scene, box, cyl } = B;
  const rnd = mulberry(23);
  const { floorMat, groundUV } = indoor(B, R, { floor: 'marble', repeat: [9, 6], color: '#8d9499', roughness: 0.22, wall: '#b8b3a8', baseboard: null });

  const circuit = buildCircuit(B, {
    points: [[-24, 42], [18, 36], [50, 42], [68, 28], [60, 8], [36, 6], [14, 18], [-8, 10], [-8, -6], [16, -18], [44, -14], [60, -18], [67, -30], [56, -43],
      [20, -42], [-6, -30], [-28, -42], [-56, -44], [-70, -30], [-66, -15], [-50, -12], [-39, -5], [-36, 4], [-40, 13], [-51, 19], [-65, 21], [-73, 31], [-62, 41]].map(k2),
    start: k2([-44, 40]),
    width: 5.5,
    limits: [R.x - 2, R.z - 2],
    hillMaterial: floorMat, groundUV,
    barrier: { colors: ['#ffb300', '#212121'], thick: 0.7, roughness: 0.6 },
    chevrons: { bg: '#f57f17', fg: '#111111', max: 6 },
  });
  startArch(B, circuit, { color: '#ff8f00', text: 'GARAJE DRIFT' });
  const put = placer(circuit);

  // manchas de aceite pintadas en el suelo (solo aspecto)
  const stain = new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (let k = 0; k < 9; k++) {
    const s = circuit.samples[Math.floor(rnd() * circuit.N)];
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.5 + rnd() * 2, 12).rotateX(-Math.PI / 2), stain);
    m.position.set(s.p.x + (rnd() - 0.5) * 6, 0.04, s.p.z + (rnd() - 0.5) * 6); m.scale.z = 0.6 + rnd() * 0.6; m.userData.dynamic = true; scene.add(m);
  }

  // ---------- Decorado: coche aparcado (solo ruedas y bajos), neumáticos, bidones, banco de trabajo ----------
  const tyre = (x, y, z, r = 3.4, flat = false) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.38, 8, 18), mat('#1b1b1b', { roughness: 0.95 }));
    m.position.set(x, y, z); if (flat) m.rotation.x = Math.PI / 2; m.castShadow = true; scene.add(m);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, r * 0.5, 14), mat('#b0bec5', { metalness: 0.7, roughness: 0.3 }));
    rim.position.set(x, y, z); if (!flat) rim.rotation.x = Math.PI / 2; scene.add(rim);
  };
  for (const [x, z] of [[-30, -18], [36, -26], [-44, 28], [40, 22], [2, 30]]) {
    put(x, z, 5, (px, pz) => { tyre(px, 1.3, pz, 3.2, true); tyre(px, 3.9, pz, 3.2, true); B.collider(B.RAPIER.ColliderDesc.cylinder(2.6, 4.4), { x: px, y: 2.6, z: pz }); });
  }
  for (const [x, z, c] of [[-14, -12], [30, -2], [-40, -28], [56, -8]].map((p, k) => [...p, ['#c62828', '#1565c0', '#2e7d32', '#f9a825'][k]])) {
    put(x, z, 3, (px, pz) => { cyl(2.2, 2.2, 6.4, px, 3.2, pz, c, { seg: 14 }); for (const y of [1.6, 4.8]) cyl(2.28, 2.28, 0.3, px, y, pz, '#eceff1', { seg: 14, solid: false }); });
  }
  // banco de trabajo y estantes
  box(50, 12, 8, 0, 6, -R.z + 5, '#5d4037');
  box(52, 1, 9, 0, 12.5, -R.z + 5, '#8d6e63', { solid: false });
  for (let k = 0; k < 6; k++) box(3 + rnd() * 3, 2 + rnd() * 3, 3, -20 + k * 8, 14.5, -R.z + 5, ['#e53935', '#fdd835', '#1e88e5', '#43a047'][k % 4], { solid: false });
  box(8, 26, 40, R.x - 5, 13, 0, '#455a64');
  for (const y of [8, 16, 24]) box(9, 0.6, 41, R.x - 5.2, y, 0, '#263238', { solid: false });
  // puerta del garaje (franjas) al fondo
  for (let k = 0; k < 7; k++) box(46, 3.4, 0.4, -40, 2 + k * 3.6, R.z - 0.4, k % 2 ? '#cfd8dc' : '#b0bec5', { solid: false, shadow: false });

  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: R.h - 1 },
    zones: [],
    dust: [0.75, 0.75, 0.74],
    lights: {
      background: '#14161a',
      hemi: ['#dfe6ee', '#55504a', 0.5],
      sun: { color: '#fff0d0', intensity: 2.6, offset: [-14, 34, 20] },
      env: 0.45,
      points: [{ color: '#ffe2a8', intensity: 260, distance: 90, decay: 1.4, pos: [-20, 28, 0] }, { color: '#ffe2a8', intensity: 260, distance: 90, decay: 1.4, pos: [30, 28, 0] }],
    },
  };
}
