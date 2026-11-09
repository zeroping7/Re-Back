import * as THREE from 'three';
import { groundTex, surfaceTex, labelTexture } from '../textures.js';
import { buildCircuit, startArch, room, mat, trackPatch, autoBoosts } from './common.js';

// Circuito 4: "Museo de noche" (CIR-20). Mármol pulido, vitrinas, columnas y un dinosaurio gigante.
const ROOM = { x: 74, z: 50, h: 44 };

export default {
  id: 'museo',
  name: 'Museo de noche',
  short: 'Museo',
  desc: 'Mármol brillante, vitrinas y un dinosaurio',
  color: '#5c6bc0',
  build,
};

function build(B) {
  const { scene, box, cyl, ball, RAPIER, collider } = B;
  const rnd = mulberry(55);
  const anim = [];

  // ---------- Sala ----------
  const mb = groundTex('marble', [36, 24]);
  const floorMat = new THREE.MeshStandardMaterial({ map: mb.map, normalMap: mb.normalMap, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.08, metalness: 0.1 });
  const groundUV = (x, z) => [(x + ROOM.x) / (ROOM.x * 2), (ROOM.z - z) / (ROOM.z * 2)];
  room(B, { ...ROOM, floor: floorMat, wall: new THREE.MeshStandardMaterial({ color: '#3a2f45', roughness: 0.85 }), ceil: '#1c1a24', baseboard: '#c9a86a' });
  // friso dorado y cuadros con luz
  for (const [len, x, z, ry] of [[ROOM.x * 2, 0, -ROOM.z + 0.15, 0], [ROOM.x * 2, 0, ROOM.z - 0.15, Math.PI], [ROOM.z * 2, -ROOM.x + 0.15, 0, Math.PI / 2], [ROOM.z * 2, ROOM.x - 0.15, 0, -Math.PI / 2]]) {
    box(len, 1, 0.3, x, 30, z, '#c9a86a', { rot: [0, ry, 0], solid: false, shadow: false });
  }
  const paintCols = ['#2b6cb0', '#c05621', '#2f855a', '#b83280', '#d69e2e'];
  for (let k = 0; k < 6; k++) {
    const x = -55 + k * 22;
    box(12, 9, 0.5, x, 17, -ROOM.z + 0.3, '#b7924a', { solid: false });
    const art = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 7.4), new THREE.MeshStandardMaterial({ map: artTexture(paintCols[k % 5], k), roughness: 0.6 }));
    art.position.set(x, 17, -ROOM.z + 0.6); scene.add(art);
    box(1.6, 0.4, 1.2, x, 22.5, -ROOM.z + 1, '#222', { solid: false, shadow: false });
  }
  // claraboyas con luz de luna
  const moon = new THREE.MeshBasicMaterial({ color: '#9fb6ff' });
  for (const x of [-40, 0, 40]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), moon); m.rotation.x = Math.PI / 2; m.position.set(x, ROOM.h - 0.1, 0); scene.add(m); }
  // columnas en las esquinas de la sala
  for (const [x, z] of [[-68, -44], [68, -44], [-68, 44], [68, 44]]) {
    cyl(2.4, 2.6, ROOM.h, x, ROOM.h / 2, z, '#e9e4d8', { seg: 16 });
    box(6, 1.4, 6, x, 0.7, z, '#d8d0bf', { solid: false });
  }

  // ---------- Trazado ----------
  const carpet = new THREE.MeshStandardMaterial({ color: '#8b1e2d', roughness: 0.9 });
  const circuit = buildCircuit(B, {
    points: [[-50, 36], [-20, 38], [10, 37], [38, 38], [56, 30], [62, 14], [54, 2], [40, 4], [30, 14], [16, 18], [4, 10], [8, -4], [24, -10], [44, -14],
      [58, -24], [54, -38], [34, -40], [12, -36], [-6, -40], [-26, -38], [-40, -28], [-36, -14], [-20, -10], [-14, 4], [-28, 14], [-46, 8], [-60, 12], [-62, 26]],
    start: [-36, 37],
    width: 7,
    limits: [ROOM.x - 1, ROOM.z - 1],
    hills: [{ frac: 0.3, len: 26, h: 1.3 }, { frac: 0.7, len: 36, h: 1.0, double: true }],
    ramps: [{ frac: 0.52, len: 9, h: 1.9 }],
    hillMaterial: floorMat,
    rampMaterial: carpet,
    groundUV,
    barrier: { colors: ['#c9a86a', '#2a2a2a'], thick: 0.5, height: 0.7 },
    chevrons: { bg: '#2a2a2a', fg: '#ffd166' },
  });
  const W = circuit.width;
  const { samples, yawOf, spot, sampleNear } = circuit;

  // ---------- Zonas: cera recién dada y turbos ----------
  const zones = [];
  const wax = surfaceTex('wax', [1, 3]);
  const curvy = (f0, f1) => { let best = circuit.at(f0), br = Infinity; for (let f = f0; f < f1; f += 0.005) { const i = circuit.at(f); const r = circuit.minRadius(i, 3, 3); if (r < br) { br = r; best = i; } } return samples[best].p; };
  for (const [f0, f1] of [[0.12, 0.2], [0.82, 0.9]]) {
    const p = curvy(f0, f1);
    zones.push(trackPatch(B, circuit, [p.x, p.z], 18, 'slide', { ...wax, color: '#ffffff', opacity: 1, roughness: 1, metalness: 0.1, surface: 'wax' }));
  }
  zones.push(...autoBoosts(B, circuit, 2, zones.map((z) => [z.from, z.to])));
  startArch(B, circuit, { color: '#5c6bc0', text: 'NOCHE EN EL MUSEO' });

  // ---------- Dinosaurio (esqueleto low-poly) en el centro ----------
  {
    const [dx, dz] = spot(-2, -24, 12) || spot(0, 24, 12) || [0, -24];
    const bone = new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.6 });
    const g = new THREE.Group();
    const add = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, bone); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
    // columna vertebral y costillas
    for (let k = 0; k < 14; k++) {
      const u = k / 13, x = -9 + u * 18, y = 9 + Math.sin(u * Math.PI) * 2.5 - u * 1.5;
      add(new THREE.SphereGeometry(0.7 - u * 0.25, 6, 5), x, y, 0);
      if (k > 3 && k < 10) add(new THREE.TorusGeometry(1.8 - Math.abs(k - 6.5) * 0.2, 0.14, 4, 10, Math.PI), x, y - 0.2, 0, 0, Math.PI / 2, Math.PI);
    }
    // cola y cráneo
    for (let k = 0; k < 8; k++) add(new THREE.SphereGeometry(0.45 - k * 0.04, 5, 4), -9 - k * 1.3, 8.5 - k * 0.6, 0);
    const skull = add(new THREE.BoxGeometry(4, 2.2, 1.8), 10.8, 10.5, 0, 0, 0, -0.15);
    add(new THREE.BoxGeometry(3, 0.6, 1.5), 11.2, 9.2, 0, 0, 0, 0.1);
    for (const sd of [0.95, -0.95]) add(new THREE.SphereGeometry(0.35, 6, 4), 11.2, 11, sd).material = mat('#111');
    // patas
    for (const [x, sd] of [[-5, 1], [-5, -1], [5, 1], [5, -1]]) {
      add(new THREE.CylinderGeometry(0.4, 0.35, 4.5, 6), x, 6, sd * 1.4, 0, 0, 0.15);
      add(new THREE.CylinderGeometry(0.35, 0.3, 4.5, 6), x + 0.6, 2.2, sd * 1.4, 0, 0, -0.2);
      add(new THREE.BoxGeometry(1.6, 0.3, 0.8), x + 1, 0.15, sd * 1.4);
    }
    g.scale.setScalar(0.62);
    g.position.set(dx, 0.8, dz); g.rotation.y = rnd() * Math.PI;
    scene.add(g);
    box(17, 0.8, 6, dx, 0.4, dz, '#2b2b33', { rot: [0, g.rotation.y, 0] });
    void skull;
  }

  // ---------- Vitrinas con piezas y luz propia ----------
  const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.18, roughness: 0.02, metalness: 0, clearcoat: 1, depthWrite: false });
  const relics = ['#d4af37', '#4fd1c5', '#e53e3e', '#9f7aea'];
  const cases = [[-42, -6], [26, -26], [-6, 24], [36, 24], [-56, -36]];
  cases.forEach(([x0, z0], k) => {
    const pos = spot(x0, z0, 5);
    if (!pos) return;
    const [x, z] = pos;
    box(6, 3, 6, x, 1.5, z, '#262630');
    const gl = new THREE.Mesh(new THREE.BoxGeometry(5.6, 5, 5.6), glass);
    gl.position.set(x, 5.5, z); gl.renderOrder = 2; scene.add(gl);
    const relic = new THREE.Mesh(k % 2 ? new THREE.OctahedronGeometry(1.4, 0) : new THREE.TorusKnotGeometry(0.9, 0.3, 40, 6), new THREE.MeshStandardMaterial({ color: relics[k % 4], metalness: 0.8, roughness: 0.2, emissive: relics[k % 4], emissiveIntensity: 0.25 }));
    relic.position.set(x, 5.4, z); relic.userData.dynamic = true; scene.add(relic);
    anim.push((t) => { relic.rotation.y = t * 0.8 + k; relic.position.y = 5.4 + Math.sin(t * 1.4 + k) * 0.25; });
    // cordón de seguridad
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) cyl(0.18, 0.25, 2.4, x + a * 4.5, 1.2, z + b * 4.5, '#c9a86a', { seg: 6, solid: false });
  });

  // ---------- Foco del vigilante que barre la sala ----------
  const guard = new THREE.SpotLight('#fff3c4', 900, 140, 0.18, 0.5, 1.2);
  guard.position.set(0, ROOM.h - 4, ROOM.z - 6);
  guard.castShadow = false;
  scene.add(guard, guard.target);
  guard.userData.dynamic = true;
  const beam = new THREE.Mesh(new THREE.ConeGeometry(6, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6d0', transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }));
  beam.userData.dynamic = true; scene.add(beam);
  anim.push((t) => {
    const a = t * 0.35;
    guard.target.position.set(Math.sin(a) * 50, 0, Math.cos(a * 0.7) * 30);
    const dir = guard.target.position.clone().sub(guard.position);
    beam.position.copy(guard.position).addScaledVector(dir, 0.5);
    beam.lookAt(guard.target.position); beam.rotateX(-Math.PI / 2);
    beam.scale.set(1, dir.length() / 40, 1);
  });
  // linterna del vigilante en la pared (decoración)
  cyl(1.2, 1.6, 3, 0, ROOM.h - 4, ROOM.z - 4, '#333', { rot: [Math.PI / 2, 0, 0], solid: false });

  // ---------- Bustos y cartel ----------
  for (const [x0, z0] of [[50, -2], [-24, 2]]) {
    const pos = spot(x0, z0, 3);
    if (!pos) continue;
    const [x, z] = pos;
    cyl(1.6, 1.8, 5, x, 2.5, z, '#e9e4d8', { seg: 10 });
    ball(1.4, x, 6.6, z, '#e9e4d8', { solid: false });
  }
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(18, 6), new THREE.MeshStandardMaterial({ map: labelTexture(['MUSEO', 'sala de dinosaurios'], '#3c366b'), emissive: '#ffffff', emissiveIntensity: 0.2, emissiveMap: labelTexture(['MUSEO', 'sala de dinosaurios'], '#3c366b') }));
    m.position.set(0, 25, -ROOM.z + 0.4); scene.add(m);
  }
  void sampleNear; void yawOf; void RAPIER; void collider; void W;

  return {
    circuit,
    update: (t) => { for (const f of anim) f(t); },
    bounds: { x: ROOM.x - 1.5, z: ROOM.z - 1.5, h: ROOM.h - 1 },
    itemSpots: [0.28, 0.66],
    zones,
    dust: [0.75, 0.75, 0.8],
    lights: {
      background: '#0e0d18',
      hemi: ['#6f7cff', '#2a2030', 0.45],
      sun: { color: '#a9b8ff', intensity: 1.6, offset: [-10, 40, 14] },
      env: 0.28,
      points: [
        { color: '#ffcf88', intensity: 160, distance: 60, decay: 1.4, pos: [-40, 16, -20] },
        { color: '#ffcf88', intensity: 160, distance: 60, decay: 1.4, pos: [40, 16, 20] },
        { color: '#88c8ff', intensity: 120, distance: 60, decay: 1.4, pos: [0, 16, 0] },
      ],
    },
  };
}

// cuadro abstracto
function artTexture(color, seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 180;
  const g = c.getContext('2d'), r = mulberry(seed * 13 + 1);
  g.fillStyle = color; g.fillRect(0, 0, 256, 180);
  for (let k = 0; k < 9; k++) {
    g.fillStyle = `hsl(${Math.floor(r() * 360)}, 60%, ${40 + r() * 30}%)`;
    if (r() > 0.5) { g.beginPath(); g.arc(r() * 256, r() * 180, 10 + r() * 50, 0, 7); g.fill(); } else g.fillRect(r() * 256, r() * 180, 20 + r() * 80, 10 + r() * 60);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
