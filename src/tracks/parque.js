import * as THREE from 'three';
import { groundTex, surfaceTex } from '../textures.js';
import { buildCircuit, startArch, trackRibbon, mat, BARRIER_GROUPS, trackPatch, autoBoosts } from './common.js';

// Circuito 6: "Parque infantil" (CIR-22). Caucho de colores, areneros, tobogán-rampa, columpios y balancín.
const AREA = { x: 84, z: 56 };

export default {
  id: 'parque',
  name: 'Parque infantil',
  short: 'Parque',
  desc: 'Tobogán-rampa, arena y columpios',
  color: '#ffb300',
  build,
};

function build(B) {
  const { scene, RAPIER, box, cyl, ball, collider } = B;
  const rnd = mulberry(17);
  const anim = [];

  // ---------- Césped, cielo y valla ----------
  const gr = groundTex('grass', [100, 100]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), new THREE.MeshStandardMaterial({ map: gr.map, normalMap: gr.normalMap, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  collider(RAPIER.ColliderDesc.cuboid(AREA.x + 10, 1, AREA.z + 10), { x: 0, y: -1, z: 0 }, null, { friction: 0.9 });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#3d8fe0') }, bottom: { value: new THREE.Color('#e2f3ff') } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(0.0, 0.6, h)), 1.0); }',
  }));
  sky.userData.dynamic = true; scene.add(sky);
  const fenceCols = ['#e53935', '#fdd835', '#1e88e5', '#43a047'];
  for (const [len, x, z, ry] of [[AREA.x * 2, 0, -AREA.z, 0], [AREA.x * 2, 0, AREA.z, 0], [AREA.z * 2, -AREA.x, 0, Math.PI / 2], [AREA.z * 2, AREA.x, 0, Math.PI / 2]]) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    const dir = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    let k = 0;
    for (let t = -len / 2; t < len / 2; t += 3, k++) {
      const p = new THREE.Vector3(x, 0, z).addScaledVector(dir, t + 1.5);
      cyl(0.6, 0.6, 7, p.x, 3.5, p.z, fenceCols[k % 4], { seg: 6, solid: false });
      ball(0.7, p.x, 7.2, p.z, fenceCols[(k + 2) % 4], { detail: 0, solid: false });
    }
    box(len, 0.6, 0.4, x, 5.5, z, '#f5f5f5', { rot: [0, ry, 0], solid: false, shadow: false });
    collider(RAPIER.ColliderDesc.cuboid(len / 2, 10, 1), { x, y: 10, z }, q, { friction: 0.05, restitution: 0.5, groups: BARRIER_GROUPS });
  }
  // árboles alrededor (fuera de la valla)
  const trunkM = mat('#6d4c41'), leafM = [mat('#43a047'), mat('#66bb6a'), mat('#2e7d32')];
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2, d = 1.12 + rnd() * 0.15;
    const x = Math.cos(a) * AREA.x * d * 1.05, z = Math.sin(a) * AREA.z * d * 1.15;
    cyl(1.2, 1.6, 12, x, 6, z, trunkM, { seg: 6, solid: false });
    ball(6 + rnd() * 3, x, 15 + rnd() * 3, z, leafM[k % 3], { detail: 0, solid: false });
  }

  // ---------- Trazado sobre losetas de caucho ----------
  const rb = groundTex('rubber', [1, 1]);
  const rubberMat = new THREE.MeshStandardMaterial({ map: rb.map, normalMap: rb.normalMap, roughness: 0.92 });
  const slideMat = new THREE.MeshStandardMaterial({ color: '#ff7043', roughness: 0.25, metalness: 0.05 });
  const circuit = buildCircuit(B, {
    points: [[-62, 38], [-36, 42], [-12, 36], [8, 42], [32, 40], [56, 44], [70, 30], [64, 14], [48, 16], [36, 4], [44, -10], [62, -14], [68, -30], [54, -44],
      [30, -40], [10, -30], [-4, -42], [-24, -44], [-40, -34], [-34, -18], [-16, -12], [-12, 4], [-28, 14], [-46, 8], [-58, -6], [-72, 0], [-72, 22]],
    start: [-50, 40],
    width: 7,
    limits: [AREA.x - 2, AREA.z - 2],
    hills: [{ frac: 0.4, len: 30, h: 1.5 }, { frac: 0.7, len: 26, h: 1.2 }, { frac: 0.9, len: 34, h: 0.9, double: true }],
    ramps: [{ frac: 0.2, len: 10, h: 2.1 }],
    hillMaterial: rubberMat,
    rampMaterial: slideMat,
    barrier: { colors: ['#e53935', '#fdd835', '#1e88e5', '#43a047'], thick: 0.7, round: true, roughness: 0.5 },
    chevrons: { bg: '#1e88e5', fg: '#ffffff' },
  });
  const W = circuit.width;
  const { samples, spot, yawOf } = circuit;
  trackRibbon(B, circuit, rubberMat, 0.8);
  startArch(B, circuit, { color: '#ffb300', text: 'GRAN PREMIO DEL PARQUE' });

  // tobogán: barandillas y escalera junto a la rampa
  {
    const rp = circuit.elev.find((e) => e.kind === 'ramp');
    if (rp) {
      const top = samples[rp.top];
      for (const sd of [1, -1]) {
        const p = top.p.clone().addScaledVector(top.n, sd * (W / 2 + 1.4));
        cyl(0.35, 0.35, 8, p.x, 4, p.z, '#1e88e5', { seg: 6, solid: false });
      }
      const p = top.p.clone().addScaledVector(top.t, 2.5);
      box(W + 3, 0.5, 3, p.x, 6.5, p.z, '#fdd835', { rot: [0, yawOf(top.t), 0], solid: false });
    }
  }

  // ---------- Zonas: areneros (derrapan), charco y turbos ----------
  const zones = [];
  const sand = surfaceTex('sand', [1, 2]);
  const curvy = (f0, f1) => { let best = circuit.at(f0), br = Infinity; for (let f = f0; f < f1; f += 0.005) { const i = circuit.at(f); const r = circuit.minRadius(i, 3, 3); if (r < br) { br = r; best = i; } } return samples[best].p; };
  for (const [f0, f1] of [[0.26, 0.34], [0.52, 0.6], [0.78, 0.86]]) {
    const p = curvy(f0, f1);
    zones.push(trackPatch(B, circuit, [p.x, p.z], 20, 'slide', { ...sand, color: '#ffffff', opacity: 1, roughness: 1, metalness: 0, normalScale: 1.2, inset: 0.1, surface: 'sand' }));
  }
  zones.push(...autoBoosts(B, circuit, 2, zones.map((z) => [z.from, z.to])));

  // ---------- Arenero grande con cubo y pala ----------
  {
    const [x, z] = spot(10, 4, 11) || [10, 4];
    const st = groundTex('sand', [3, 3]);
    const sandM = new THREE.MeshStandardMaterial({ map: st.map, normalMap: st.normalMap, roughness: 1 });
    const pit = new THREE.Mesh(new THREE.CircleGeometry(9, 28).rotateX(-Math.PI / 2), sandM);
    pit.position.set(x, 0.05, z); pit.receiveShadow = true; scene.add(pit);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; box(4.8, 1.2, 1, x + Math.cos(a) * 9.2, 0.6, z + Math.sin(a) * 9.2, '#a1887f', { rot: [0, -a + Math.PI / 2, 0], solid: false }); }
    cyl(1.6, 1.2, 2.6, x - 3, 1.3, z + 2, '#e53935', { seg: 12 });
    const castle = [[2, 1], [4, 0], [3, 3]];
    for (const [cx, cz] of castle) cyl(1.3, 1.6, 2.4, x + cx, 1.2, z + cz, '#e2c48c', { seg: 8, solid: false });
    box(0.4, 0.2, 5, x - 1, 0.6, z - 3, '#1e88e5', { rot: [0, 0.6, 0.3], solid: false });
  }

  // ---------- Columpios ----------
  {
    const [x, z] = spot(-46, -8, 9) || spot(-50, 24, 9) || [-46, -8];
    const frame = '#1e88e5';
    for (const sd of [-1, 1]) {
      box(0.6, 14, 0.6, x + sd * 8, 7, z - 2.5, frame, { rot: [0.18, 0, 0] });
      box(0.6, 14, 0.6, x + sd * 8, 7, z + 2.5, frame, { rot: [-0.18, 0, 0] });
    }
    box(17, 0.7, 0.7, x, 13.8, z, frame, { solid: false });
    for (const [k, sx] of [[0, -3.5], [1, 3.5]]) {
      const g = new THREE.Group();
      for (const cz of [-0.9, 0.9]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 10, 4), mat('#9e9e9e')); c.position.set(0, -5, cz); g.add(c); }
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 2.2), mat(k ? '#fdd835' : '#e53935')); seat.position.y = -10; seat.castShadow = true; g.add(seat);
      g.position.set(x + sx, 13.6, z);
      g.traverse((o) => { o.userData.dynamic = true; });
      scene.add(g);
      anim.push((t) => { g.rotation.x = Math.sin(t * 1.6 + k * 1.3) * 0.45; });
    }
  }

  // ---------- Balancín ----------
  {
    const [x, z] = spot(46, -28, 7) || [46, -28];
    cyl(0.8, 1, 2.2, x, 1.1, z, '#43a047', { seg: 8 });
    const beam = new THREE.Group();
    const plank = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 1.4), mat('#fdd835')); plank.castShadow = true; beam.add(plank);
    for (const sd of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 4, 10), mat('#e53935')); h.position.set(sd * 5.2, 0.8, 0); beam.add(h); }
    beam.position.set(x, 2.3, z); beam.rotation.y = rnd() * 3;
    beam.traverse((o) => { o.userData.dynamic = true; });
    scene.add(beam);
    anim.push((t) => { beam.rotation.z = Math.sin(t * 1.2) * 0.25; });
  }

  // ---------- Tiovivo que gira ----------
  {
    const [x, z] = spot(-20, 26, 7) || [-20, 26];
    cyl(6, 6, 0.8, x, 0.4, z, '#9e9e9e', { seg: 20 });
    const top = new THREE.Group();
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.4, 20), mat('#e53935')); disk.position.y = 1; top.add(disk);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.5, 5), mat('#fdd835'));
      bar.position.set(Math.cos(a) * 4.5, 2.8, Math.sin(a) * 4.5); top.add(bar);
    }
    top.position.set(x, 0, z);
    top.traverse((o) => { o.userData.dynamic = true; });
    scene.add(top);
    anim.push((t) => { top.rotation.y = t * 0.9; });
  }

  // ---------- Balones sueltos y banco ----------
  for (const f of [0.1, 0.62]) {
    const s = samples[circuit.at(f)];
    const p = s.p.clone().addScaledVector(s.n, 0.35 * W / 2);
    B.dynBall(1.3, p.x, p.y + 1.4, p.z, f < 0.5 ? '#e53935' : '#1e88e5', { density: 0.02 });
  }
  {
    const pos = spot(30, 26, 5);
    if (pos) {
      const [x, z] = pos;
      box(9, 0.5, 2.4, x, 2.4, z, '#8d6e63');
      box(9, 2.2, 0.4, x, 3.8, z - 1.1, '#8d6e63', { solid: false });
      for (const sd of [-1, 1]) box(0.5, 2.4, 2.2, x + sd * 4, 1.2, z, '#424242', { solid: false });
    }
  }

  return {
    circuit,
    update: (t) => { for (const f of anim) f(t); },
    bounds: { x: AREA.x - 1.5, z: AREA.z - 1.5, h: 80 },
    itemSpots: [0.36, 0.74],
    zones,
    dust: [0.86, 0.76, 0.56],
    lights: {
      background: '#cfe8ff',
      fog: ['#dceffc', 120, 380],
      hemi: ['#e3f1ff', '#5a8a3a', 0.85],
      sun: { color: '#fff4dc', intensity: 3.5, offset: [26, 48, 22] },
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
