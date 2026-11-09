import * as THREE from 'three';
import { grassTexture, dirtTexture } from '../textures.js';
import { buildCircuit, startArch, trackRibbon, mat, BARRIER_GROUPS, trackPatch, chevronTexture } from './common.js';

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
    points: [[-40, 38], [-20, 40], [0, 34], [14, 40], [30, 36], [44, 40], [58, 30], [60, 14], [48, 6], [40, -6], [52, -18], [54, -32], [40, -40], [24, -34], [14, -22], [0, -18], [-10, -28], [-24, -38], [-42, -36], [-56, -24], [-58, -8], [-47, 0], [-40, 9], [-48, 19], [-56, 30]],
    start: [-34, 39],
    width: 7,
    limits: [AREA.x - 2, AREA.z - 2],
    hills: [{ at: [40, -6], len: 32, h: 2.2, double: true }, { at: [16, -25], len: 22, h: 1.8 }, { at: [0, 34], len: 22, h: 1.3 }],
    hillColor: '#7a5a3a',
    barrier: { colors: ['#8d6e63', '#795548', '#a1887f', '#6d4c41'], thick: 0.8, round: true, roughness: 0.9 },
  });
  const { sampleNear, yawOf, spot } = circuit;
  const anim = [];

  // punto relativo a la pista: avance y desplazamiento lateral (fracción del ancho)
  const onTrack = (x, z, along = 0, lat = 0) => { const s = circuit.sampleNear(x, z); return s.p.clone().addScaledVector(s.t, along).addScaledVector(s.n, lat * circuit.width / 2); };
  const extraZones = [];
  // barro (derrapa) y turbos
  extraZones.push(Object.assign(trackPatch(B, circuit, [-58, -8], 20, 'slide', { color: '#4e3420', opacity: 0.92 }), { particles: [0.35, 0.24, 0.12] }));
  extraZones.push(Object.assign(trackPatch(B, circuit, [54, -32], 16, 'slide', { color: '#4e3420', opacity: 0.92 }), { particles: [0.35, 0.24, 0.12] }));
  extraZones.push(trackPatch(B, circuit, [-48, 19], 5, 'boost', { map: chevronTexture(), emissive: '#ffffff', opacity: 0.95 }));
  extraZones.push(trackPatch(B, circuit, [30, 36], 5, 'boost', { map: chevronTexture(), emissive: '#ffffff', opacity: 0.95 }));
  // balón de playa, macetas y cajas de madera
  { const p = onTrack(14, 40, 0, 0.3); B.dynBall(1.6, p.x, p.y + 1.7, p.z, '#ff5252', { density: 0.02 }); }
  for (let k = 0; k < 5; k++) {
    const p = onTrack(58, 24, k * 1.2, -0.5 + k * 0.25);
    B.dynCyl(0.8, 1.5, p.x, p.y + 0.8, p.z, '#c0643b', { density: 0.08 });
  }
  for (const [i, l, y] of [[0, -0.3, 1], [0, 0.25, 1], [0.3, 0, 3]]) {
    const p = onTrack(-47, 0, i, l);
    B.dynBox(2, 2, 2, p.x, y, p.z, '#a1887f', { rot: [0, i, 0], density: 0.06 });
  }
  const W = circuit.width;
  trackRibbon(B, circuit, new THREE.MeshStandardMaterial({ map: dirtTexture([1, 1]), roughness: 1 }), 0.8);
  startArch(B, circuit, { color: '#43a047', text: 'GRAN PREMIO JARDÍN' });

  // ---------- Rampa: tabla sobre un ladrillo ----------
  {
    const s = sampleNear(-26, 39.5);
    const L = 9, H = 2.2, T = 0.5, Wd = W - 1.5, a = Math.asin(H / L), yaw = yawOf(s.t);
    const c = s.p.clone().addScaledVector(s.t, (L / 2) * Math.cos(a));
    box(Wd, T, L, c.x, H / 2 - (T / 2) * Math.cos(a), c.z, '#b98a52', { rot: [-a, yaw, 0], phys: { friction: 0.8 } });
    const back = s.p.clone().addScaledVector(s.t, L * Math.cos(a) - 1.2);
    box(Wd - 1, H - 0.4, 1.8, back.x, (H - 0.4) / 2, back.z, '#b5532f', { rot: [0, yaw, 0] });
  }

  // ---------- Charco (frena y salpica) ----------
  const zones = extraZones;
  {
    const s = sampleNear(-20, -36);
    const p = s.p.clone().addScaledVector(s.n, 1);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5d8fb3', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.85 }));
    puddle.scale.set(4.5, 1, 3.2); puddle.rotation.y = yawOf(s.t);
    puddle.position.set(p.x, 0.04, p.z);
    scene.add(puddle);
    zones.push({ pos: p, r: 4.2, effect: 'wet' });
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
    const [x, z] = spot(6, 4, 3) || [6, 4];
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
    const [wx, wz] = spot(-6, 6, 4) || [-6, 6];
    cyl(2.5, 3, 5, wx, 2.5, wz, '#43a047', { seg: 12 });
    cyl(0.4, 0.5, 6, wx - 3.5, 4.5, wz, '#43a047', { seg: 6, rot: [0, 0, 1.0], solid: false });
    const [hx, hz] = spot(-22, 20, 5) || [-22, 20];
    const hose = new THREE.Mesh(new THREE.TorusGeometry(4, 0.35, 6, 24), mat('#43a047'));
    hose.rotation.x = Math.PI / 2; hose.position.set(hx, 0.35, hz); hose.castShadow = true; scene.add(hose);
    const hose2 = hose.clone(); hose2.scale.setScalar(0.7); hose2.position.y = 1.0; scene.add(hose2);
  }
  // estanque
  const [px, pz] = spot(22, 12, 11) || [22, 12];
  {
    const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2f78a8', roughness: 0.05, metalness: 0.5 }));
    pond.position.set(px, 0.05, pz); scene.add(pond);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      ball(1.2, px + Math.cos(a) * 9.5, 0.3, pz + Math.sin(a) * 9.5, rockM, { detail: 0 });
    }
    collider(RAPIER.ColliderDesc.cylinder(1, 9), { x: px, y: 0, z: pz });
  }

  // ---------- Detalles animados ----------
  // mariposas
  {
    const cols = ['#ff7eb6', '#ffd166', '#7bdff2', '#cdb4db', '#f9844a'];
    const bs = [];
    for (let k = 0; k < 10; k++) {
      const g = new THREE.Group();
      const wm = new THREE.MeshStandardMaterial({ color: cols[k % cols.length], side: THREE.DoubleSide, roughness: 0.6 });
      const wl = new THREE.Mesh(new THREE.CircleGeometry(0.7, 6).translate(0.6, 0, 0), wm);
      const wr = new THREE.Mesh(new THREE.CircleGeometry(0.7, 6).translate(-0.6, 0, 0), wm);
      wl.rotation.x = wr.rotation.x = -Math.PI / 2;
      const pl = new THREE.Group(); pl.add(wl); const pr = new THREE.Group(); pr.add(wr);
      g.add(pl, pr, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 4).rotateX(Math.PI / 2), mat('#222')));
      g.traverse((o) => { o.userData.dynamic = true; });
      scene.add(g);
      bs.push({ g, pl, pr, cx: (rnd() * 2 - 1) * 55, cz: (rnd() * 2 - 1) * 38, r: 6 + rnd() * 10, ph: rnd() * 10, sp: 0.2 + rnd() * 0.3 });
    }
    anim.push((t) => {
      for (const b of bs) {
        const a = t * b.sp + b.ph;
        b.g.position.set(b.cx + Math.cos(a) * b.r, 3 + Math.sin(a * 3) * 1.2 + 2, b.cz + Math.sin(a * 1.3) * b.r);
        b.g.rotation.y = -a;
        const f = Math.sin(t * 18 + b.ph) * 0.9;
        b.pl.rotation.z = f; b.pr.rotation.z = -f;
      }
    });
  }
  // aspersor girando con chorros de agua
  {
    const [sx, sz] = spot(-28, -6, 6) || [-28, -6];
    cyl(0.4, 0.5, 1.4, sx, 0.7, sz, '#9e9e9e', { seg: 8 });
    const head = new THREE.Group(); head.position.set(sx, 1.5, sz);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.2), mat('#607d8b')); head.add(arm);
    const drops = [];
    const dm = new THREE.MeshStandardMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.75, roughness: 0.05 });
    const dg = new THREE.SphereGeometry(0.18, 5, 4);
    for (let k = 0; k < 36; k++) { const d = new THREE.Mesh(dg, dm); scene.add(d); d.userData.dynamic = true; drops.push(d); }
    head.traverse((o) => { o.userData.dynamic = true; });
    scene.add(head);
    anim.push((t) => {
      head.rotation.y = t * 2.5;
      drops.forEach((d, k) => {
        const side = k % 2 ? 1 : -1, u = ((t * 0.9 + k / 36) % 1);
        const a = t * 2.5 - u * 0.6 + (side > 0 ? 0 : Math.PI);
        const r = 1.2 + u * 9;
        d.position.set(sx + Math.cos(-a) * r, 1.5 + u * 7 - u * u * 8.5, sz + Math.sin(-a) * r);
      });
    });
  }
  // molinillo de viento
  {
    const [mx, mz] = spot(30, -12, 3) || [30, -12];
    cyl(0.2, 0.2, 8, mx, 4, mz, '#f5f5f5', { seg: 5 });
    const rot = new THREE.Group(); rot.position.set(mx, 8, mz + 0.4);
    const cols = ['#ff5252', '#ffeb3b', '#40c4ff', '#69f0ae'];
    for (let k = 0; k < 4; k++) {
      const b = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 3).translate(0, 1.3, 0), mat(cols[k]));
      b.rotation.z = (k * Math.PI) / 2; b.castShadow = true; rot.add(b);
    }
    rot.traverse((o) => { o.userData.dynamic = true; });
    scene.add(rot);
    anim.push((t) => { rot.rotation.z = -t * 4; });
  }
  // rana saltando junto al estanque
  {
    const frog = new THREE.Group();
    const fm = mat('#4caf50');
    const fb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), fm); fb.scale.set(1, 0.7, 1.2); frog.add(fb);
    for (const e of [-0.4, 0.4]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4), mat('#ffffff')); ey.position.set(e, 0.6, 0.6); frog.add(ey); }
    frog.traverse((o) => { o.castShadow = true; o.userData.dynamic = true; });
    scene.add(frog);
    anim.push((t) => {
      const a = t * 0.6, hop = Math.abs(Math.sin(t * 3));
      frog.position.set(px + Math.cos(a) * 11.5, 0.6 + hop * 2, pz + Math.sin(a) * 11.5);
      frog.rotation.y = -a;
    });
  }

  return {
    circuit,
    update: (t) => { for (const f of anim) f(t); },
    bounds: { x: AREA.x - 1.5, z: AREA.z - 1.5, h: 80 },
    itemSpots: [0.3, 0.72],
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
