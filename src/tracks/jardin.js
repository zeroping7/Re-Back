import * as THREE from 'three';
import { grassTexture, dirtTexture } from '../textures.js';
import { buildCircuit, startArch, trackRibbon, mat, BARRIER_GROUPS } from './common.js';

// Circuito 3: "El jardín". Al aire libre: camino de tierra, charco, rampa-tabla y árboles.
const AREA = { x: 72, z: 52 };

export default {
  id: 'jardin',
  name: 'El jardín',
  desc: 'Tierra, charcos, gnomos y un gran salto',
  color: '#7cb342',
  build,
};

function build(B) {
  const { scene, RAPIER, box, cyl, ball, collider } = B;
  const rnd = mulberry(31);

  // ---------- Suelo y cielo ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshStandardMaterial({ map: grassTexture([70, 70]), roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  collider(RAPIER.ColliderDesc.cuboid(AREA.x + 10, 1, AREA.z + 10), { x: 0, y: -1, z: 0 }, null, { friction: 0.9 });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#4a90e2') }, bottom: { value: new THREE.Color('#d8eefc') } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(0.0, 0.6, h)), 1.0); }',
  }));
  sky.userData.dynamic = true;
  scene.add(sky);
  // nubes
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true });
  for (let k = 0; k < 12; k++) {
    const a = rnd() * Math.PI * 2, d = 180 + rnd() * 120;
    for (let j = 0; j < 4; j++) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(10 + rnd() * 10, 0), cloudMat);
      c.position.set(Math.cos(a) * d + j * 12, 70 + rnd() * 30, Math.sin(a) * d + rnd() * 10);
      c.scale.y = 0.5;
      scene.add(c);
    }
  }

  // ---------- Valla ----------
  const plank = mat('#c9a06a');
  for (const [len, x, z, ry] of [[AREA.x * 2, 0, -AREA.z, 0], [AREA.x * 2, 0, AREA.z, 0], [AREA.z * 2, -AREA.x, 0, Math.PI / 2], [AREA.z * 2, AREA.x, 0, Math.PI / 2]]) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    const dir = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    for (let t = -len / 2; t < len / 2; t += 2.2) {
      const p = new THREE.Vector3(x, 0, z).addScaledVector(dir, t + 1.1);
      box(2, 12 + (Math.round(t / 2.2) % 2) * 0.8, 0.4, p.x, 6, p.z, plank, { rot: [0, ry, 0], solid: false });
    }
    box(len, 0.8, 0.5, x, 9, z, '#a77b46', { rot: [0, ry, 0], solid: false, shadow: false });
    box(len, 0.8, 0.5, x, 3, z, '#a77b46', { rot: [0, ry, 0], solid: false, shadow: false });
    collider(RAPIER.ColliderDesc.cuboid(len / 2, 10, 1), { x, y: 10, z }, q, { friction: 0.2, restitution: 0.3, groups: BARRIER_GROUPS });
  }
  // casa al fondo (fachada)
  box(90, 40, 4, -10, 20, -AREA.z - 6, '#f0d9b5', { solid: false });
  box(96, 3, 8, -10, 41, -AREA.z - 6, '#8d4e3a', { solid: false });
  for (const x of [-40, -20, 0, 20]) box(10, 12, 0.5, x, 22, -AREA.z - 3.8, '#9fd3f5', { solid: false, shadow: false });
  box(12, 18, 0.5, 26, 9, -AREA.z - 3.8, '#6d4c41', { solid: false, shadow: false });

  // ---------- Trazado ----------
  const circuit = buildCircuit(B, {
    points: [[-40, 30], [-10, 34], [20, 28], [45, 30], [60, 15], [58, -10], [42, -24], [24, -20], [6, -30], [-15, -38], [-38, -30], [-55, -15], [-58, 5], [-52, 22]],
    start: [-26, 32],
    width: 9,
    barrier: { colors: ['#8d6e63', '#795548', '#a1887f', '#6d4c41'], thick: 0.8, round: true, roughness: 0.9 },
  });
  const { sampleNear, yawOf } = circuit;
  const W = circuit.width;
  trackRibbon(B, circuit, new THREE.MeshStandardMaterial({ map: dirtTexture([1, 1]), roughness: 1 }), 0.8);
  startArch(B, circuit, { color: '#43a047', text: 'GRAN PREMIO JARDÍN' });

  // ---------- Rampa: tabla sobre un ladrillo ----------
  {
    const s = sampleNear(4, 32);
    const L = 9, H = 2.2, T = 0.5, Wd = W - 1.5, a = Math.asin(H / L), yaw = yawOf(s.t);
    const c = s.p.clone().addScaledVector(s.t, (L / 2) * Math.cos(a));
    box(Wd, T, L, c.x, H / 2 - (T / 2) * Math.cos(a), c.z, '#b98a52', { rot: [-a, yaw, 0], phys: { friction: 0.8 } });
    const back = s.p.clone().addScaledVector(s.t, L * Math.cos(a) - 1.2);
    box(Wd - 1, H - 0.4, 1.8, back.x, (H - 0.4) / 2, back.z, '#b5532f', { rot: [0, yaw, 0] });
  }

  // ---------- Charco (frena y salpica) ----------
  const zones = [];
  {
    const s = sampleNear(-20, -36);
    const p = s.p.clone().addScaledVector(s.n, 1);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5d8fb3', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.85 }));
    puddle.scale.set(4.5, 1, 3.2); puddle.rotation.y = yawOf(s.t);
    puddle.position.set(p.x, 0.04, p.z);
    scene.add(puddle);
    zones.push({ pos: p, r: 4.2, effect: 'wet' });
  }

  // ---------- Raíces (baches) ----------
  for (const [x, z] of [[58, 2], [57, -4]]) {
    const s = sampleNear(x, z);
    cyl(0.12, 0.15, W + 1, s.p.x, 0.07, s.p.z, '#5d4037', { seg: 6, rot: [0, yawOf(s.t), Math.PI / 2] });
  }

  // ---------- Árboles, rocas, flores ----------
  const trunkM = mat('#6d4c41'), leafA = mat('#3e8e41'), leafB = mat('#5aa832'), rockM = mat('#9e9e9e');
  const occupied = (x, z, r) => {
    const s = sampleNear(x, z);
    return Math.hypot(s.p.x - x, s.p.z - z) < W / 2 + 2 + r;
  };
  const tree = (x, z, sc = 1) => {
    if (occupied(x, z, 3 * sc)) return;
    cyl(0.9 * sc, 1.3 * sc, 10 * sc, x, 5 * sc, z, trunkM, { seg: 7 });
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry((5 - k) * sc, 0), k % 2 ? leafA : leafB);
      m.position.set(x + (rnd() - 0.5) * 2 * sc, (10 + k * 3.2) * sc, z + (rnd() - 0.5) * 2 * sc);
      m.castShadow = true;
      scene.add(m);
    }
  };
  for (let k = 0; k < 40; k++) {
    const x = (rnd() * 2 - 1) * (AREA.x - 6), z = (rnd() * 2 - 1) * (AREA.z - 6);
    if (rnd() < 0.45) tree(x, z, 0.7 + rnd() * 0.6);
    else if (!occupied(x, z, 2)) ball(1 + rnd() * 1.6, x, 0.4, z, rockM, { detail: 0 });
  }
  // flores (instanciadas)
  {
    const geo = new THREE.IcosahedronGeometry(0.45, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true }), 260);
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), cols = ['#ff5252', '#ffeb3b', '#ffffff', '#ba68c8', '#ff9800'];
    let n = 0;
    while (n < 260) {
      const x = (rnd() * 2 - 1) * (AREA.x - 3), z = (rnd() * 2 - 1) * (AREA.z - 3);
      if (occupied(x, z, 0.5)) continue;
      m4.makeTranslation(x, 0.6 + rnd() * 0.4, z);
      im.setMatrixAt(n, m4); im.setColorAt(n, col.set(cols[n % cols.length]));
      n++;
    }
    im.castShadow = true;
    scene.add(im);
  }

  // ---------- Gnomo gigante ----------
  {
    const x = 6, z = 4;
    cyl(2.2, 2.8, 5, x, 2.5, z, '#1e88e5', { seg: 8 });
    ball(2, x, 6.4, z, mat('#ffccbc'), { detail: 1, solid: false });
    const beard = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.5, 8), mat('#fafafa'));
    beard.position.set(x, 4.8, z + 1.2); beard.rotation.x = Math.PI; beard.castShadow = true; scene.add(beard);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(2.1, 5, 8), mat('#e53935'));
    hat.position.set(x, 9.8, z); hat.rotation.z = 0.15; hat.castShadow = true; scene.add(hat);
    ball(0.5, x, 6.3, z + 2, mat('#ff8a80'), { detail: 0, solid: false });
  }
  // regadera y manguera
  {
    cyl(2.5, 3, 5, -6, 2.5, -8, '#43a047', { seg: 12 });
    cyl(0.4, 0.5, 6, -9.5, 4.5, -8, '#43a047', { seg: 6, rot: [0, 0, 1.0], solid: false });
    const hose = new THREE.Mesh(new THREE.TorusGeometry(4, 0.35, 6, 24), mat('#43a047'));
    hose.rotation.x = Math.PI / 2; hose.position.set(-20, 0.35, 8); hose.castShadow = true; scene.add(hose);
    const hose2 = hose.clone(); hose2.scale.setScalar(0.7); hose2.position.y = 1.0; scene.add(hose2);
  }
  // estanque
  {
    const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2f78a8', roughness: 0.05, metalness: 0.5 }));
    pond.position.set(24, 0.05, 4); scene.add(pond);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      ball(1.2, 24 + Math.cos(a) * 9.5, 0.3, 4 + Math.sin(a) * 9.5, rockM, { detail: 0 });
    }
    collider(RAPIER.ColliderDesc.cylinder(1, 9), { x: 24, y: 0, z: 4 });
  }

  return {
    circuit,
    bounds: { x: AREA.x - 1.5, z: AREA.z - 1.5, h: 80 },
    itemSpots: [0.15, 0.42, 0.7],
    zones,
    dust: [0.6, 0.48, 0.34],
    lights: {
      background: '#bfe3ff',
      fog: ['#cfe8f7', 110, 360],
      hemi: ['#cfe8ff', '#4f7a32', 0.8],
      sun: { color: '#fff1d0', intensity: 3.4, offset: [30, 50, 18] },
      env: 0.35,
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
