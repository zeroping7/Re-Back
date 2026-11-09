import * as THREE from 'three';
import { room, mat, BARRIER_GROUPS, trackRibbon, bannerTexture } from './common.js';
import { mulberry } from './kit.js';

// Pista de drift RC de verdad (DRI-09): suelo de losetas de plástico, pista pintada con líneas y goma,
// zonas de "clip" en el exterior de las curvas, conos que se pueden tirar, pilas de neumáticos,
// tarima de pilotos gigantes con emisoras, boxes, calle en miniatura y luces LED.

const canvas = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
};

// Losetas de plástico (P-tile) gris pulido con juntas
function tileFloor(base, repeat) {
  const rnd = mulberry(5);
  const t = canvas(512, 512, (g, w, h) => {
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const c = new THREE.Color(base).offsetHSL(0, 0, (rnd() - 0.5) * 0.04);
      g.fillStyle = '#' + c.getHexString(); g.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 140; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${0.02 + rnd() * 0.03})`; g.fillRect(i * s + rnd() * s, j * s + rnd() * s, 2 + rnd() * 6, 2 + rnd() * 6); }
    }
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  });
  t.repeat.set(repeat[0], repeat[1]);
  return t;
}

// Superficie de la pista: un gris más oscuro, líneas blancas en los bordes y goma de las ruedas
function trackSurface(dark) {
  const rnd = mulberry(9);
  return canvas(256, 512, (g, w, h) => {
    g.fillStyle = dark; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    // goma: rayas oscuras a lo largo, más en el centro
    for (let k = 0; k < 70; k++) {
      const x = w * (0.2 + 0.6 * (rnd() + rnd()) / 2), y = rnd() * h, len = 80 + rnd() * 300;
      g.strokeStyle = `rgba(10,10,12,${0.08 + rnd() * 0.18})`; g.lineWidth = 3 + rnd() * 10;
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + (rnd() - 0.5) * 40, y + len / 3, x + (rnd() - 0.5) * 40, y + len * 2 / 3, x + (rnd() - 0.5) * 30, y + len); g.stroke();
    }
    g.fillStyle = '#f2f2f2'; g.fillRect(8, 0, 9, h); g.fillRect(w - 17, 0, 9, h);
  });
}

// Rayas de la zona de clip (rojo y blanco en diagonal)
function clipTexture() {
  return canvas(128, 128, (g, w, h) => {
    g.fillStyle = 'rgba(255,255,255,0.0)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,61,0,0.85)'; g.lineWidth = 14;
    for (let k = -2; k < 4; k++) { g.beginPath(); g.moveTo(k * 48, 0); g.lineTo(k * 48 + h, h); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillRect(0, 0, 8, h);
  });
}

function signTexture(text, bg, fg) {
  return canvas(256, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

// Persona gigante (a escala del coche RC) con la emisora en las manos
function driver(color, cap, skin = '#e0ac69') {
  const g = new THREE.Group();
  const jeans = mat('#2f3d56'), shirt = mat(color), sk = mat(skin), shoe = mat('#222222');
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.1, 0.46), jeans); leg.position.set(sx * 0.26, 1.15, 0); g.add(leg);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.7), shoe); sh.position.set(sx * 0.26, 0.11, 0.1); g.add(sh);
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.45, 0.6), shirt); torso.position.y = 2.95; g.add(torso);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.3), shirt); arm.position.set(sx * 0.66, 3.0, 0.28); arm.rotation.x = -0.9; g.add(arm);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), sk); hand.position.set(sx * 0.42, 2.66, 0.78); g.add(hand);
  }
  // emisora de pistola con volante
  const tx = new THREE.Group();
  tx.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.7), mat('#1d1f22')));
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 14).rotateZ(Math.PI / 2), mat('#333333')); wheel.position.set(0.24, 0.05, 0.12); tx.add(wheel);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5), mat('#111111')); ant.position.set(0, 0.6, -0.15); tx.add(ant);
  tx.position.set(0, 2.8, 0.85); g.add(tx);
  const headG = new THREE.Group(); headG.position.y = 3.95; g.add(headG);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.62), sk); headG.add(head);
  const capM = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.2, 0.68), mat(cap)); capM.position.y = 0.38; headG.add(capM);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.4), mat(cap)); visor.position.set(0, 0.3, 0.5); headG.add(visor);
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.02), mat('#111111')); eyes.position.set(0, 0.06, 0.32); headG.add(eyes);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.dynamic = true; } });
  g.userData.head = headG;
  return g;
}

export function driftVenue(B, circuit, R, { theme = 'club', seed = 3 } = {}) {
  const { scene, RAPIER, box, cyl, collider } = B;
  const rnd = mulberry(seed);
  const night = theme === 'night';
  const S = circuit.samples, N = circuit.N, W = circuit.width;
  const anim = [];
  const put = (x, z, r, fn) => { const p = circuit.spot(x, z, r); if (p) fn(p[0], p[1]); return p; };

  // ---------- Pista pintada ----------
  const surf = trackSurface(night ? '#3b3f45' : '#55595f');
  surf.repeat.set(1, 1);
  const track = trackRibbon(B, circuit, new THREE.MeshStandardMaterial({ map: surf, roughness: night ? 0.35 : 0.5, metalness: 0.05 }), 0.15, 0.03);
  track.material.map = surf;

  // ---------- Zonas de clip (DRI-09) en el exterior de las curvas ----------
  const clips = [];
  const runs = [];
  let cur = null;
  for (let i = 0; i < N; i++) {
    if (S[i].radius < 11) { if (!cur) cur = { i0: i, apex: i, r: S[i].radius, turn: S[i].turn }; cur.i1 = i; if (S[i].radius < cur.r) { cur.r = S[i].radius; cur.apex = i; cur.turn = S[i].turn; } }
    else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  const clipTex = clipTexture();
  const clipMat = new THREE.MeshStandardMaterial({ map: clipTex, transparent: true, depthWrite: false, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4 });
  const best = runs.filter((r) => r.apex > 8 && r.apex < N - 8 && r.i1 - r.i0 >= 3).sort((a, b) => a.r - b.r).slice(0, 6).sort((a, b) => a.apex - b.apex);
  best.forEach((r, n) => {
    const side = -r.turn || 1; // exterior de la curva, en el sentido de la normal
    const a = r.apex - 3, b = r.apex + 4;
    const pos = [], uv = [], idx = [];
    for (let k = a, m = 0; k <= b; k++, m++) {
      const s = S[(k + N) % N];
      const o = s.p.clone().addScaledVector(s.n, side * (W / 2 - 0.15)), in_ = s.p.clone().addScaledVector(s.n, side * W * 0.1);
      pos.push(o.x, s.h + 0.045, o.z, in_.x, s.h + 0.045, in_.z);
      uv.push(0, m * 0.5, 1.6, m * 0.5);
      if (k < b) idx.push(m * 2, m * 2 + 2, m * 2 + 1, m * 2 + 1, m * 2 + 2, m * 2 + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, clipMat); m.receiveShadow = true; m.userData.dynamic = true; scene.add(m);
    clips.push({ from: ((a % N) + N) % N, to: ((b % N) + N) % N, side, n: n + 1 });
    // cartel con el número del clip, fuera de la pista
    const s = S[r.apex], p = s.p.clone().addScaledVector(s.n, side * (W / 2 + 1.6));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshStandardMaterial({ map: signTexture('CLIP ' + (n + 1), '#ff3d00', '#ffffff'), emissive: '#ffffff', emissiveIntensity: 0.15 }));
    sign.position.set(p.x, 1.2, p.z); sign.lookAt(s.p.x, 1.2, s.p.z); sign.userData.dynamic = true; scene.add(sign);
    box(0.1, 0.8, 0.1, p.x, 0.4, p.z, '#333333', { solid: false, shadow: false });
    // conos en el vértice interior (se pueden tirar)
    for (const dk of [-2, 0, 2]) {
      const q = S[(r.apex + dk + N) % N], c = q.p.clone().addScaledVector(q.n, -side * (W / 2 - 0.35));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 10), mat('#ff6d00'));
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.14, 10), mat('#ffffff')); band.position.y = 0.05; cone.add(band);
      const g0 = new THREE.Group(); g0.add(cone);
      B.dynCyl(0.3, 0.8, c.x, 0.42, c.z, mat('#ff6d00'), { density: 0.02 }).visible = false;
      const body = B.dynamics[B.dynamics.length - 1];
      body.mesh = cone; cone.userData.dynamic = true; cone.castShadow = true; scene.add(cone);
    }
    // pila de neumáticos detrás del clip
    const t = s.p.clone().addScaledVector(s.n, side * (W / 2 + 3.4));
    if (circuit.clearance(t.x, t.z) > 1.2) tyreStack(t.x, t.z, 3 + Math.floor(rnd() * 2));
  });

  function tyreStack(x, z, n) {
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.3, 8, 16).rotateX(Math.PI / 2), mat(k % 2 ? '#1c1c1c' : '#262626', { roughness: 0.95 }));
      m.position.set(x, 0.3 + k * 0.58, z); m.castShadow = true; scene.add(m);
    }
    collider(RAPIER.ColliderDesc.cylinder(n * 0.29, 0.92), { x, y: n * 0.29, z }, null, { groups: BARRIER_GROUPS, restitution: 0.6 });
  }
  // más pilas de neumáticos sueltas
  for (let k = 0; k < 5; k++) put((rnd() - 0.5) * R.x * 1.6, (rnd() - 0.5) * R.z * 1.6, 1.4, (x, z) => tyreStack(x, z, 2 + Math.floor(rnd() * 3)));

  // ---------- Tarima de pilotos con gente gigante y emisoras ----------
  const people = [];
  const stand = put(0, R.z - 7, 6, (x, z) => {
    const w = 14, d = 5, h = 2.2;
    box(w, h, d, x, h / 2, z, night ? '#263238' : '#455a64');
    for (let k = 0; k < 5; k++) box(w, 0.06, 0.06, x, h + 0.9 + (k % 1), z - d / 2 + 0.1, '#cfd8dc', { solid: false, shadow: false });
    for (let k = -3; k <= 3; k++) box(0.08, 1, 0.08, x + k * 2.2, h + 0.5, z - d / 2 + 0.1, '#cfd8dc', { solid: false, shadow: false });
    // escalones
    for (let k = 0; k < 3; k++) box(2.2, (k + 1) * 0.7, 1, x + w / 2 + 1.1, (k + 1) * 0.35, z + 1.5 - k, '#37474f', { solid: false });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, 1.4), new THREE.MeshStandardMaterial({ map: bannerTexture('ZONA DE PILOTOS', '#ff3d00') }));
    banner.position.set(x, h / 2, z - d / 2 - 0.02); banner.rotation.y = Math.PI; scene.add(banner);
    const cols = [['#e53935', '#111111'], ['#1e88e5', '#ffffff'], ['#fdd835', '#d32f2f'], ['#43a047', '#1d1d1d']];
    cols.forEach(([c, cap], i) => {
      const p = driver(c, cap, ['#e0ac69', '#c68642', '#f1c27d', '#8d5524'][i]);
      p.position.set(x - 5 + i * 3.3, h, z + 0.3); p.rotation.y = Math.PI;
      scene.add(p); people.push(p);
    });
  });
  void stand;

  // ---------- Boxes: mesas con coches, maletas de herramientas y cargadores ----------
  put(-R.x + 9, -R.z + 6, 6, (x, z) => pits(x, z));
  put(R.x - 9, -R.z + 6, 6, (x, z) => pits(x, z));
  function pits(x, z) {
    box(12, 0.3, 4, x, 3.2, z, '#eceff1');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.25, 3.1, 0.25, x + sx * 5.6, 1.55, z + sz * 1.7, '#90a4ae', { solid: false });
    collider(RAPIER.ColliderDesc.cuboid(6, 1.7, 2), { x, y: 1.7, z }, null, { groups: BARRIER_GROUPS });
    const carCols = ['#e53935', '#1e88e5', '#fafafa', '#fdd835'];
    for (let k = 0; k < 3; k++) { // coches de los pilotos en la mesa (carrocería sencilla)
      const cx = x - 4 + k * 3.6;
      box(1.2, 0.3, 2.1, cx, 3.55, z, carCols[(k + Math.floor(rnd() * 4)) % 4], { solid: false });
      box(0.9, 0.25, 1, cx, 3.8, z - 0.1, '#111111', { solid: false, shadow: false });
      for (const wx of [-0.62, 0.62]) for (const wz of [-0.7, 0.7]) cyl(0.3, 0.3, 0.25, cx + wx, 3.6, z + wz, '#1a1a1a', { rot: [0, 0, Math.PI / 2], solid: false, shadow: false });
    }
    box(2, 1, 1.2, x + 4.5, 3.85, z + 1, '#c62828', { solid: false });
    const led = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: '#222', emissive: '#00e676', emissiveIntensity: 0.6 }));
    led.position.set(x + 4.3, 3.6, z - 1.1); led.userData.dynamic = true; scene.add(led);
    anim.push((t) => { led.material.emissiveIntensity = 0.3 + 0.4 * (Math.sin(t * 3 + x) > 0 ? 1 : 0); });
  }

  // ---------- Calle en miniatura a escala del coche: farolas, máquinas y fachadas ----------
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffe0a0', emissiveIntensity: night ? 2.2 : 0.8 });
  for (let k = 0; k < 10; k++) {
    const s = S[Math.floor((k + 0.5) / 10 * N)], side = k % 2 ? 1 : -1;
    const p = s.p.clone().addScaledVector(s.n, side * (W / 2 + 1.0));
    if (circuit.clearance(p.x, p.z) < 0.25) continue;
    cyl(0.07, 0.09, 2.6, p.x, 1.3, p.z, '#37474f', { seg: 6, solid: false });
    const arm = box(0.9, 0.08, 0.08, p.x - s.n.x * side * 0.4, 2.6, p.z - s.n.z * side * 0.4, '#37474f', { solid: false, shadow: false });
    arm.rotation.y = Math.atan2(s.n.x, s.n.z) + Math.PI / 2;
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.2), lampMat);
    bulb.position.set(p.x - s.n.x * side * 0.8, 2.52, p.z - s.n.z * side * 0.8); bulb.userData.dynamic = true; scene.add(bulb);
  }
  const shops = [['RAMEN', '#d32f2f'], ['TUNING', '#1565c0'], ['GARAJE 24H', '#f9a825'], ['SUSHI', '#00897b'], ['NEUMÁTICOS', '#6a1b9a']];
  shops.forEach(([name, c], k) => put((rnd() - 0.5) * R.x * 1.2, (rnd() - 0.5) * R.z * 1.0, 2.6, (x, z) => {
    const ry = Math.atan2(-x, -z);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 2.2), mat(['#eceff1', '#d7ccc8', '#cfd8dc'][k % 3])); wall.position.y = 1.6; g.add(wall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.25, 2.5), mat('#455a64')); roof.position.y = 3.3; g.add(roof);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshStandardMaterial({ color: '#ffe8b0', emissive: '#ffcc66', emissiveIntensity: night ? 1.2 : 0.4 })); win.position.set(0, 1.1, 1.11); g.add(win);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.7), new THREE.MeshStandardMaterial({ map: signTexture(name, c, '#ffffff'), emissive: '#ffffff', emissiveMap: signTexture(name, c, '#ffffff'), emissiveIntensity: night ? 1.0 : 0.3 })); sign.position.set(0, 2.45, 1.12); g.add(sign);
    const vend = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.6), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: night ? 0.7 : 0.2 })); vend.position.set(2.3, 0.8, 0.6); g.add(vend);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    collider(RAPIER.ColliderDesc.cuboid(2.8, 1.7, 1.4), { x, y: 1.7, z }, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), { groups: BARRIER_GROUPS });
  }));

  // ---------- Pancartas y luces LED colgadas ----------
  const ads = ['RE-BACK DRIFT SERIES', 'SLIDE·K NEUMÁTICOS', 'CLUB DE DRIFT RC', 'RB DRIFT · 1:10', 'GIRA, CRUZA Y DISFRUTA'];
  const walls = [[0, -R.z + 0.25, 0], [0, R.z - 0.25, Math.PI], [-R.x + 0.25, 0, Math.PI / 2], [R.x - 0.25, 0, -Math.PI / 2]];
  walls.forEach(([x, z, ry], k) => {
    for (const o of [-0.3, 0.3]) {
      const t = ads[(k * 2 + (o > 0 ? 1 : 0)) % ads.length];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshStandardMaterial({ map: bannerTexture(t, ['#ff3d00', '#111111', '#1565c0', '#00897b'][k % 4]), emissive: '#ffffff', emissiveMap: bannerTexture(t, ['#ff3d00', '#111111', '#1565c0', '#00897b'][k % 4]), emissiveIntensity: night ? 0.5 : 0.08 }));
      const L = Math.abs(ry) === Math.PI / 2 ? R.z : R.x;
      m.position.set(x + (ry === 0 || ry === Math.PI ? o * L : 0), 7, z + (Math.abs(ry) === Math.PI / 2 ? o * L : 0)); m.rotation.y = ry;
      scene.add(m);
    }
  });
  const ledCols = night ? ['#ff1f8e', '#00e5ff', '#b388ff'] : ['#ffffff'];
  for (let k = 0; k < 6; k++) {
    const c = ledCols[k % ledCols.length];
    const m = new THREE.Mesh(new THREE.BoxGeometry(R.x * 1.5, 0.25, 0.4), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: night ? 2.5 : 1.2 }));
    m.position.set(0, R.h - 3, -R.z * 0.75 + k * R.z * 0.3); m.userData.dynamic = true; scene.add(m);
    for (const sx of [-1, 1]) box(0.05, 3, 0.05, sx * R.x * 0.7, R.h - 1.5, m.position.z, '#555555', { solid: false, shadow: false });
  }

  // los pilotos siguen con la cabeza a tu coche
  const _v = new THREE.Vector3();
  const update = (t, race) => {
    for (const f of anim) f(t);
    const P = race?.player?.model?.position;
    if (!P) return;
    for (const p of people) {
      _v.set(P.x / (B.S * B.MX), 0, P.z / B.S);
      const yaw = Math.atan2(_v.x - p.position.x, _v.z - p.position.z) - p.rotation.y;
      const a = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      p.userData.head.rotation.y += (THREE.MathUtils.clamp(a, -1.2, 1.2) - p.userData.head.rotation.y) * 0.1;
    }
  };
  return { clips, update };
}

// Suelo, paredes y techo de la nave
export function driftHall(B, R, { night = false } = {}) {
  const base = night ? '#5e646b' : '#a7adb3';
  const tex = tileFloor(base, [R.x / 8, R.z / 8]);
  const floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: night ? 0.25 : 0.4, metalness: 0.05 });
  room(B, { x: R.x, z: R.z, h: R.h, floor: floorMat, wall: new THREE.MeshStandardMaterial({ color: night ? '#1f2329' : '#d9dde1', roughness: 0.9 }), ceil: night ? '#14171b' : '#eceff1', baseboard: night ? '#111111' : '#9ea7ad' });
  const groundUV = (x, z) => [(x + R.x) / 16, (R.z - z) / 16];
  return { floorMat, groundUV };
}
