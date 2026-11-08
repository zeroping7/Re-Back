import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Modelo de buggy RC 1:10 hecho por código.
// Ejes: +Z adelante, +Y arriba, +X izquierda. Se anima la suspensión (trapecios, amortiguadores, palieres).

const M = {}; // materiales compartidos entre coches
function mats(color) {
  if (!M.ready) {
    M.alu = new THREE.MeshStandardMaterial({ color: '#a7b0ba', metalness: 0.85, roughness: 0.32 });
    M.carbon = new THREE.MeshStandardMaterial({ color: '#1d1f22', metalness: 0.3, roughness: 0.45 });
    M.plastic = new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.7 });
    M.chrome = new THREE.MeshStandardMaterial({ color: '#e8ecef', metalness: 1, roughness: 0.15 });
    M.shock = new THREE.MeshStandardMaterial({ color: '#c8102e', metalness: 0.8, roughness: 0.25 }); // aluminio anodizado
    M.spring = new THREE.MeshStandardMaterial({ color: '#ffd400', metalness: 0.5, roughness: 0.35 });
    M.tire = new THREE.MeshStandardMaterial({ color: '#161616', roughness: 0.92, flatShading: true });
    M.rim = new THREE.MeshStandardMaterial({ color: '#f1f1f1', metalness: 0.2, roughness: 0.35 });
    M.glass = new THREE.MeshPhysicalMaterial({ color: '#0e1621', metalness: 0.2, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 });
    M.ready = true;
  }
  const paint = new THREE.MeshPhysicalMaterial({
    map: bodyTexture(color), roughness: 0.28, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08,
  });
  return paint;
}

export function buildCarModel(color, WHEELS, WHEEL_R, CONN_Y) {
  const g = new THREE.Group();
  const paint = mats(color);
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

  // ---------- Carrocería (policarbonato pintado) ----------
  const bodyShape = new THREE.Shape();
  const P = [
    [-0.84, -0.13], [-0.86, 0.06], [-0.78, 0.14], [-0.5, 0.2], [-0.25, 0.22], [0.1, 0.23],
    [0.42, 0.19], [0.68, 0.1], [0.9, 0.0], [0.93, -0.08], [0.88, -0.13],
  ];
  bodyShape.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) bodyShape.lineTo(P[i][0], P[i][1]);
  bodyShape.closePath();
  const BW = 0.5;
  const body = new THREE.ExtrudeGeometry(bodyShape, { depth: BW, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 3, curveSegments: 4 });
  body.translate(0, 0, -BW / 2);
  body.rotateY(-Math.PI / 2);
  shape(body, (v) => {
    const nose = THREE.MathUtils.clamp((v.z - 0.3) / 0.6, 0, 1);
    const top = THREE.MathUtils.clamp((v.y - 0.05) / 0.2, 0, 1);
    v.x *= 1 - 0.28 * nose - 0.12 * top;
  });
  planarUV(body, 0.95, 0.5);
  add(body, paint, 0, PLATE_Y + 0.22, 0);

  // cabina tintada
  const cab = new THREE.Shape();
  cab.moveTo(-0.34, 0.0); cab.lineTo(-0.2, 0.17); cab.lineTo(0.08, 0.19); cab.lineTo(0.36, 0.0); cab.closePath();
  const cabGeo = new THREE.ExtrudeGeometry(cab, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 3, curveSegments: 3 });
  cabGeo.translate(0, 0, -0.18);
  cabGeo.rotateY(-Math.PI / 2);
  shape(cabGeo, (v) => { if (v.y > 0.08) v.x *= 0.82; });
  add(cabGeo, M.glass, 0, PLATE_Y + 0.43, -0.02);
  // toma de aire trasera
  add(new THREE.BoxGeometry(0.22, 0.08, 0.3), paint, 0, PLATE_Y + 0.46, -0.5);
  add(new THREE.BoxGeometry(0.18, 0.06, 0.02), M.carbon, 0, PLATE_Y + 0.46, -0.35, g, false);

  // pilotos traseros
  const tailMat = new THREE.MeshStandardMaterial({ color: '#550000', emissive: '#ff1a1a', emissiveIntensity: 0.6 });
  const revMat = new THREE.MeshStandardMaterial({ color: '#777', emissive: '#ffffff', emissiveIntensity: 0 });
  for (const s of [1, -1]) add(new THREE.BoxGeometry(0.12, 0.05, 0.03), tailMat, s * 0.2, PLATE_Y + 0.33, -0.95, g, false);
  add(new THREE.BoxGeometry(0.08, 0.04, 0.03), revMat, 0, PLATE_Y + 0.33, -0.95, g, false);

  // ---------- Alerón ----------
  const wing = new THREE.Group();
  wing.position.set(0, PLATE_Y + 0.68, -0.88);
  wing.rotation.x = 0.12;
  g.add(wing);
  const wingGeo = new THREE.BoxGeometry(0.98, 0.025, 0.34, 1, 1, 3);
  shape(wingGeo, (v) => { v.y += Math.sin((v.z / 0.34 + 0.5) * Math.PI) * 0.03; });
  add(wingGeo, paint, 0, 0, 0, wing);
  for (const s of [1, -1]) {
    add(new THREE.BoxGeometry(0.02, 0.14, 0.38), M.carbon, s * 0.49, 0.03, 0, wing, false);
    const strut = add(new THREE.BoxGeometry(0.03, 0.42, 0.06), M.carbon, s * 0.16, -0.22, 0.04, wing, false);
    strut.rotation.x = -0.15;
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

  // ---------- Ruedas ----------
  const tireGeo = makeTire(WHEEL_R);
  const rimGeo = makeRim();
  const wheels = [];
  for (const w of WHEELS) {
    const pivot = new THREE.Group();
    const spin = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, M.tire); tire.castShadow = true; tire.receiveShadow = true;
    const rim = new THREE.Mesh(rimGeo, M.rim); rim.castShadow = false;
    rim.scale.x = w.x > 0 ? 1 : -1; // radios hacia fuera
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 6), M.chrome);
    nut.rotation.z = Math.PI / 2; nut.position.x = Math.sign(w.x) * 0.14;
    spin.add(tire, rim, nut);
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

  g.userData = { wheels, antenna, antennaBase: new THREE.Vector3(-0.1, 0, 0), tailMat, revMat, updateSuspension };
  return g;
}

// Neumático de tacos: perfil torneado + tacos en dos filas alternas
function makeTire(R) {
  const r0 = R - 0.025;
  const prof = [[0.2, -0.15], [0.29, -0.155], [r0 - 0.015, -0.135], [r0, -0.1], [r0, 0.1], [r0 - 0.015, 0.135], [0.29, 0.155], [0.2, 0.15]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const base = new THREE.LatheGeometry(prof, 20);
  base.rotateZ(Math.PI / 2);
  const parts = [base.toNonIndexed()];
  const n = 16;
  for (let row = 0; row < 2; row++) {
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
function bodyTexture(color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 512, 256);
  // franjas a lo largo
  x.fillStyle = '#ffffff';
  x.fillRect(0, 96, 512, 16); x.fillRect(0, 144, 512, 16);
  x.fillStyle = '#111111';
  x.fillRect(0, 112, 512, 32);
  // dorsal en el capó (hacia +Z = derecha de la textura)
  x.fillStyle = '#ffffff';
  x.beginPath(); x.arc(400, 128, 34, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#111'; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.save(); x.translate(400, 128); x.rotate(-Math.PI / 2); x.fillText('7', 0, 2); x.restore();
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
