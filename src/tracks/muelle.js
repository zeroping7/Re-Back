import * as THREE from 'three';
import { groundTex, surfaceTex } from '../textures.js';
import { buildCircuit, startArch, mat, BARRIER_GROUPS, trackPatch, autoBoosts } from './common.js';

// Circuito 5: "El muelle" (CIR-21). Tablones sobre el mar al atardecer, cajas, barcas y gaviotas.
const AREA = { x: 80, z: 56 };

export default {
  id: 'muelle',
  name: 'El muelle',
  short: 'Muelle',
  desc: 'Tablones, charcos y barcas al atardecer',
  color: '#ff8a50',
  build,
};

function build(B) {
  const { scene, RAPIER, box, cyl, collider } = B;
  const rnd = mulberry(91);
  const anim = [];

  // ---------- Muelle de tablones, mar y cielo de atardecer ----------
  const pk = groundTex('plank', [AREA.x / 5, AREA.z / 5]);
  const deckMat = new THREE.MeshStandardMaterial({ map: pk.map, normalMap: pk.normalMap, roughness: 0.75, color: '#d9b48a' });
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(AREA.x * 2, AREA.z * 2), deckMat);
  deck.rotation.x = -Math.PI / 2; deck.receiveShadow = true; scene.add(deck);
  collider(RAPIER.ColliderDesc.cuboid(AREA.x + 10, 1, AREA.z + 10), { x: 0, y: -1, z: 0 }, null, { friction: 0.9 });
  const groundUV = (x, z) => [(x + AREA.x) / 10, (AREA.z - z) / 10];
  // borde del muelle (viga) y pilotes
  for (const [len, x, z, ry] of [[AREA.x * 2 + 2, 0, -AREA.z, 0], [AREA.x * 2 + 2, 0, AREA.z, 0], [AREA.z * 2, -AREA.x, 0, Math.PI / 2], [AREA.z * 2, AREA.x, 0, Math.PI / 2]]) {
    box(len, 2.4, 1.6, x, -1.0, z, '#6b4a2f', { rot: [0, ry, 0], solid: false });
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    collider(RAPIER.ColliderDesc.cuboid(len / 2, 10, 1), { x, y: 10, z }, q, { friction: 0.05, restitution: 0.5, groups: BARRIER_GROUPS });
    const dir = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    for (let t = -len / 2; t <= len / 2; t += 12) {
      const p = new THREE.Vector3(x, 0, z).addScaledVector(dir, t);
      cyl(0.9, 0.9, 12, p.x, -4, p.z, '#4e3524', { seg: 8, solid: false });
      cyl(0.7, 0.7, 5, p.x, 2.5, p.z, '#5d4030', { seg: 8, solid: false }); // poste de la barandilla
    }
    // cuerda de la barandilla
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, len, 5).rotateZ(Math.PI / 2), mat('#e0c48c'));
    rope.position.set(x, 4.4, z); rope.rotation.y = ry; scene.add(rope);
  }
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: '#2a5f86', roughness: 0.12, metalness: 0.2 }));
  const sw = surfaceTex('water', [60, 60]);
  sea.material.normalMap = sw.normalMap; sea.material.normalScale = new THREE.Vector2(0.6, 0.6);
  sea.rotation.x = -Math.PI / 2; sea.position.y = -4; sea.userData.dynamic = true; scene.add(sea);
  anim.push((t) => { sw.normalMap.offset.set(t * 0.01, t * 0.006); });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#3b3f8f') }, mid: { value: new THREE.Color('#ff8a50') }, bottom: { value: new THREE.Color('#ffd27a') } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying float h; void main(){ vec3 c = mix(bottom, mid, smoothstep(-0.02, 0.12, h)); c = mix(c, top, smoothstep(0.12, 0.6, h)); gl_FragColor = vec4(c, 1.0); }',
  }));
  sky.userData.dynamic = true; scene.add(sky);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(26, 32), new THREE.MeshBasicMaterial({ color: '#ffe3a3', fog: false }));
  sun.position.set(-150, 30, -330); sun.lookAt(0, 0, 0); scene.add(sun);
  // faro a lo lejos
  {
    const lx = 150, lz = -260;
    cyl(10, 13, 70, lx, 31, lz, '#f5f5f5', { seg: 12, solid: false });
    for (const y of [12, 36]) cyl(10.5, 11.5, 8, lx, y, lz, '#d32f2f', { seg: 12, solid: false });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff3b0' }));
    lamp.position.set(lx, 70, lz); lamp.userData.dynamic = true; scene.add(lamp);
    anim.push((t) => { lamp.material.color.setScalar(0.6 + 0.4 * Math.max(0, Math.sin(t * 2))); });
  }

  // ---------- Trazado ----------
  const circuit = buildCircuit(B, {
    points: [[-60, 40], [-30, 44], [0, 40], [24, 44], [50, 40], [66, 26], [60, 10], [44, 11], [30, 18], [14, 22], [2, 12], [10, -2], [30, -6], [52, -10],
      [66, -22], [58, -40], [36, -44], [14, -38], [-4, -44], [-26, -40], [-40, -26], [-28, -12], [-44, 0], [-62, -4], [-70, 10], [-66, 28]],
    start: [-44, 42],
    width: 7,
    limits: [AREA.x - 2, AREA.z - 2],
    hills: [{ frac: 0.62, len: 28, h: 1.3 }, { frac: 0.86, len: 30, h: 1.0, double: true }],
    ramps: [{ frac: 0.3, len: 10, h: 2.0 }],
    hillMaterial: deckMat,
    rampMaterial: new THREE.MeshStandardMaterial({ map: groundTex('plank', [1, 1]).map, color: '#a8794e', roughness: 0.8 }),
    groundUV,
    barrier: { colors: ['#1565c0', '#f5f5f5', '#c62828', '#f5f5f5'], thick: 0.7, round: true, roughness: 0.6 },
    chevrons: { bg: '#1565c0', fg: '#ffffff' },
  });
  const W = circuit.width;
  const { samples, spot, yawOf } = circuit;

  // ---------- Zonas: charcos (frenan y salpican), tablones resbaladizos, turbos ----------
  const zones = [];
  const wt = surfaceTex('water', [2, 2]);
  const waterMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: wt.map, normalMap: wt.normalMap, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6, transparent: true, opacity: 0.85 });
  anim.push((t) => { wt.normalMap.offset.set(t * 0.03, t * 0.02); });
  for (const f of [0.18, 0.75]) {
    const i = circuit.straightest(f - 0.04, f + 0.04, 3, 3, circuit.elev.map((e) => [e.i0, e.i1]));
    const s = samples[i], p = s.p.clone().addScaledVector(s.n, (f > 0.5 ? -1 : 1) * 1.2);
    const pd = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), waterMat);
    pd.scale.set(4.2, 1, 3); pd.rotation.y = yawOf(s.t); pd.position.set(p.x, s.p.y + 0.06, p.z); pd.userData.dynamic = true;
    scene.add(pd);
    zones.push({ pos: p, r: 3.9, effect: 'wet', surface: 'water' });
  }
  const wet = surfaceTex('wet', [1, 3]);
  {
    let best = circuit.at(0.44), br = Infinity;
    for (let f = 0.4; f < 0.52; f += 0.005) { const i = circuit.at(f); const r = circuit.minRadius(i, 3, 3); if (r < br) { br = r; best = i; } }
    const p = samples[best].p;
    zones.push(trackPatch(B, circuit, [p.x, p.z], 18, 'slide', { ...wet, color: '#ffffff', opacity: 1, roughness: 1, metalness: 0.15, normalScale: 0.4, surface: 'wet' }));
  }
  zones.push(...autoBoosts(B, circuit, 2, zones.filter((z) => z.from !== undefined).map((z) => [z.from, z.to])));
  startArch(B, circuit, { color: '#ff7043', text: 'REGATA DEL MUELLE' });

  // ---------- Cajas, barriles, redes y cuerdas ----------
  const crate = groundTex('cardboard', [1, 1]);
  const crateMat = new THREE.MeshStandardMaterial({ color: '#b98a55', map: groundTex('plank', [1, 1]).map, roughness: 0.85 });
  void crate;
  for (const [x0, z0] of [[-18, 24], [40, -24], [-50, -20], [24, 2], [-14, -24], [56, 28]]) {
    const pos = spot(x0, z0, 4.5);
    if (!pos) continue;
    const [x, z] = pos, ry = rnd() * 3;
    box(5, 5, 5, x, 2.5, z, crateMat, { rot: [0, ry, 0] });
    if (rnd() > 0.4) box(4, 4, 4, x + 0.3, 7, z - 0.2, crateMat, { rot: [0, ry + 0.4, 0] });
  }
  for (const [x0, z0] of [[-32, -2], [6, -22], [46, 2]]) {
    const pos = spot(x0, z0, 5.5);
    if (!pos) continue;
    const [x, z] = pos;
    for (let k = 0; k < 3; k++) cyl(1.5, 1.5, 3.6, x + (k - 1) * 3.1, 1.8, z, k % 2 ? '#2e7d32' : '#455a64', { seg: 12 });
    for (const y of [0.7, 2.9]) for (let k = 0; k < 3; k++) cyl(1.55, 1.55, 0.3, x + (k - 1) * 3.1, y, z, '#9e9e9e', { seg: 12, solid: false });
  }
  // rollos de cuerda y boyas
  for (let k = 0; k < 6; k++) {
    const pos = spot(-60 + k * 24, k % 2 ? 50 : -50, 2.5);
    if (!pos) continue;
    const [x, z] = pos;
    const coil = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.45, 6, 14).rotateX(Math.PI / 2), mat('#d8b878'));
    coil.position.set(x, 0.45, z); coil.castShadow = true; scene.add(coil);
    const buoy = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat(k % 2 ? '#ff7043' : '#ffffff'));
    buoy.position.set(x + 2.6, 1, z); buoy.castShadow = true; scene.add(buoy);
  }

  // ---------- Barcas amarradas que se mecen ----------
  const boatCols = ['#d32f2f', '#1976d2', '#fbc02d', '#388e3c'];
  for (let k = 0; k < 6; k++) {
    const side = k % 2 ? 1 : -1, x = -60 + k * 24, z = side * (AREA.z + 12);
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(18, 4, 7), mat(boatCols[k % 4]));
    hull.castShadow = true; g.add(hull);
    const prow = new THREE.Mesh(new THREE.ConeGeometry(3.5, 6, 4).rotateZ(-Math.PI / 2).rotateX(Math.PI / 4), mat(boatCols[k % 4]));
    prow.position.x = 12; prow.scale.set(1, 0.6, 1); g.add(prow);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 5.6), mat('#a1887f')); inner.position.y = 1.8; g.add(inner);
    if (k % 3 === 0) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 18, 6), mat('#6d4c41')); mast.position.y = 10; g.add(mast); }
    g.position.set(x, -3, z); g.rotation.y = side > 0 ? 0 : Math.PI;
    g.traverse((o) => { o.userData.dynamic = true; });
    scene.add(g);
    anim.push((t) => { g.position.y = -3 + Math.sin(t * 1.1 + k) * 0.35; g.rotation.z = Math.sin(t * 0.9 + k * 2) * 0.05; g.rotation.x = Math.cos(t * 0.7 + k) * 0.03; });
  }

  // ---------- Gaviotas ----------
  const gullMat = mat('#fafafa');
  for (let k = 0; k < 5; k++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 4), gullMat); body.scale.set(1.6, 0.7, 0.7); g.add(body);
    const wings = [];
    for (const sd of [1, -1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 3), gullMat);
      w.geometry.translate(0, 0, sd * 1.5); g.add(w); wings.push(w);
    }
    g.traverse((o) => { o.userData.dynamic = true; });
    scene.add(g);
    const r0 = 30 + k * 9, h = 24 + k * 3, sp = 0.18 + k * 0.03, ph = k * 1.7;
    anim.push((t) => {
      const a = t * sp + ph;
      g.position.set(Math.cos(a) * r0, h + Math.sin(t * 0.8 + k) * 2, Math.sin(a) * r0 * 0.6);
      g.rotation.y = -a;
      const f = Math.sin(t * 6 + k) * 0.5;
      wings[0].rotation.x = f; wings[1].rotation.x = -f;
    });
  }
  void W;

  return {
    circuit,
    update: (t) => { for (const f of anim) f(t); },
    bounds: { x: AREA.x - 1.5, z: AREA.z - 1.5, h: 80 },
    itemSpots: [0.36, 0.7],
    zones,
    dust: [0.7, 0.58, 0.44],
    lights: {
      background: '#ff9e6b',
      fog: ['#ffb08a', 140, 520],
      hemi: ['#ffd2b0', '#3b4a6b', 0.75],
      sun: { color: '#ffb36b', intensity: 3.2, offset: [-24, 28, -30] },
      env: 0.4,
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
