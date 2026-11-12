import * as THREE from 'three';
import { groundTex, surfaceTex } from '../textures.js';
import { buildCircuit, startArch, trackRibbon, mat, BARRIER_GROUPS, trackPatch, autoBoosts } from './common.js';

// Circuito 3: "El jardín". Al aire libre: camino de tierra, charco, rampa-tabla y árboles.
const AREA = { x: 96, z: 70 };

export default {
  id: 'jardin',
  screech: false, // AUD-14: tierra y hierba, sin chirrido
  name: 'El jardín',
  short: 'Jardín',
  desc: 'Tierra, charcos, gnomos y un gran salto',
  color: '#7cb342',
  build,
};

function build(B) {
  const { scene, RAPIER, box, cyl, ball, collider } = B;
  const rnd = mulberry(31);

  // ---------- Suelo y cielo ----------
  const gr = groundTex('grass', [110, 110]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), new THREE.MeshStandardMaterial({ map: gr.map, normalMap: gr.normalMap, roughness: 0.95 }));
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
    collider(RAPIER.ColliderDesc.cuboid(len / 2, 10, 1), { x, y: 10, z }, q, { friction: 0.05, restitution: 0.5, groups: BARRIER_GROUPS });
  }
  // casa al fondo (fachada)
  box(90, 40, 4, -10, 20, -AREA.z - 6, '#f0d9b5', { solid: false });
  box(96, 3, 8, -10, 41, -AREA.z - 6, '#8d4e3a', { solid: false });
  for (const x of [-40, -20, 0, 20]) box(10, 12, 0.5, x, 22, -AREA.z - 3.8, '#9fd3f5', { solid: false, shadow: false });

  // ---------- Trazado ----------
  const dirt = groundTex('dirt', [1, 1]);
  const dirtMat = new THREE.MeshStandardMaterial({ map: dirt.map, normalMap: dirt.normalMap, roughness: 1 });
  const circuit = buildCircuit(B, {
    points: [[-60, 52], [-36, 58], [-10, 50], [10, 58], [34, 52], [56, 60], [78, 50], [84, 32], [72, 20], [80, 4], [66, -8], [52, 2], [38, -8], [46, -24], [64, -30],
      [76, -44], [60, -58], [36, -52], [14, -58], [-6, -44], [0, -28], [-16, -18], [-34, -26], [-42, -44], [-62, -54], [-80, -42], [-84, -20], [-70, -6], [-56, 6], [-68, 20], [-82, 34], [-76, 48]],
    start: [-50, 55],
    width: 7,
    limits: [AREA.x - 2, AREA.z - 2],
    hills: [{ frac: 0.33, len: 44, h: 1.4, double: true }, { frac: 0.58, len: 24, h: 1.8 }, { frac: 0.16, len: 24, h: 1.4 }, { frac: 0.8, len: 26, h: 1.6 }],
    ramps: [{ frac: 0.06, len: 10, h: 2.0 }],
    hillMaterial: dirtMat,
    rampMaterial: dirtMat, // tierra, como la cinta que va encima (antes se veía madera o parpadeaba contra la tierra)
    barrier: { colors: ['#8d6e63', '#795548', '#a1887f', '#6d4c41'], thick: 0.6, round: true, roughness: 0.9 },
    chevrons: { bg: '#2e7d32', fg: '#ffffff' },
  });

  const { sampleNear, yawOf, spot } = circuit;
  const W = circuit.width;
  const anim = [];

  // punto relativo a la pista: avance y desplazamiento lateral (fracción del ancho)
  const onTrack = (x, z, along = 0, lat = 0) => { const s = circuit.sampleNear(x, z); return s.p.clone().addScaledVector(s.t, along).addScaledVector(s.n, lat * circuit.width / 2); };
  const extraZones = [];
  // barro (derrapa) y turbos
  const mud = surfaceTex('mud', [1, 2.2]);
  const curvy = (f0, f1) => { let best = circuit.at(f0), br = Infinity; for (let f = f0; f < f1; f += 0.005) { const i = circuit.at(f); const r = circuit.minRadius(i, 3, 3); if (r < br) { br = r; best = i; } } return circuit.samples[best].p; };
  for (const [f0, f1] of [[0.68, 0.76], [0.46, 0.53], [0.9, 0.97]]) {
    const p = curvy(f0, f1);
    extraZones.push(trackPatch(B, circuit, [p.x, p.z], 20, 'slide', { ...mud, color: '#ffffff', opacity: 1, roughness: 1, metalness: 0, normalScale: 1.2, inset: 0.1, surface: 'mud' }));
  }
  // balón de playa, macetas y cajas de madera
  { const sb = circuit.samples[circuit.at(0.12)]; const p = sb.p.clone().addScaledVector(sb.n, 0.3 * W / 2); B.dynBall(1.6, p.x, p.y + 1.7, p.z, '#ff5252', { density: 0.02 }); }

  trackRibbon(B, circuit, dirtMat, 0.8);
  startArch(B, circuit, { color: '#43a047', text: 'GRAN PREMIO JARDÍN' });

  // agua con ondas animadas (charco y estanque)
  const wt = surfaceTex('water', [2, 2]), wt2 = surfaceTex('water', [3.1, 3.1]);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', map: wt.map, normalMap: wt.normalMap, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.03, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.02, clearcoatNormalMap: wt2.normalMap, clearcoatNormalScale: new THREE.Vector2(0.5, 0.5),
    envMapIntensity: 1.6, transparent: true, opacity: 0.9,
  });
  anim.push((t) => { wt.normalMap.offset.set(t * 0.03, t * 0.02); wt2.normalMap.offset.set(-t * 0.025, t * 0.035); wt.map.offset.set(-t * 0.01, 0); });
  // orilla de barro húmedo alrededor del agua (degradado irregular)
  const rimTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128);
    gr.addColorStop(0, '#3a2a1cff'); gr.addColorStop(0.55, '#4a3624d0'); gr.addColorStop(1, '#5a432c00');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 220; k++) { const a = Math.random() * 6.28, r = 70 + Math.random() * 55; g.fillStyle = `rgba(${40 + Math.random() * 30},${28 + Math.random() * 20},${16 + Math.random() * 12},${0.15 + Math.random() * 0.3})`; g.beginPath(); g.ellipse(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 3 + Math.random() * 9, 2 + Math.random() * 5, a, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const rimMat = new THREE.MeshStandardMaterial({ map: rimTex, transparent: true, roughness: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  // ---------- Charco (frena y salpica) ----------
  const zones = extraZones;
  {
    let pi = circuit.straightest(0.4, 0.46, 3, 3, circuit.elev.map((e) => [e.i0, e.i1]));
    const s = circuit.samples[pi];
    const p = s.p.clone().addScaledVector(s.n, 1);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), waterMat);
    puddle.scale.set(4.5, 1, 3.2); puddle.rotation.y = yawOf(s.t);
    puddle.position.set(p.x, s.p.y + 0.06, p.z);
    puddle.userData.dynamic = true;
    scene.add(puddle);
    const rim = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), rimMat);
    rim.scale.set(6.4, 1, 4.9); rim.rotation.y = puddle.rotation.y;
    rim.position.set(p.x, s.p.y + 0.04, p.z); rim.userData.dynamic = true; rim.receiveShadow = true;
    scene.add(rim);
    zones.push({ pos: p, r: 4.2, effect: 'wet', surface: 'water' });
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
  for (let k = 0; k < 55; k++) {
    const x = (rnd() * 2 - 1) * (AREA.x - 6), z = (rnd() * 2 - 1) * (AREA.z - 6);
    if (rnd() < 0.65) tree(x, z, 0.7 + rnd() * 0.6);
    else if (!occupied(x, z, 6)) ball(1 + rnd() * 1.6, x, 0.4, z, rockM, { detail: 0 });
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
    const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 32).rotateX(-Math.PI / 2), waterMat);
    pond.position.set(px, 0.05, pz); pond.userData.dynamic = true; scene.add(pond);
    const prim = new THREE.Mesh(new THREE.CircleGeometry(12, 40).rotateX(-Math.PI / 2), rimMat);
    prim.position.set(px, 0.035, pz); prim.userData.dynamic = true; scene.add(prim);
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
