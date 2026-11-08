import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Modelo de buggy RC 1:10 hecho por código.
// Ejes: +Z adelante, +Y arriba, +X izquierda. Se anima la suspensión (trapecios, amortiguadores, palieres).

const M = {}; // materiales compartidos entre coches

// Perfiles laterales [z, y] de cada tipo de carrocería
const STYLES = {
  buggy: {
    profile: [[-0.84, -0.13], [-0.86, 0.06], [-0.78, 0.14], [-0.5, 0.2], [-0.25, 0.22], [0.1, 0.23], [0.42, 0.19], [0.68, 0.1], [0.9, 0.0], [0.93, -0.08], [0.88, -0.13]],
    width: 0.5, y: 0.22, noseStart: 0.3, noseTaper: 0.28, topStart: 0.05,
    cab: [[-0.34, 0.0], [-0.2, 0.17], [0.08, 0.19], [0.36, 0.0]], cabWidth: 0.36, cabY: 0.43, cabZ: -0.02,
    tailX: 0.2, tailY: 0.33, tailZ: -0.95,
    wing: { y: 0.68, z: -0.88, w: 0.98, strut: 0.42 },
    decal: { x: 0.33, y: 0.24, z: -0.35, size: 0.26 },
  },
  touring: {
    profile: [[-0.98, -0.12], [-1.0, 0.1], [-0.85, 0.16], [-0.5, 0.17], [0.5, 0.17], [0.85, 0.1], [1.02, 0.0], [1.02, -0.1], [0.96, -0.13]],
    width: 1.3, y: 0.24, noseStart: 0.6, noseTaper: 0.12, topStart: 0.1,
    cab: [[-0.5, 0.0], [-0.3, 0.2], [0.15, 0.22], [0.45, 0.0]], cabWidth: 0.95, cabY: 0.43, cabZ: -0.05,
    tailX: 0.5, tailY: 0.34, tailZ: -1.06, headX: 0.45, headY: 0.3, headZ: 1.04,
    wing: { y: 0.66, z: -0.88, w: 1.3, strut: 0.2 },
    decal: { x: 0.71, y: 0.27, z: 0.0, size: 0.3 }, slick: true,
  },
  truck: {
    profile: [[-1.0, -0.05], [-1.0, 0.2], [-0.35, 0.22], [-0.3, 0.24], [0.42, 0.24], [1.0, 0.2], [1.04, 0.02], [0.96, -0.06]],
    width: 1.0, y: 0.5, noseStart: 0.7, noseTaper: 0.1, topStart: 0.3,
    cab: [[-0.32, 0.0], [-0.28, 0.27], [0.18, 0.28], [0.42, 0.0]], cabWidth: 0.92, cabY: 0.74, cabZ: 0.0,
    tailX: 0.4, tailY: 0.62, tailZ: -1.1, headX: 0.38, headY: 0.6, headZ: 1.1,
    wing: null,
    decal: { x: 0.56, y: 0.58, z: 0.55, size: 0.34 },
  },
  rally: {
    profile: [[-0.95, -0.12], [-0.98, 0.12], [-0.9, 0.18], [0.35, 0.2], [0.7, 0.14], [1.0, 0.06], [1.02, -0.08], [0.96, -0.13]],
    width: 1.12, y: 0.26, noseStart: 0.6, noseTaper: 0.12, topStart: 0.1, topTaper: 0.05,
    cab: [[-0.85, 0.0], [-0.8, 0.3], [0.02, 0.33], [0.38, 0.0]], cabWidth: 0.9, cabY: 0.46, cabZ: 0.0, cabTaper: 0.9,
    tailX: 0.45, tailY: 0.36, tailZ: -1.04, headX: 0.42, headY: 0.32, headZ: 1.03,
    wing: { y: 0.85, z: -0.92, w: 0.95, strut: 0.12, d: 0.22, tilt: 0.05 },
    decal: { x: 0.62, y: 0.27, z: 0.1, size: 0.3 },
  },
  van: {
    profile: [[-1.0, -0.12], [-1.02, 0.62], [-0.95, 0.7], [0.45, 0.7], [0.78, 0.36], [1.02, 0.26], [1.04, -0.06], [0.96, -0.13]],
    width: 1.12, y: 0.22, noseStart: 0.8, noseTaper: 0.08, topStart: 0.6, topTaper: 0.04,
    cab: null,
    tailX: 0.45, tailY: 0.45, tailZ: -1.1, headX: 0.42, headY: 0.4, headZ: 1.1,
    wing: null,
    decal: { x: 0.625, y: 0.5, z: 0.25, size: 0.3 }, slick: true,
  },
  f1: {
    profile: null, cab: null,
    tailX: 0.06, tailY: 0.3, tailZ: -0.98,
    wing: { y: 0.7, z: -0.95, w: 1.05, strut: 0.4, d: 0.3, tilt: 0.25 },
    decal: { x: 0.43, y: 0.16, z: -0.2, size: 0.18 }, slick: true,
  },
  bubble: {
    profile: null, cab: null,
    tailX: 0.3, tailY: 0.35, tailZ: -0.93,
    wing: null, decal: null, slick: true,
  },
};

function extrudeProfile(points, width, bt, bs) {
  const sh = new THREE.Shape();
  sh.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) sh.lineTo(points[i][0], points[i][1]);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 3, curveSegments: 4 });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2);
  return geo;
}
function mats(color, number, pattern) {
  if (!M.ready) {
    M.alu = new THREE.MeshStandardMaterial({ color: '#a7b0ba', metalness: 0.85, roughness: 0.32 });
    M.carbon = new THREE.MeshStandardMaterial({ color: '#1d1f22', metalness: 0.3, roughness: 0.45 });
    M.plastic = new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.7 });
    M.chrome = new THREE.MeshStandardMaterial({ color: '#e8ecef', metalness: 1, roughness: 0.15 });
    M.shock = new THREE.MeshStandardMaterial({ color: '#c8102e', metalness: 0.8, roughness: 0.25 }); // aluminio anodizado
    M.spring = new THREE.MeshStandardMaterial({ color: '#ffd400', metalness: 0.5, roughness: 0.35 });
    M.tire = new THREE.MeshStandardMaterial({ color: '#161616', roughness: 0.92, flatShading: true });
    M.rim = new THREE.MeshStandardMaterial({ color: '#f1f1f1', metalness: 0.2, roughness: 0.35 });
    M.head = new THREE.MeshStandardMaterial({ color: '#fffbe6', emissive: '#fff2b0', emissiveIntensity: 1.3 });
    M.helmet = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25, metalness: 0.1 });
    M.wheel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.15, flatShading: true });
    M.glass = new THREE.MeshPhysicalMaterial({ color: '#0e1621', metalness: 0.2, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 });
    M.ready = true;
  }
  const paint = new THREE.MeshPhysicalMaterial({
    map: bodyTexture(color, number, pattern), roughness: 0.28, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08,
  });
  return paint;
}

export function buildCarModel(def, color, WHEELS, CONN_Y) {
  const WHEEL_R = def.wheelR;
  const g = new THREE.Group();
  const paint = mats(color, def.number || '7', def.pattern || 'stripes');
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g, shadow = true) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const PLATE_Y = -0.2;

  // ---------- Chasis ----------
  add(new THREE.BoxGeometry(0.46, 0.035, 1.62), M.alu, 0, PLATE_Y, -0.05);
  const kick = add(new THREE.BoxGeometry(0.36, 0.035, 0.4), M.alu, 0, PLATE_Y + 0.07, 0.9);
  kick.rotation.x = -0.4;
  // cajas de diferencial
  add(new THREE.BoxGeometry(0.3, 0.18, 0.2), M.plastic, 0, PLATE_Y + 0.1, 0.74, g, false);
  add(new THREE.BoxGeometry(0.32, 0.2, 0.24), M.plastic, 0, PLATE_Y + 0.11, -0.72, g, false);
  // motor y batería (se intuyen bajo la carrocería)
  const motor = add(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 12), M.chrome, -0.14, PLATE_Y + 0.11, -0.45, g, false);
  motor.rotation.z = Math.PI / 2;
  add(new THREE.BoxGeometry(0.2, 0.1, 0.62), new THREE.MeshStandardMaterial({ color: '#1a3d8f', roughness: 0.5 }), 0.1, PLATE_Y + 0.07, 0.05, g, false);
  // torretas de amortiguadores (carbono)
  for (const z of [0.69, -0.67]) {
    const tw = add(new THREE.BoxGeometry(0.82, 0.3, 0.03), M.carbon, 0, 0.0, z, g, false);
    tw.rotation.x = z > 0 ? -0.15 : 0.15;
  }
  // parachoques delantero
  const bump = add(new THREE.BoxGeometry(0.62, 0.07, 0.12), M.plastic, 0, PLATE_Y + 0.12, 1.1);
  bump.rotation.x = -0.3;
  for (const s of [1, -1]) {
    const b2 = add(new THREE.BoxGeometry(0.2, 0.07, 0.1), M.plastic, s * 0.36, PLATE_Y + 0.12, 1.05);
    b2.rotation.set(-0.3, s * 0.5, 0);
  }

  // ---------- Carrocería (policarbonato pintado) por estilo ----------
  const style = def.style || 'buggy';
  const S = STYLES[style];
  if (S.profile) {
    const body = extrudeProfile(S.profile, S.width, 0.07, 0.05);
    shape(body, (v) => {
      const nose = THREE.MathUtils.clamp((v.z - S.noseStart) / 0.6, 0, 1);
      const top = THREE.MathUtils.clamp((v.y - S.topStart) / 0.2, 0, 1);
      v.x *= 1 - S.noseTaper * nose - (S.topTaper ?? 0.12) * top;
    });
    planarUV(body, 1.05, S.width / 2 + 0.1);
    add(body, paint, 0, PLATE_Y + S.y, 0);
  }
  if (S.cab) {
    const cabGeo = extrudeProfile(S.cab, S.cabWidth, 0.06, 0.04);
    shape(cabGeo, (v) => { if (v.y > S.cab[1][1] * 0.5) v.x *= S.cabTaper ?? 0.84; });
    add(cabGeo, M.glass, 0, PLATE_Y + S.cabY, S.cabZ);
  }
  EXTRAS[style]?.({ add, paint, P: PLATE_Y, S, g, def, color });

  // calcomanías laterales con el dorsal
  if (S.decal) {
    const dm = decalMat(def.number || '7');
    for (const sd of [1, -1]) {
      const d = add(new THREE.PlaneGeometry(S.decal.size, S.decal.size), dm, sd * S.decal.x, PLATE_Y + S.decal.y, S.decal.z, g, false);
      d.rotation.y = sd * Math.PI / 2;
    }
  }

  // pilotos traseros
  const tailMat = new THREE.MeshStandardMaterial({ color: '#550000', emissive: '#ff1a1a', emissiveIntensity: 0.6 });
  const revMat = new THREE.MeshStandardMaterial({ color: '#777', emissive: '#ffffff', emissiveIntensity: 0 });
  for (const s2 of [1, -1]) add(new THREE.BoxGeometry(0.12, 0.05, 0.03), tailMat, s2 * S.tailX, PLATE_Y + S.tailY, S.tailZ, g, false);
  add(new THREE.BoxGeometry(0.08, 0.04, 0.03), revMat, 0, PLATE_Y + S.tailY, S.tailZ, g, false);
  if (S.headY !== undefined) {
    for (const s2 of [1, -1]) add(new THREE.BoxGeometry(0.16, 0.07, 0.03), M.head, s2 * S.headX, PLATE_Y + S.headY, S.headZ, g, false);
  }

  // ---------- Alerón ----------
  if (S.wing) {
    const wing = new THREE.Group();
    wing.position.set(0, PLATE_Y + S.wing.y, S.wing.z);
    wing.rotation.x = S.wing.tilt ?? 0.12;
    g.add(wing);
    const ww = S.wing.w;
    const wingGeo = new THREE.BoxGeometry(ww, 0.025, S.wing.d ?? 0.34, 1, 1, 3);
    shape(wingGeo, (v) => { v.y += Math.sin((v.z / 0.34 + 0.5) * Math.PI) * 0.03; });
    add(wingGeo, paint, 0, 0, 0, wing);
    for (const s2 of [1, -1]) {
      add(new THREE.BoxGeometry(0.02, 0.14, 0.38), M.carbon, s2 * ww / 2, 0.03, 0, wing, false);
      const strut = add(new THREE.BoxGeometry(0.03, S.wing.strut, 0.06), M.carbon, s2 * 0.16, -S.wing.strut / 2, 0.04, wing, false);
      strut.rotation.x = -0.15;
    }
  }

  // ---------- Antena (tubo con muelle) ----------
  const antenna = new THREE.Group();
  antenna.position.set(-0.17, PLATE_Y + 0.1, -0.28);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 1.15, 5), M.plastic);
  rod.position.y = 0.58;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 6), new THREE.MeshStandardMaterial({ color: '#ff3b30', emissive: '#ff3b30', emissiveIntensity: 0.3 }));
  tip.position.y = 1.16;
  antenna.add(rod, tip);
  g.add(antenna);

  // ---------- Ruedas (una sola malla por rueda con colores por vértice) ----------
  const wheels = [];
  for (const w of WHEELS) {
    const pivot = new THREE.Group();
    const spin = new THREE.Group();
    const wheel = new THREE.Mesh(wheelGeometry(WHEEL_R, w.x > 0 ? 1 : -1, !!S.slick, def.rimColor), M.wheel);
    wheel.castShadow = true; wheel.receiveShadow = true;
    spin.add(wheel);
    pivot.add(spin);
    pivot.position.set(w.x, CONN_Y - 0.3, w.z);
    g.add(pivot);
    wheels.push(pivot);
  }

  // ---------- Suspensión animada ----------
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, -0.5, 0); // de 0 a -1 en Y
  const shockGeo = makeShockUnit();
  const susp = WHEELS.map((w) => {
    const s = Math.sign(w.x);
    const lower = add(unitBox, M.plastic, 0, 0, 0, g, false);
    lower.scale.set(1, 0.035, 0.16);
    const upper = add(unitBox, M.carbon, 0, 0, 0, g, false);
    upper.scale.set(1, 0.02, 0.04);
    const hub = add(new THREE.BoxGeometry(0.05, 0.16, 0.08), M.plastic, 0, 0, 0, g, false);
    const shock = new THREE.Mesh(shockGeo, [M.shock, M.spring]);
    g.add(shock);
    const shaft = add(unitCyl, M.chrome, 0, 0, 0, g, false);
    return { w, s, lower, upper, hub, shock, shaft, top: new THREE.Vector3(s * 0.3, 0.12, w.z + (w.front ? -0.06 : 0.06)) };
  });

  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  const DOWN = new THREE.Vector3(0, -1, 0);
  function link(mesh, p1, p2) {
    mesh.position.addVectors(p1, p2).multiplyScalar(0.5);
    d.subVectors(p2, p1);
    mesh.scale.x = d.length();
    mesh.rotation.set(0, 0, Math.atan2(d.y, d.x));
  }
  function along(mesh, p1, p2, radius) {
    mesh.position.copy(p1);
    d.subVectors(p2, p1);
    const len = d.length();
    mesh.quaternion.setFromUnitVectors(DOWN, d.divideScalar(len));
    mesh.scale.set(radius, len, radius);
  }

  // hubY[i]: altura del centro de cada rueda (local)
  function updateSuspension(hubY) {
    for (let i = 0; i < susp.length; i++) {
      const p = susp[i], ax = Math.abs(p.w.x), s = p.s, z = p.w.z, y = hubY[i];
      // trapecio inferior
      a.set(s * 0.16, PLATE_Y + 0.02, z); b.set(s * (ax - 0.13), y - 0.04, z);
      link(p.lower, a, b);
      const arm = b.clone().lerp(a, 0.28);
      // tirante superior
      a.set(s * 0.12, PLATE_Y + 0.2, z); b.set(s * (ax - 0.15), y + 0.08, z);
      link(p.upper, a, b);
      // mangueta
      p.hub.position.set(s * (ax - 0.14), y, z);
      // amortiguador (de la torreta al trapecio)
      along(p.shock, p.top, arm, 1);
      along(p.shaft, p.top, arm, 0.012);
    }
  }
  updateSuspension(WHEELS.map(() => CONN_Y - 0.25));

  // fusionar piezas fijas por material (menos llamadas de dibujo)
  const dynamic = new Set([antenna, ...wheels]);
  for (const p of susp) { dynamic.add(p.lower); dynamic.add(p.upper); dynamic.add(p.hub); dynamic.add(p.shock); dynamic.add(p.shaft); }
  mergeStatic(g, dynamic);
  const detail = susp.flatMap((p) => [p.lower, p.upper, p.hub, p.shock, p.shaft]);

  g.userData = { detail, wheels, antenna, antennaBase: new THREE.Vector3(-0.1, 0, 0), tailMat, revMat, updateSuspension };
  return g;
}

const wheelCache = new Map();
function wheelGeometry(R, side, slick = false, rimColor = '#eeeeee') {
  const k = R + ':' + side + ':' + slick + ':' + rimColor;
  if (wheelCache.has(k)) return wheelCache.get(k);
  const paint = (geo, hex) => {
    const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  };
  const tire = paint(makeTire(R, slick), '#161616');
  const rimG = makeRim();
  if (side < 0) { rimG.scale(-1, 1, 1); flipWinding(rimG); }
  const rim = paint(rimG, rimColor);
  const nut = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 6).rotateZ(Math.PI / 2).translate(side * 0.14, 0, 0).toNonIndexed();
  nut.deleteAttribute('uv');
  paint(nut, '#9e9e9e');
  const geo = mergeGeometries([tire, rim, nut]);
  wheelCache.set(k, geo);
  return geo;
}

// Neumático de tacos: perfil torneado + tacos en dos filas alternas
function makeTire(R, slick = false) {
  const r0 = R - 0.025;
  const prof = [[0.2, -0.15], [0.29, -0.155], [r0 - 0.015, -0.135], [r0, -0.1], [r0, 0.1], [r0 - 0.015, 0.135], [0.29, 0.155], [0.2, 0.15]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const base = new THREE.LatheGeometry(prof, 20);
  base.rotateZ(Math.PI / 2);
  const parts = [base.toNonIndexed()];
  const n = 16;
  for (let row = 0; row < (slick ? 0 : 2); row++) {
    for (let i = 0; i < n; i++) {
      const ang = ((i + row * 0.5) / n) * Math.PI * 2;
      const k = new THREE.BoxGeometry(0.1, 0.035, 0.075);
      k.translate(row ? -0.06 : 0.06, r0 + 0.012, 0);
      k.rotateX(ang);
      parts.push(k.toNonIndexed());
    }
  }
  for (const p of parts) { p.deleteAttribute('uv'); }
  return mergeGeometries(parts);
}

// Llanta de plato con 6 radios (cara exterior hacia +X)
function makeRim() {
  const parts = [];
  const dish = new THREE.CylinderGeometry(0.21, 0.21, 0.26, 16, 1, true); dish.rotateZ(Math.PI / 2);
  parts.push(dish);
  const face = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16); face.rotateZ(Math.PI / 2); face.translate(0.06, 0, 0);
  parts.push(face);
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.BoxGeometry(0.04, 0.17, 0.045);
    sp.translate(0.11, 0.1, 0);
    sp.rotateX((i / 6) * Math.PI * 2);
    parts.push(sp);
  }
  const lip = new THREE.TorusGeometry(0.205, 0.014, 6, 18); lip.rotateY(Math.PI / 2); lip.translate(0.12, 0, 0);
  parts.push(lip);
  return mergeGeometries(parts.map((p) => { const q = p.index ? p.toNonIndexed() : p; q.deleteAttribute('uv'); return q; }));
}

// Amortiguador de longitud 1 a lo largo de -Y: cuerpo + muelle helicoidal
function makeShockUnit() {
  const body = new THREE.CylinderGeometry(0.032, 0.032, 0.5, 10).translate(0, -0.25, 0);
  const cap = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 10).translate(0, -0.03, 0);
  const pts = [];
  const turns = 7;
  for (let i = 0; i <= turns * 12; i++) {
    const t = i / (turns * 12), ang = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(ang) * 0.048, -0.12 - t * 0.82, Math.sin(ang) * 0.048));
  }
  const spring = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 12, 0.009, 4, false);
  const geos = [body, cap].map((p) => p.toNonIndexed());
  const sp = spring.toNonIndexed();
  // grupos de material: 0 = cuerpo (rojo), 1 = muelle (amarillo)
  const merged = mergeGeometries([...geos, sp], false);
  merged.clearGroups();
  const nBody = geos.reduce((s, q) => s + q.attributes.position.count, 0);
  merged.addGroup(0, nBody, 0);
  merged.addGroup(nBody, sp.attributes.position.count, 1);
  merged.userData.multi = true;
  return merged;
}

// Pintura con franjas y dorsal (proyección cenital)
function bodyTexture(color, number, pattern = 'stripes') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 512, 256);
  if (pattern === 'stripes') {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 96, 512, 16); x.fillRect(0, 144, 512, 16);
    x.fillStyle = '#111111';
    x.fillRect(0, 112, 512, 32);
  } else if (pattern === 'rally') {
    x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(150, 0); x.lineTo(230, 0); x.lineTo(330, 256); x.lineTo(250, 256); x.fill();
    x.fillStyle = '#111';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) x.fillRect(i * 32, 112 + j * 16, 32, 16);
  } else if (pattern === 'flames') {
    const grd = x.createLinearGradient(512, 0, 330, 0);
    grd.addColorStop(0, '#ffeb3b'); grd.addColorStop(0.5, '#ff6f00'); grd.addColorStop(1, '#ff6f0000');
    x.fillStyle = grd;
    for (let i = 0; i < 9; i++) {
      const y = i * 30 + 5;
      x.beginPath(); x.moveTo(512, y); x.quadraticCurveTo(420, y + 8, 330 + (i % 3) * 30, y + 15); x.quadraticCurveTo(420, y + 22, 512, y + 30); x.fill();
    }
  } else if (pattern === 'dots') {
    x.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) { x.beginPath(); x.arc(30 + i * 56 + (j % 2) * 28, 26 + j * 52, 13, 0, Math.PI * 2); x.fill(); }
  } else if (pattern === 'pizza') {
    x.fillStyle = '#ffffff'; x.fillRect(0, 20, 512, 26); x.fillRect(0, 210, 512, 26);
    x.fillStyle = '#2e7d32'; x.fillRect(0, 46, 512, 10); x.fillRect(0, 200, 512, 10);
  }
  // dorsal en el capó (hacia +Z = derecha de la textura)
  x.fillStyle = '#ffffff';
  x.beginPath(); x.arc(400, 128, 34, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#111'; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.save(); x.translate(400, 128); x.rotate(-Math.PI / 2); x.fillText(number, 0, 2); x.restore();
  // detalles
  x.fillStyle = '#00000033';
  for (let i = 0; i < 4; i++) x.fillRect(40 + i * 18, 20, 8, 216);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function shape(geo, fn) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
}

function planarUV(geo, halfLen, halfW) {
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getZ(i) + halfLen) / (halfLen * 2);
    uv[i * 2 + 1] = (p.getX(i) + halfW) / (halfW * 2);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function mergeStatic(g, dynamic) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const byMat = new Map();
  const victims = [];
  g.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    let p = o;
    while (p && p !== g) { if (dynamic.has(p)) return; p = p.parent; }
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const keepUV = !!o.material.map;
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!keepUV) geo.deleteAttribute('uv');
    else if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (!byMat.has(o.material)) byMat.set(o.material, { geos: [], shadow: false });
    const e = byMat.get(o.material);
    e.geos.push(geo); e.shadow ||= o.castShadow;
    victims.push(o);
  });
  for (const o of victims) o.parent.remove(o);
  for (const [m, e] of byMat) {
    const merged = mergeGeometries(e.geos);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = e.shadow; mesh.receiveShadow = true;
    g.add(mesh);
  }
}

function flipWinding(geo) {
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.attributes[name], n = a.itemSize;
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < n; k++) {
        const t = a.array[(i + 1) * n + k];
        a.array[(i + 1) * n + k] = a.array[(i + 2) * n + k];
        a.array[(i + 2) * n + k] = t;
      }
    }
  }
  geo.computeVertexNormals();
}

const decalCache = new Map();
function decalMat(number) {
  if (decalCache.has(number)) return decalCache.get(number);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(64, 54, 40, 0, Math.PI * 2); x.fill();
  x.lineWidth = 6; x.strokeStyle = '#111'; x.stroke();
  x.fillStyle = '#111'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(number, 64, 58);
  x.fillStyle = '#ffd400'; x.fillRect(14, 102, 100, 20);
  x.fillStyle = '#111'; x.font = 'bold 16px sans-serif'; x.fillText('RE-BACK', 64, 113);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
  decalCache.set(number, m);
  return m;
}

// Piezas propias de cada tipo de coche
const EXTRAS = {
  buggy({ add, paint, P }) {
    add(new THREE.BoxGeometry(0.22, 0.08, 0.3), paint, 0, P + 0.46, -0.5);
    add(new THREE.BoxGeometry(0.18, 0.06, 0.02), M.carbon, 0, P + 0.46, -0.35, undefined, false);
  },
  truck({ add, P, S }) {
    const bar = add(new THREE.BoxGeometry(1.0, 0.06, 0.06), M.carbon, 0, P + S.y + 0.62, -0.12);
    for (const s2 of [1, -1]) add(new THREE.BoxGeometry(0.06, 0.32, 0.06), M.carbon, s2 * 0.47, P + S.y + 0.46, -0.12, undefined, false);
    for (let k = -2; k <= 2; k++) add(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8).rotateX(Math.PI / 2), M.head, k * 0.17, P + S.y + 0.69, -0.09, undefined, false);
    bar.castShadow = true;
    add(new THREE.BoxGeometry(0.9, 0.02, 0.6), M.carbon, 0, P + S.y + 0.21, -0.65, undefined, false);
    // tubos de escape cromados
    for (const s2 of [1, -1]) add(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 8), M.chrome, s2 * 0.52, P + S.y + 0.5, -0.38, undefined, false);
    // parrilla
    add(new THREE.BoxGeometry(0.7, 0.14, 0.03), M.chrome, 0, P + S.y + 0.08, 1.06, undefined, false);
  },
  touring({ add, paint, P, S }) {
    add(new THREE.BoxGeometry(1.35, 0.03, 0.2), M.carbon, 0, P + 0.02, 1.0, undefined, false);
    for (const s2 of [1, -1]) add(new THREE.BoxGeometry(0.1, 0.06, 0.06), paint, s2 * 0.62, P + S.y + 0.24, 0.32, undefined, false);
    add(new THREE.BoxGeometry(0.5, 0.08, 0.03), M.carbon, 0, P + S.y + 0.0, 1.06, undefined, false);
  },
  rally({ add, paint, P, S }) {
    // techo pintado, toma de aire, faros auxiliares y faldillas
    add(new THREE.BoxGeometry(0.86, 0.04, 0.82), paint, 0, P + S.cabY + 0.34, -0.25);
    add(new THREE.BoxGeometry(0.22, 0.08, 0.26), M.carbon, 0, P + S.cabY + 0.39, -0.05, undefined, false);
    for (const x of [-0.33, -0.11, 0.11, 0.33]) {
      add(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 10).rotateX(Math.PI / 2), M.head, x, P + S.y + 0.12, 1.08, undefined, false);
    }
    for (const sx of [1, -1]) for (const z of [0.5, -1.0]) add(new THREE.BoxGeometry(0.2, 0.2, 0.02), M.plastic, sx * 0.6, P + 0.05, z, undefined, false);
    add(new THREE.BoxGeometry(1.0, 0.03, 0.18), paint, 0, P + S.cabY + 0.32, -0.75);
  },
  van({ add, paint, P, S }) {
    // ventanas laterales y parabrisas
    for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.02, 0.22, 1.05), M.glass, sx * 0.62, P + S.y + 0.48, -0.25, undefined, false);
    const ws = add(new THREE.BoxGeometry(1.0, 0.3, 0.02), M.glass, 0, P + S.y + 0.52, 0.66, undefined, false);
    ws.rotation.x = -0.85;
    // cartel de pizza en el techo
    const sign = add(new THREE.BoxGeometry(0.7, 0.3, 0.12), [M.plastic, M.plastic, M.plastic, M.plastic, pizzaMat(), pizzaMat()], 0, P + S.y + 0.9, 0.0);
    sign.castShadow = true;
    add(new THREE.BoxGeometry(1.15, 0.08, 0.1), M.chrome, 0, P + S.y - 0.05, 1.08, undefined, false);
    add(new THREE.BoxGeometry(1.15, 0.08, 0.1), M.chrome, 0, P + S.y - 0.05, -1.07, undefined, false);
  },
  f1({ add, paint, P, def }) {
    // monocasco
    const nose = extrudeProfile([[-0.85, -0.08], [-0.88, 0.1], [-0.5, 0.14], [-0.2, 0.16], [0.1, 0.12], [0.7, 0.06], [1.15, 0.0], [1.15, -0.05], [0.6, -0.09]], 0.3, 0.05, 0.04);
    shape(nose, (v) => { const k = THREE.MathUtils.clamp((v.z - 0.3) / 0.85, 0, 1); v.x *= 1 - 0.55 * k; });
    planarUV(nose, 1.05, 0.25);
    add(nose, paint, 0, P + 0.2, 0);
    // pontones laterales
    for (const sx of [1, -1]) {
      const pod = add(new THREE.BoxGeometry(0.26, 0.17, 0.7), paint, sx * 0.3, P + 0.16, -0.2);
      pod.rotation.y = sx * 0.06;
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6).rotateX(Math.PI / 2), M.chrome, sx * 0.09, P + 0.33, -0.95, undefined, false);
    }
    // caja de aire y piloto con casco
    add(new THREE.BoxGeometry(0.14, 0.22, 0.45), paint, 0, P + 0.48, -0.45);
    const helmet = add(new THREE.SphereGeometry(0.13, 12, 10), M.helmet, 0, P + 0.47, -0.05);
    helmet.scale.z = 1.15;
    add(new THREE.BoxGeometry(0.2, 0.06, 0.06), M.glass, 0, P + 0.49, 0.06, undefined, false);
    add(new THREE.BoxGeometry(0.04, 0.03, 0.2), paint, 0, P + 0.6, -0.05, undefined, false);
    // alerón delantero
    add(new THREE.BoxGeometry(1.35, 0.025, 0.24), paint, 0, P + 0.03, 1.1);
    add(new THREE.BoxGeometry(1.25, 0.02, 0.12), M.carbon, 0, P + 0.07, 1.04, undefined, false);
    for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.02, 0.14, 0.28), M.carbon, sx * 0.67, P + 0.08, 1.1, undefined, false);
    // número en el morro
    add(new THREE.PlaneGeometry(0.2, 0.2).rotateX(-Math.PI / 2), decalMat(def.number || '1'), 0, P + 0.29, 0.55, undefined, false);
  },
  bubble({ add, paint, P, def }) {
    // carrocería redonda y burbuja de cristal
    const shell = new THREE.SphereGeometry(0.8, 18, 12);
    shell.scale(0.82, 0.55, 1.15);
    planarUV(shell, 1.05, 0.7);
    add(shell, paint, 0, P + 0.42, 0);
    const dome = new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.scale(1, 0.9, 1.1);
    add(dome, M.glass, 0, P + 0.68, -0.1);
    // ojos-faro de dibujo animado
    for (const sx of [1, -1]) {
      add(new THREE.SphereGeometry(0.15, 12, 8), M.helmet, sx * 0.24, P + 0.55, 0.78);
      add(new THREE.SphereGeometry(0.07, 8, 6), M.carbon, sx * 0.24, P + 0.56, 0.9, undefined, false);
    }
    add(new THREE.TorusGeometry(0.22, 0.03, 6, 16, Math.PI).rotateZ(Math.PI), M.carbon, 0, P + 0.38, 0.88, undefined, false);
    add(new THREE.BoxGeometry(0.9, 0.08, 0.1), M.chrome, 0, P + 0.18, 0.93, undefined, false);
    add(new THREE.BoxGeometry(0.9, 0.08, 0.1), M.chrome, 0, P + 0.18, -0.93, undefined, false);
    add(new THREE.PlaneGeometry(0.26, 0.26).rotateX(-Math.PI / 2).rotateY(Math.PI), decalMat(def.number || '2'), 0, P + 0.86, -0.1, undefined, false);
  },
};

let pizzaM = null;
function pizzaMat() {
  if (pizzaM) return pizzaM;
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#d32f2f'; x.fillRect(0, 0, 256, 96);
  x.fillStyle = '#fff'; x.font = 'italic bold 52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('PIZZA', 128, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  pizzaM = new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.4 });
  return pizzaM;
}
