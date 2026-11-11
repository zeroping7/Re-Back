import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
    arches: true, archX: -0.02, plate: { y: 0.18, zf: 1.075, zr: -1.075 }, mirrors: { x: 0.66, y: 0.5, z: 0.35 }, doors: { z: [0.35, -0.3], y: 0.17, h: 0.2 },
  },
  truck: {
    profile: [[-1.0, -0.05], [-1.0, 0.2], [-0.35, 0.22], [-0.3, 0.24], [0.42, 0.24], [1.0, 0.2], [1.04, 0.02], [0.96, -0.06]],
    width: 1.0, y: 0.5, noseStart: 0.7, noseTaper: 0.1, topStart: 0.3,
    cab: [[-0.32, 0.0], [-0.28, 0.27], [0.18, 0.28], [0.42, 0.0]], cabWidth: 0.92, cabY: 0.74, cabZ: 0.0,
    tailX: 0.4, tailY: 0.62, tailZ: -1.1, headX: 0.38, headY: 0.6, headZ: 1.1,
    wing: null,
    decal: { x: 0.56, y: 0.58, z: 0.55, size: 0.34 },
    plate: { y: 0.36, zr: -1.08 }, mirrors: { x: 0.56, y: 0.92, z: 0.38 },
  },
  // CRW-06: carrocerías propias de los crawlers
  jeep: { // Cabra: todoterreno abierto con barra antivuelco y rueda de repuesto
    profile: [[-1.0, -0.05], [-1.0, 0.32], [-0.2, 0.34], [0.25, 0.3], [0.32, 0.2], [1.0, 0.18], [1.04, 0.02], [0.96, -0.06]],
    width: 0.96, y: 0.5, noseStart: 0.8, noseTaper: 0.08, topStart: 0.3,
    cab: [[-0.12, 0.0], [-0.1, 0.2], [0.08, 0.22], [0.24, 0.0]], cabWidth: 0.84, cabY: 0.82, cabZ: 0.08,
    tailX: 0.38, tailY: 0.6, tailZ: -1.1, headX: 0.36, headY: 0.58, headZ: 1.1,
    wing: null,
    decal: { x: 0.54, y: 0.62, z: 0.1, size: 0.32 },
    plate: { y: 0.34, zr: -1.08 }, mirrors: { x: 0.52, y: 0.92, z: 0.3 },
  },
  crawler: { // Oruga: ancho, largo y pegado al suelo, con cabrestante
    profile: [[-1.08, -0.06], [-1.08, 0.12], [-0.3, 0.14], [0.5, 0.14], [1.06, 0.1], [1.1, 0.0], [1.0, -0.06]],
    width: 1.16, y: 0.46, noseStart: 0.8, noseTaper: 0.06, topStart: 0.1, topTaper: 0.06,
    cab: [[-0.4, 0.0], [-0.34, 0.2], [0.1, 0.22], [0.34, 0.0]], cabWidth: 0.84, cabY: 0.6, cabZ: -0.1,
    tailX: 0.45, tailY: 0.52, tailZ: -1.14, headX: 0.42, headY: 0.5, headZ: 1.12,
    wing: null,
    decal: { x: 0.6, y: 0.54, z: 0.35, size: 0.34 },
    plate: { y: 0.32, zr: -1.12 }, mirrors: { x: 0.5, y: 0.8, z: 0.2 },
  },
  bigfoot: { // Yeti: cabina alta y cuadrada, barra de focos y cuernos de hielo
    profile: [[-1.0, -0.05], [-1.0, 0.3], [-0.4, 0.32], [0.4, 0.32], [1.0, 0.26], [1.04, 0.02], [0.96, -0.06]],
    width: 1.02, y: 0.55, noseStart: 0.7, noseTaper: 0.08, topStart: 0.3,
    cab: [[-0.46, 0.0], [-0.42, 0.34], [0.18, 0.36], [0.42, 0.0]], cabWidth: 0.92, cabY: 0.87, cabZ: -0.02,
    tailX: 0.4, tailY: 0.7, tailZ: -1.1, headX: 0.38, headY: 0.62, headZ: 1.1,
    wing: null,
    decal: { x: 0.58, y: 0.7, z: 0.6, size: 0.34 },
    plate: { y: 0.4, zr: -1.08 }, mirrors: { x: 0.58, y: 1.0, z: 0.34 },
  },
  hauler: { // Morsa: camión con cabina adelantada, colmillos y caja volquete
    profile: [[-1.0, -0.05], [-1.0, 0.2], [-0.05, 0.22], [0.1, 0.3], [1.0, 0.3], [1.06, 0.02], [0.96, -0.06]],
    width: 1.06, y: 0.5, noseStart: 0.7, noseTaper: 0.06, topStart: 0.3,
    cab: [[-0.2, 0.0], [-0.16, 0.3], [0.4, 0.32], [0.58, 0.0]], cabWidth: 0.94, cabY: 0.8, cabZ: 0.36,
    tailX: 0.42, tailY: 0.6, tailZ: -1.1, headX: 0.4, headY: 0.62, headZ: 1.12,
    wing: null,
    decal: { x: 0.6, y: 0.62, z: 0.7, size: 0.34 },
    plate: { y: 0.36, zr: -1.08 }, mirrors: { x: 0.6, y: 1.0, z: 0.6 },
  },
  rally: {
    profile: [[-0.95, -0.12], [-0.98, 0.12], [-0.9, 0.18], [0.35, 0.2], [0.7, 0.14], [1.0, 0.06], [1.02, -0.08], [0.96, -0.13]],
    width: 1.12, y: 0.26, noseStart: 0.6, noseTaper: 0.12, topStart: 0.1, topTaper: 0.05,
    cab: [[-0.85, 0.0], [-0.8, 0.3], [0.02, 0.33], [0.38, 0.0]], cabWidth: 0.9, cabY: 0.46, cabZ: 0.0, cabTaper: 0.9,
    tailX: 0.45, tailY: 0.36, tailZ: -1.04, headX: 0.42, headY: 0.32, headZ: 1.03,
    wing: { y: 0.85, z: -0.92, w: 0.95, strut: 0.12, d: 0.22, tilt: 0.05 },
    decal: { x: 0.62, y: 0.27, z: 0.1, size: 0.3 },
    flatArches: true, plate: { y: 0.2, zf: 1.08, zr: -1.06 }, mirrors: { x: 0.6, y: 0.62, z: 0.3 }, doors: { z: [0.32, -0.38], y: 0.22, h: 0.26 },
  },
  van: {
    profile: [[-1.0, -0.12], [-1.02, 0.62], [-0.95, 0.7], [0.45, 0.7], [0.78, 0.36], [1.02, 0.26], [1.04, -0.06], [0.96, -0.13]],
    width: 1.12, y: 0.22, noseStart: 0.8, noseTaper: 0.08, topStart: 0.6, topTaper: 0.04,
    cab: null,
    tailX: 0.45, tailY: 0.45, tailZ: -1.1, headX: 0.42, headY: 0.4, headZ: 1.1,
    wing: null,
    decal: { x: 0.625, y: 0.42, z: 0.25, size: 0.3 }, slick: true,
    arches: false, archX: 0.01, plate: { y: 0.22, zf: 1.12, zr: -1.08 }, mirrors: { x: 0.64, y: 0.62, z: 0.6 }, doors: { z: [0.55, -0.05], y: 0.4, h: 0.55 },
  },
  // DCO-02: carrocerías de drift (turismos RC 1:10 con kit ancho, sin marcas reales)
  coupe: { // cupé japonés de los 90 con alerón grande
    profile: [[-1.0, -0.12], [-1.02, 0.12], [-0.92, 0.17], [-0.55, 0.18], [0.45, 0.18], [0.8, 0.12], [1.04, 0.04], [1.05, -0.08], [0.98, -0.13]],
    width: 1.3, y: 0.22, noseStart: 0.6, noseTaper: 0.12, topStart: 0.1,
    cab: [[-0.62, 0.0], [-0.4, 0.2], [0.1, 0.22], [0.45, 0.0]], cabWidth: 0.95, cabY: 0.41, cabZ: -0.08,
    tailX: 0.42, tailY: 0.32, tailZ: -1.06, headX: 0.44, headY: 0.27, headZ: 1.06,
    wing: { y: 0.74, z: -0.86, w: 1.32, strut: 0.26, d: 0.3, tilt: 0.1 },
    decal: { x: 0.71, y: 0.25, z: 0.05, size: 0.28 }, slick: true,
    arches: true, archX: -0.02, plate: { y: 0.15, zf: 1.09, zr: -1.08 }, mirrors: { x: 0.66, y: 0.48, z: 0.32 }, doors: { z: [0.33, -0.3], y: 0.16, h: 0.2 },
    roundTail: true, drift: true, drop: 0.2,
  },
  roadster: { // descapotable pequeño con techo duro
    profile: [[-0.9, -0.12], [-0.93, 0.1], [-0.8, 0.16], [-0.3, 0.17], [0.4, 0.16], [0.85, 0.08], [0.98, 0.0], [0.96, -0.1], [0.88, -0.13]],
    width: 1.22, y: 0.22, noseStart: 0.55, noseTaper: 0.16, topStart: 0.08, topTaper: 0.14,
    cab: [[-0.44, 0.0], [-0.3, 0.17], [0.0, 0.18], [0.24, 0.0]], cabWidth: 0.86, cabY: 0.39, cabZ: -0.16,
    tailX: 0.4, tailY: 0.3, tailZ: -0.96, headX: 0.36, headY: 0.25, headZ: 0.97,
    wing: { y: 0.46, z: -0.86, w: 1.0, strut: 0.04, d: 0.16, tilt: 0.22 },
    decal: { x: 0.67, y: 0.24, z: 0.1, size: 0.26 }, slick: true,
    arches: true, archX: -0.02, plate: { y: 0.14, zf: 0.99, zr: -0.98 }, mirrors: { x: 0.6, y: 0.44, z: 0.15 }, doors: { z: [0.2], y: 0.16, h: 0.18 },
    drift: true, drop: 0.2,
  },
  sedan: { // berlina cuadrada de los 80 con aletas anchas
    profile: [[-1.0, -0.12], [-1.01, 0.16], [-0.95, 0.19], [0.6, 0.19], [0.98, 0.16], [1.03, -0.1], [0.96, -0.13]],
    width: 1.18, y: 0.22, noseStart: 0.8, noseTaper: 0.04, topStart: 0.12, topTaper: 0.05,
    cab: [[-0.62, 0.0], [-0.52, 0.25], [0.24, 0.26], [0.46, 0.0]], cabWidth: 1.0, cabY: 0.43, cabZ: -0.05, cabTaper: 0.93,
    tailX: 0.4, tailY: 0.3, tailZ: -1.05, headX: 0.38, headY: 0.26, headZ: 1.05,
    wing: { y: 0.49, z: -0.95, w: 1.05, strut: 0.04, d: 0.18, tilt: 0.25 },
    decal: { x: 0.65, y: 0.25, z: 0.05, size: 0.28 }, slick: true,
    arches: false, plate: { y: 0.14, zf: 1.08, zr: -1.07 }, mirrors: { x: 0.62, y: 0.52, z: 0.32 }, doors: { z: [0.3, -0.26], y: 0.17, h: 0.22 },
    flares: true, quadHead: true, drift: true, drop: 0.2,
  },
  hatch: { // compacto de los 80 con portón inclinado
    profile: [[-0.94, -0.12], [-0.97, 0.12], [-0.9, 0.17], [0.4, 0.18], [0.72, 0.13], [1.0, 0.05], [1.02, -0.08], [0.96, -0.13]],
    width: 1.18, y: 0.22, noseStart: 0.6, noseTaper: 0.1, topStart: 0.1, topTaper: 0.06,
    cab: [[-0.9, 0.0], [-0.74, 0.25], [0.0, 0.27], [0.38, 0.0]], cabWidth: 0.96, cabY: 0.41, cabZ: 0.0, cabTaper: 0.9,
    tailX: 0.42, tailY: 0.3, tailZ: -1.0, headX: 0.38, headY: 0.26, headZ: 1.03,
    wing: { y: 0.71, z: -0.82, w: 0.95, strut: 0.03, d: 0.16, tilt: 0.12 },
    decal: { x: 0.65, y: 0.25, z: 0.12, size: 0.28 }, slick: true,
    arches: true, archX: -0.01, plate: { y: 0.14, zf: 1.07, zr: -1.0 }, mirrors: { x: 0.62, y: 0.5, z: 0.32 }, doors: { z: [0.34, -0.24], y: 0.17, h: 0.22 },
    drift: true, drop: 0.2,
  },
  muscle: { // deportivo americano con compresor sobre el capó
    profile: [[-1.0, -0.1], [-1.02, 0.15], [-0.86, 0.2], [-0.3, 0.2], [0.2, 0.2], [0.94, 0.17], [1.06, 0.06], [1.05, -0.1], [0.98, -0.13]],
    width: 1.3, y: 0.22, noseStart: 0.8, noseTaper: 0.05, topStart: 0.12, topTaper: 0.06,
    cab: [[-0.56, 0.0], [-0.4, 0.2], [-0.06, 0.21], [0.26, 0.0]], cabWidth: 0.96, cabY: 0.44, cabZ: -0.26,
    tailX: 0.45, tailY: 0.33, tailZ: -1.06, headX: 0.46, headY: 0.29, headZ: 1.07,
    wing: { y: 0.54, z: -0.97, w: 1.25, strut: 0.08, d: 0.16, tilt: 0.25 },
    decal: { x: 0.71, y: 0.27, z: -0.1, size: 0.28 }, slick: true,
    arches: true, archX: -0.02, plate: { y: 0.16, zf: 1.09, zr: -1.08 }, mirrors: { x: 0.66, y: 0.52, z: 0.08 }, doors: { z: [0.12, -0.45], y: 0.18, h: 0.22 },
    drift: true, drop: 0.2,
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
  rocket: {
    profile: null, cab: null,
    tailX: 0.2, tailY: 0.22, tailZ: -0.9,
    wing: null, decal: null, slick: true,
  },
};

// suaviza un perfil poligonal (Chaikin): esquinas redondeadas como una carrocería real
function chaikin(pts, it = 2) {
  for (let k = 0; k < it; k++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    pts = out;
  }
  return pts;
}
const smooth = (geo, ang = 0.7) => toCreasedNormals(geo, ang);

function extrudeProfile(points, width, bt, bs) {
  points = chaikin(points);
  const sh = new THREE.Shape();
  sh.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) sh.lineTo(points[i][0], points[i][1]);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 4, curveSegments: 4 });
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
    M.lens = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.6 });
    M.arch = new THREE.MeshStandardMaterial({ color: '#1c1c1e', roughness: 0.8 });
    M.disc = new THREE.MeshStandardMaterial({ color: '#8a8f96', metalness: 0.9, roughness: 0.35 });
    M.caliper = new THREE.MeshStandardMaterial({ color: '#d32f2f', metalness: 0.4, roughness: 0.4 });
    M.head = new THREE.MeshStandardMaterial({ color: '#fffbe6', emissive: '#fff2b0', emissiveIntensity: 1.3 });
    M.helmet = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25, metalness: 0.1 });
    M.wheel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.15, flatShading: true });
    M.glass = new THREE.MeshPhysicalMaterial({ color: '#0e1621', metalness: 0.2, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 });
    M.ready = true;
  }
  const paint = new THREE.MeshPhysicalMaterial({
    map: bodyTexture(color, number, pattern), roughness: 0.28, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08,
  });
  addDirt(paint);
  return paint;
}

// Barro en la carrocería: manchas que crecen desde abajo según uDirt (0 limpio … 1 embarrado).
// uRoot pasa los vértices a coordenadas del coche para que las manchas no "naden" al moverse.
function addDirt(m) {
  const dirt = { value: 0 }, root = { value: new THREE.Matrix4() };
  m.userData.dirt = dirt; m.userData.root = root;
  m.customProgramCacheKey = () => 'paint-dirt';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDirt = dirt; sh.uniforms.uRoot = root;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uRoot; varying vec3 vDirtP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDirtP = (uRoot * modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uDirt; varying vec3 vDirtP;
float dHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float dNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dHash(i), dHash(i + vec3(1, 0, 0)), f.x), mix(dHash(i + vec3(0, 1, 0)), dHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(dHash(i + vec3(0, 0, 1)), dHash(i + vec3(1, 0, 1)), f.x), mix(dHash(i + vec3(0, 1, 1)), dHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
float dM = 0.0;
if (uDirt > 0.002) {
  float n = dNoise(vDirtP * 6.0) * 0.55 + dNoise(vDirtP * 17.0) * 0.3 + dNoise(vDirtP * 45.0) * 0.15;
  float low = clamp(0.55 - vDirtP.y * 2.4, 0.0, 1.0);
  float th = 1.0 - uDirt * (0.6 + low * 0.9);
  dM = smoothstep(th, th + 0.06, n) * min(1.0, uDirt * 2.0);
  vec3 mud = mix(vec3(0.13, 0.085, 0.05), vec3(0.24, 0.17, 0.1), dNoise(vDirtP * 60.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, mud, dM);
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.8, dM);')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.clearcoat *= 1.0 - dM;');
  };
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
  // bocas de escape (COC-23): posición y dirección de salida del humo en coordenadas del modelo
  const exhausts = [];
  const exh = (x, y, z, dx = 0, dy = 0, dz = -1) => exhausts.push({ pos: new THREE.Vector3(x, y, z), dir: new THREE.Vector3(dx, dy, dz).normalize() });

  const PLATE_Y = -0.2;

  const style = def.style || 'buggy';
  const S = STYLES[style];
  // ---------- Chasis ----------
  add(new THREE.BoxGeometry(0.46, 0.035, 1.62), M.alu, 0, PLATE_Y, -0.05);
  if (!S.drift) {
    const kick = add(new THREE.BoxGeometry(0.36, 0.035, 0.4), M.alu, 0, PLATE_Y + 0.07, 0.9);
    kick.rotation.x = -0.4;
  }
  // cajas de diferencial
  if (!S.drift) {
    add(new THREE.BoxGeometry(0.3, 0.18, 0.2), M.plastic, 0, PLATE_Y + 0.1, 0.74, g, false);
    add(new THREE.BoxGeometry(0.32, 0.2, 0.24), M.plastic, 0, PLATE_Y + 0.11, -0.72, g, false);
  }
  // motor y batería (se intuyen bajo la carrocería)
  const motor = add(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 12), M.chrome, -0.14, PLATE_Y + 0.11, -0.45, g, false);
  motor.rotation.z = Math.PI / 2;
  add(new THREE.BoxGeometry(0.2, 0.1, 0.62), new THREE.MeshStandardMaterial({ color: '#1a3d8f', roughness: 0.5 }), 0.1, PLATE_Y + 0.07, 0.05, g, false);
  if (!S.drift) {
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
  }
  // ---------- Carrocería (policarbonato pintado) por estilo ----------
  const PB = PLATE_Y - (S.drop || 0); // carrocerías bajas (drift): las ruedas quedan dentro de los pasos
  if (S.profile) {
    const body = extrudeProfile(S.profile, S.width, 0.07, 0.05);
    shape(body, (v) => {
      const nose = THREE.MathUtils.clamp((v.z - S.noseStart) / 0.6, 0, 1);
      const top = THREE.MathUtils.clamp((v.y - S.topStart) / 0.2, 0, 1);
      v.x *= 1 - S.noseTaper * nose - (S.topTaper ?? 0.12) * top;
    });
    const sb = smooth(body);
    planarUV(sb, 1.05, S.width / 2 + 0.1);
    add(sb, paint, 0, PB + S.y, 0);
  }
  if (S.cab) {
    const cabGeo = extrudeProfile(S.cab, S.cabWidth, 0.06, 0.04);
    shape(cabGeo, (v) => { if (v.y > S.cab[1][1] * 0.5) v.x *= S.cabTaper ?? 0.84; });
    add(smooth(cabGeo), M.glass, 0, PB + S.cabY, S.cabZ);
  }
  EXTRAS[style]?.({ add, exh, paint, P: PB, S, g, def, color, W: WHEELS, R: WHEEL_R, CONN_Y });
  // techo pintado sobre el cristal (drift)
  if (S.drift && S.cab) {
    const c0 = S.cab[1], c1 = S.cab[2], tw = S.cabWidth * (S.cabTaper ?? 0.84);
    const roof = add(new THREE.BoxGeometry(tw + 0.05, 0.035, c1[0] - c0[0] + 0.02), paint, 0, PB + S.cabY + Math.min(c0[1], c1[1]) + 0.045, S.cabZ + (c0[0] + c1[0]) / 2);
    roof.castShadow = true;
  }
  // pasos de rueda (aletas) en carrocerías cerradas
  if (S.flatArches && !def.noArches) {
    // aletas planas de rally: banda de sección rectangular (no tubo) desde el costado de la carrocería hasta cubrir todo el ancho del neumático, con labio exterior
    const hubY = CONN_Y - 0.26;
    const Ro = WHEEL_R + 0.075, Ri = WHEEL_R + 0.045, Rl = WHEEL_R + 0.115;
    const body0 = S.width / 2 - 0.03, tireOut = Math.abs(WHEELS[0].x) + 0.16 + 0.015;
    const L = tireOut - body0, xc = (body0 + tireOut) / 2;
    const arc = (r1, r0) => {
      const sh = new THREE.Shape();
      sh.absarc(0, 0, r1, 0, Math.PI, false);
      sh.absarc(0, 0, r0, Math.PI, 0, true);
      sh.closePath();
      return sh;
    };
    const band = new THREE.ExtrudeGeometry(arc(Ro, Ri), { depth: L, bevelEnabled: false, curveSegments: 20 }).translate(0, 0, -L / 2);
    const lip = new THREE.ExtrudeGeometry(arc(Rl, Ri), { depth: 0.014, bevelEnabled: false, curveSegments: 20 }).translate(0, 0, L / 2 - 0.014);
    for (const w of WHEELS) {
      const sx = Math.sign(w.x);
      for (const [geo, mat] of [[band, paint], [lip, paint]]) {
        const a = add(geo.clone().toNonIndexed(), mat, sx * xc, hubY, w.z, g, false);
        a.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
  } else if (S.arches && !def.noArches) {
    const hubY = CONN_Y - 0.26;
    for (const w of WHEELS) {
      const sx = Math.sign(w.x);
      const a = add(new THREE.TorusGeometry(WHEEL_R + 0.07, S.drift ? 0.07 : 0.05, 6, 18, Math.PI), S.drift ? paint : M.arch, sx * (S.width / 2 + S.archX), hubY, w.z, g, false);
      a.rotation.y = Math.PI / 2;
    }
  }
  // matrícula
  if (S.plate) {
    for (const z of [S.plate.zf, S.plate.zr]) {
      if (z === undefined) continue;
      const pl = add(new THREE.PlaneGeometry(0.34, 0.1), plateMat(def.number || '7'), 0, PB + S.plate.y, z, g, false);
      if (z < 0) pl.rotation.y = Math.PI;
    }
  }
  // retrovisores
  if (S.mirrors) {
    for (const sx of [1, -1]) {
      const m = add(new THREE.BoxGeometry(0.1, 0.07, 0.05), paint, sx * S.mirrors.x, PB + S.mirrors.y, S.mirrors.z, g, false);
      add(new THREE.PlaneGeometry(0.08, 0.05), M.chrome, sx * S.mirrors.x, PB + S.mirrors.y, S.mirrors.z - 0.026, g, false).rotation.y = Math.PI;
      m.castShadow = true;
    }
  }
  // líneas de puertas
  if (S.doors) {
    for (const sx of [1, -1]) for (const z of S.doors.z) {
      add(new THREE.BoxGeometry(0.005, S.doors.h, 0.012), M.carbon, sx * (S.width / 2 + 0.052), PB + S.doors.y, z, g, false);
    }
  }

  // calcomanías laterales con el dorsal
  if (S.decal) {
    const dm = decalMat(def.number || '7');
    for (const sd of [1, -1]) {
      const d = add(new THREE.PlaneGeometry(S.decal.size, S.decal.size), dm, sd * S.decal.x, PB + S.decal.y, S.decal.z, g, false);
      d.rotation.y = sd * Math.PI / 2;
    }
  }

  // pilotos traseros
  const tailMat = new THREE.MeshStandardMaterial({ color: '#550000', emissive: '#ff1a1a', emissiveIntensity: 0.6 });
  const revMat = new THREE.MeshStandardMaterial({ color: '#777', emissive: '#ffffff', emissiveIntensity: 0 });
  for (const s2 of [1, -1]) {
    add(new THREE.BoxGeometry(0.14, 0.06, 0.03), tailMat, s2 * S.tailX, PB + S.tailY, S.tailZ, g, false);
    add(new THREE.BoxGeometry(0.16, 0.08, 0.02), M.lens, s2 * S.tailX, PB + S.tailY, S.tailZ - 0.02, g, false);
  }
  add(new THREE.BoxGeometry(0.08, 0.04, 0.03), revMat, 0, PB + S.tailY, S.tailZ, g, false);
  if (S.headY !== undefined) {
    for (const s2 of [1, -1]) {
      add(new THREE.BoxGeometry(0.17, 0.08, 0.03), M.head, s2 * S.headX, PB + S.headY, S.headZ, g, false);
      add(new THREE.BoxGeometry(0.19, 0.1, 0.02), M.lens, s2 * S.headX, PB + S.headY, S.headZ + 0.02, g, false);
    }
  }

  // ---------- Alerón ----------
  if (S.wing) {
    const wing = new THREE.Group();
    wing.position.set(0, PB + S.wing.y, S.wing.z);
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
  if (S.drift) antenna.scale.setScalar(0.001); // los de drift no llevan antena

  // ---------- Ruedas (una sola malla por rueda con colores por vértice) ----------
  const wheels = [];
  for (const w of WHEELS) {
    const pivot = new THREE.Group();
    const spin = new THREE.Group();
    const wheel = new THREE.Mesh(wheelGeometry(WHEEL_R, w.x > 0 ? 1 : -1, !!(def.slickWheels ?? S.slick), def.rimColor, def.spokes), M.wheel);
    wheel.castShadow = true; wheel.receiveShadow = true;
    spin.add(wheel);
    pivot.add(spin);
    // disco y pinza de freno (no giran)
    const sx = Math.sign(w.x), k = WHEEL_R / 0.37;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * k, 0.15 * k, 0.025, 16).rotateZ(Math.PI / 2), M.disc);
    disc.position.x = -sx * 0.02; pivot.add(disc);
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1 * k, 0.12 * k), M.caliper);
    cal.position.set(sx * 0.0, 0.1 * k, -0.06 * k); pivot.add(cal);
    pivot.position.set(w.x, CONN_Y - 0.3, w.z);
    if (def.camber) pivot.rotation.z = sx * def.camber; // caída negativa de los coches de drift
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
  const shell = mergeStatic(g, dynamic);
  const dmg = makeDamage(shell, paint);
  // carrocería cerrada y baja (drift): los amortiguadores no se ven y asomarían por el capó
  if (S.drift) for (const p of susp) for (const m of [p.upper, p.shock, p.shaft]) m.scale.set(0, 0, 0), (m.userData.hide = true);
  const detail = susp.flatMap((p) => [p.lower, p.upper, p.hub, p.shock, p.shaft]).filter((m) => !m.userData.hide);
  if (S.drift) for (const p of susp) { p.upper.visible = p.shock.visible = p.shaft.visible = false; }

  g.userData = { ...dmg, exhausts, detail, wheels, antenna, antennaBase: new THREE.Vector3(-0.1, 0, 0), tailMat, revMat, updateSuspension, paint };
  return g;
}

const wheelCache = new Map();
function wheelGeometry(R, side, slick = false, rimColor = '#eeeeee', spokes) {
  const k = R + ':' + side + ':' + slick + ':' + rimColor + ':' + spokes;
  if (wheelCache.has(k)) return wheelCache.get(k);
  const paint = (geo, hex) => {
    const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  };
  const tire = paint(makeTire(R, slick), '#161616');
  const rimG = makeRim(R, spokes || (slick ? 10 : 6));
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
  const k = R / 0.37; // el talón y el flanco se escalan con la rueda (antes eran fijos y sobresalían del taco en ruedas pequeñas)
  const prof = [[0.2 * k, -0.15], [0.29 * k, -0.155], [r0 - 0.015, -0.135], [r0, -0.1], [r0, 0.1], [r0 - 0.015, 0.135], [0.29 * k, 0.155], [0.2 * k, 0.15]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const base = new THREE.LatheGeometry(prof, 28);
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
function makeRim(R = 0.37, spokes = 6) {
  const k = R / 0.37;
  const parts = [];
  const dish = new THREE.CylinderGeometry(0.21, 0.21, 0.26, 16, 1, true); dish.rotateZ(Math.PI / 2);
  parts.push(dish);
  const face = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16); face.rotateZ(Math.PI / 2); face.translate(0.06, 0, 0);
  parts.push(face);
  for (let i = 0; i < spokes; i++) {
    const sp = new THREE.BoxGeometry(0.04, 0.17, spokes > 6 ? 0.026 : 0.045);
    sp.translate(0.11, 0.1, 0);
    sp.rotateX((i / spokes) * Math.PI * 2);
    parts.push(sp);
  }
  const hub = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8); hub.rotateZ(Math.PI / 2); hub.translate(0.11, 0, 0);
  parts.push(hub);
  const lip = new THREE.TorusGeometry(0.205, 0.014, 6, 18); lip.rotateY(Math.PI / 2); lip.translate(0.12, 0, 0);
  parts.push(lip);
  return mergeGeometries(parts.map((p) => { const q = p.index ? p.toNonIndexed() : p; q.deleteAttribute('uv'); return q; })).scale(1, k, k);
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
  } else if (pattern === 'carbon') { // capó de carbono y franja lateral
    x.fillStyle = '#16181b'; x.fillRect(330, 0, 182, 256);
    x.fillStyle = '#2a2d31';
    for (let i = 330; i < 512; i += 8) for (let j = 0; j < 256; j += 8) if (((i + j) / 8) % 2 < 1) x.fillRect(i, j, 4, 4);
    x.fillStyle = '#ffffffcc'; x.fillRect(0, 10, 330, 6); x.fillRect(0, 240, 330, 6);
  } else if (pattern === 'livery') { // decoración de patrocinadores inventados
    const cols = ['#ffffff', '#111111', '#ff3d00'];
    x.fillStyle = cols[0]; x.beginPath(); x.moveTo(0, 0); x.lineTo(180, 0); x.lineTo(80, 256); x.lineTo(0, 256); x.fill();
    x.fillStyle = cols[2]; x.beginPath(); x.moveTo(180, 0); x.lineTo(215, 0); x.lineTo(115, 256); x.lineTo(80, 256); x.fill();
    x.save(); x.translate(250, 128); x.rotate(-Math.PI / 2);
    x.fillStyle = '#111'; x.font = 'bold italic 34px sans-serif'; x.textAlign = 'center'; x.fillText('SLIDE·K', 0, -40);
    x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.fillText('RB DRIFT', 0, 40); x.restore();
  } else if (pattern === 'yellow') { // dos franjas amarillas de punta a punta
    x.fillStyle = '#ffd400'; x.fillRect(0, 92, 512, 26); x.fillRect(0, 138, 512, 26);
  } else if (pattern === 'twotone') { // dos tonos: techo claro y capó oscuro
    x.fillStyle = '#f5f5f5'; x.fillRect(120, 30, 230, 196);
    x.fillStyle = '#111111'; x.fillRect(360, 0, 152, 256);
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
  const out = [];
  for (const [m, e] of byMat) {
    const merged = mergeGeometries(e.geos);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = e.shadow; mesh.receiveShadow = true;
    g.add(mesh);
    out.push(mesh);
  }
  return out;
}

// Abolladuras y desgaste de la carrocería
function makeDamage(shell, paint) {
  const orig = shell.map((m) => m.geometry.attributes.position.array.slice());
  const origN = shell.map((m) => m.geometry.attributes.normal.array.slice());
  const base = { rough: paint.roughness, coat: paint.clearcoat };
  const dirt = new THREE.Color('#5a4a3a');
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const R = 0.65, MAXD = 0.32;

  function deform(p, amt) {
    const inward = new THREE.Vector3(-p.x, 0.12 - p.y, -p.z * 0.6).normalize();
    shell.forEach((mesh, mi) => {
      const pa = mesh.geometry.attributes.position, arr = pa.array, o = orig[mi];
      const touched = new Set();
      for (let i = 0; i < pa.count; i++) {
        const x = arr[i * 3], y = arr[i * 3 + 1], z = arr[i * 3 + 2];
        const d = Math.hypot(x - p.x, y - p.y, z - p.z);
        if (d > R) continue;
        const f = (1 - d / R) ** 2 * amt;
        // ruido determinista por vértice para que se arrugue
        const nz = Math.sin(o[i * 3] * 37.1 + o[i * 3 + 2] * 21.7) * 0.6;
        let nx = x + inward.x * f * (1 + nz), ny = y + inward.y * f * (1 + nz) * 0.6, nzv = z + inward.z * f * (1 + nz);
        const dx = nx - o[i * 3], dy = ny - o[i * 3 + 1], dz = nzv - o[i * 3 + 2];
        const len = Math.hypot(dx, dy, dz);
        if (len > MAXD) { const k = MAXD / len; nx = o[i * 3] + dx * k; ny = o[i * 3 + 1] + dy * k; nzv = o[i * 3 + 2] + dz * k; }
        arr[i * 3] = nx; arr[i * 3 + 1] = ny; arr[i * 3 + 2] = nzv;
        touched.add((i / 3) | 0);
      }
      if (!touched.size) return;
      pa.needsUpdate = true;
      // normales de los triángulos tocados: mezcla con la normal de la cara para que se vea la abolladura
      const na = mesh.geometry.attributes.normal, nn = na.array;
      for (const t of touched) {
        a.fromArray(arr, t * 9); b.fromArray(arr, t * 9 + 3); c.fromArray(arr, t * 9 + 6);
        n.subVectors(c, b).cross(b.clone().sub(a)).normalize().negate();
        for (let k = 0; k < 3; k++) {
          const j = t * 9 + k * 3;
          const v = new THREE.Vector3(nn[j], nn[j + 1], nn[j + 2]).lerp(n, 0.65).normalize();
          nn[j] = v.x; nn[j + 1] = v.y; nn[j + 2] = v.z;
        }
      }
      na.needsUpdate = true;
      mesh.geometry.computeBoundingSphere();
    });
  }

  function restore(frac) {
    shell.forEach((mesh, mi) => {
      const pa = mesh.geometry.attributes.position.array, na = mesh.geometry.attributes.normal.array;
      const o = orig[mi], on = origN[mi];
      for (let i = 0; i < pa.length; i++) { pa[i] += (o[i] - pa[i]) * frac; na[i] += (on[i] - na[i]) * frac; }
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.geometry.attributes.normal.needsUpdate = true;
    });
  }

  function wear(h) {
    const w = 1 - h;
    paint.color.set('#ffffff').lerp(dirt, w * 0.7);
    paint.roughness = base.rough + w * 0.5;
    paint.clearcoat = base.coat * (0.15 + 0.85 * h);
  }

  return { deform, restore, wear };
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

// Kit de drift común: faldón delantero, taloneras, gancho de remolque y escape grande
function driftKit({ add, exh, paint, P, S, def }, { lipZ = 1.04, skirt = 0.9, exhaust = -1.04 } = {}) {
  const lip = add(new THREE.BoxGeometry(S.width + 0.06, 0.035, 0.22), M.carbon, 0, P + 0.03, lipZ, undefined, false);
  lip.castShadow = true;
  for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.06, 0.06, skirt * 2 - 0.5), M.carbon, sx * (S.width / 2 + 0.05), P + 0.05, -0.02, undefined, false);
  add(new THREE.BoxGeometry(0.06, 0.06, 0.1), M.caliper, -0.32, P + 0.08, lipZ + 0.08, undefined, false); // gancho
  if (def?.motor === 'Nitro') rearExhaust(add, exh, -0.36, P + 0.06, exhaust); // los eléctricos no llevan escape
}
// Tubo de escape trasero cromado con boca oscura (solo coches de motor nitro)
function rearExhaust(add, exh, x, y, z) {
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10).rotateX(Math.PI / 2), M.chrome, x, y, z, undefined, false);
  add(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 10).rotateX(Math.PI / 2), M.carbon, x, y, z - 0.08, undefined, false);
  exh(x, y, z - 0.09);
}
function roundLights({ add, P, S }, n = 2, r = 0.075) {
  const red = new THREE.MeshStandardMaterial({ color: '#7a0000', emissive: '#ff2020', emissiveIntensity: 0.9 });
  for (const sx of [1, -1]) for (let i = 0; i < n; i++) {
    add(new THREE.CylinderGeometry(r, r, 0.03, 14).rotateX(Math.PI / 2), red, sx * (S.tailX - 0.06 + i * 0.17), P + S.tailY, S.tailZ - 0.01, undefined, false);
  }
}

// Piezas propias de cada tipo de coche
const EXTRAS = {
  coupe(c) {
    driftKit(c);
    roundLights(c, 2);
    // capó con tomas de aire
    for (const sx of [1, -1]) c.add(new THREE.BoxGeometry(0.16, 0.025, 0.2), M.carbon, sx * 0.2, c.P + c.S.y + 0.2, 0.72, undefined, false);
  },
  roadster(c) {
    driftKit(c, { lipZ: 0.95, skirt: 0.8, exhaust: -0.95 });
    // arco de seguridad y faros escamoteables (cerrados)
    for (const sx of [1, -1]) c.add(new THREE.BoxGeometry(0.2, 0.03, 0.14), c.paint, sx * 0.36, c.P + c.S.y + 0.18, 0.78, undefined, false);
  },
  sedan(c) {
    driftKit(c);
    const { add, paint, P, S, W, R } = c;
    // aletas anchas atornilladas (kit ancho)
    for (const w of W) {
      const sx = Math.sign(w.x);
      const fl = add(new THREE.BoxGeometry(0.16, 0.2, R * 2 + 0.24), paint, sx * (S.width / 2 + 0.07), P + S.y + 0.02, w.z);
      fl.castShadow = true;
      for (const dz of [-1, 0, 1]) add(new THREE.SphereGeometry(0.018, 6, 4), M.chrome, sx * (S.width / 2 + 0.15), P + S.y + 0.09, w.z + dz * (R + 0.08), undefined, false);
    }
    // cuatro faros redondos y rejilla
    for (const sx of [1, -1]) for (const dx of [0, 0.17]) add(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 12).rotateX(Math.PI / 2), M.head, sx * (0.22 + dx), P + S.headY, S.headZ + 0.02, undefined, false);
    add(new THREE.BoxGeometry(0.22, 0.1, 0.03), M.carbon, 0, P + S.headY, S.headZ + 0.01, undefined, false);
  },
  hatch(c) {
    driftKit(c, { lipZ: 1.03, exhaust: -1.0 });
    // franja inferior oscura (bicolor) y faros escamoteables
    for (const sx of [1, -1]) c.add(new THREE.BoxGeometry(0.02, 0.12, 1.7), M.carbon, sx * (c.S.width / 2 + 0.052), c.P + c.S.y - 0.02, 0.02, undefined, false);
    for (const sx of [1, -1]) c.add(new THREE.BoxGeometry(0.2, 0.03, 0.15), M.carbon, sx * 0.36, c.P + c.S.y + 0.15, 0.85, undefined, false);
  },
  muscle(c) {
    driftKit(c, { lipZ: 1.06 });
    const { add, P, S } = c;
    // compresor que asoma del capó
    const base = add(new THREE.BoxGeometry(0.34, 0.12, 0.42), M.chrome, 0, P + S.y + 0.26, 0.45);
    base.castShadow = true;
    add(new THREE.BoxGeometry(0.3, 0.1, 0.34), M.carbon, 0, P + S.y + 0.36, 0.45, undefined, false);
    for (const dz of [-0.09, 0.09]) add(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 12), M.chrome, 0, P + S.y + 0.46, 0.45 + dz, undefined, false);
    // franjas de capó
    for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.1, 0.012, 0.5), M.carbon, sx * 0.3, P + S.y + 0.205, 0.75, undefined, false);
  },
  buggy({ add, paint, P }) {
    add(new THREE.BoxGeometry(0.22, 0.08, 0.3), paint, 0, P + 0.46, -0.5);
    add(new THREE.BoxGeometry(0.18, 0.06, 0.02), M.carbon, 0, P + 0.46, -0.35, undefined, false);
  },
  truck({ add, exh, P, S, def }) {
    const bar = add(new THREE.BoxGeometry(1.0, 0.06, 0.06), M.carbon, 0, P + S.y + 0.62, -0.12);
    for (const s2 of [1, -1]) add(new THREE.BoxGeometry(0.06, 0.32, 0.06), M.carbon, s2 * 0.47, P + S.y + 0.46, -0.12, undefined, false);
    for (let k = -2; k <= 2; k++) add(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8).rotateX(Math.PI / 2), M.head, k * 0.17, P + S.y + 0.69, -0.09, undefined, false);
    bar.castShadow = true;
    add(new THREE.BoxGeometry(0.9, 0.02, 0.6), M.carbon, 0, P + S.y + 0.21, -0.65, undefined, false);
    // tubos de escape cromados
    for (const s2 of [1, -1]) {
      add(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 8), M.chrome, s2 * 0.52, P + S.y + 0.5, -0.38, undefined, false);
      if (def.motor === 'Nitro') exh(s2 * 0.52, P + S.y + 0.76, -0.38, 0, 1, -0.2); // boca arriba del tubo
    }
    // parrilla
    add(new THREE.BoxGeometry(0.7, 0.14, 0.03), M.chrome, 0, P + S.y + 0.08, 1.06, undefined, false);
  },
  jeep({ add, paint, P, S }) {
    const y0 = P + S.y;
    // barra antivuelco
    for (const sx of [1, -1]) {
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 6), M.carbon, sx * 0.42, y0 + 0.62, -0.36, undefined, false);
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 6).rotateX(Math.PI / 2), M.carbon, sx * 0.42, y0 + 0.88, -0.1, undefined, false);
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 6), M.carbon, sx * 0.42, y0 + 0.72, 0.14, undefined, false);
    }
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.84, 6).rotateZ(Math.PI / 2), M.carbon, 0, y0 + 0.88, -0.36, undefined, false);
    // baca con bidones
    add(new THREE.BoxGeometry(0.7, 0.03, 0.4), M.carbon, 0, y0 + 0.9, -0.1, undefined, false);
    add(new THREE.BoxGeometry(0.2, 0.18, 0.12), M.shock, 0.18, y0 + 1.0, -0.1, undefined, false);
    // rueda de repuesto trasera
    const sp = add(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 14).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), M.tire, 0, y0 + 0.4, -1.2, undefined, false);
    sp.castShadow = true;
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 10).rotateX(Math.PI / 2), M.rim, 0, y0 + 0.4, -1.2, undefined, false);
    // faros redondos y parachoques
    for (const sx of [1, -1]) add(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 10).rotateX(Math.PI / 2), M.head, sx * 0.34, y0 + 0.14, 1.07, undefined, false);
    add(new THREE.BoxGeometry(0.96, 0.07, 0.1), M.chrome, 0, y0 - 0.02, 1.1, undefined, false);
  },
  crawler({ add, paint, P, S }) {
    const y0 = P + S.y;
    // cabrestante y parachoques reforzado
    add(new THREE.BoxGeometry(1.12, 0.1, 0.14), M.carbon, 0, y0 - 0.02, 1.14, undefined, false);
    add(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 10).rotateZ(Math.PI / 2), M.chrome, 0, y0 + 0.07, 1.14, undefined, false);
    for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.08, 0.14, 0.1), M.shock, sx * 0.38, y0 + 0.07, 1.16, undefined, false);
    // protectores laterales (rock sliders)
    for (const sx of [1, -1]) add(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8).rotateX(Math.PI / 2), M.alu, sx * 0.6, y0 - 0.06, 0.0, undefined, false);
    // barra de focos en el techo
    add(new THREE.BoxGeometry(0.7, 0.07, 0.07), M.carbon, 0, y0 + 0.39, 0.12, undefined, false);
    for (const k of [-2, -1, 0, 1, 2]) add(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8).rotateX(Math.PI / 2), M.head, k * 0.14, y0 + 0.39, 0.16, undefined, false);
    // cajón de carga con bidón
    add(new THREE.BoxGeometry(0.8, 0.14, 0.5), paint, 0, y0 + 0.2, -0.78);
    add(new THREE.BoxGeometry(0.22, 0.26, 0.14), M.shock, -0.22, y0 + 0.4, -0.78, undefined, false);
    for (const sx of [1, -1]) add(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 10).rotateX(Math.PI / 2), M.head, sx * 0.4, y0 + 0.12, 1.12, undefined, false);
  },
  bigfoot({ add, exh, paint, P, S, W, CONN_Y, def }) {
    const y0 = P + S.y;
    // chimeneas de escape verticales detrás de la cabina (motor nitro)
    if (def.motor === 'Nitro') for (const sx of [1, -1]) {
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), M.chrome, sx * 0.38, y0 + 0.58, -0.74, undefined, false);
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8), M.carbon, sx * 0.38, y0 + 0.84, -0.74, undefined, false);
      exh(sx * 0.38, y0 + 0.86, -0.74, 0, 1, -0.2);
    }
    // barra de focos pegada al techo de la cabina (antes quedaba en el aire sobre el parabrisas y más ancha que el techo)
    add(new THREE.BoxGeometry(0.74, 0.08, 0.08), M.carbon, 0, y0 + 0.705, 0.0, undefined, false);
    for (let k = -3; k <= 3; k++) add(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 8).rotateX(Math.PI / 2), M.head, k * 0.11, y0 + 0.705, 0.05, undefined, false);
    // cuernos de hielo
    for (const sx of [1, -1]) {
      const h = add(new THREE.ConeGeometry(0.07, 0.4, 6), M.lens, sx * 0.36, y0 + 0.62, -0.3, undefined, false);
      h.rotation.z = -sx * 0.35;
    }
    // aletines anchos sobre las ruedas: mismo tamaño que antes (0,16 de ancho, 0,62 de largo) pero curvados siguiendo la rueda y 5 cm más bajos
    {
      const hubY = CONN_Y - 0.26;
      const Ri = y0 + 0.045 - hubY, Ro = Ri + 0.05;            // radios (desde el eje) de la cara interior y exterior
      const half = Math.asin(0.31 / ((Ri + Ro) / 2));          // medio largo 0,31 → ángulo
      const a0 = Math.PI / 2 - half, a1 = Math.PI / 2 + half;
      const sh = new THREE.Shape();
      sh.absarc(0, 0, Ro, a0, a1, false);
      sh.absarc(0, 0, Ri, a1, a0, true);
      sh.closePath();
      const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -0.08);
      for (const w of W) {
        const sx = Math.sign(w.x);
        const f = add(fg.clone().toNonIndexed(), paint, sx * 0.62, hubY, w.z, undefined, false);
        f.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
    // parrilla y defensa
    add(new THREE.BoxGeometry(0.76, 0.18, 0.03), M.chrome, 0, y0 + 0.1, 1.06, undefined, false);
    add(new THREE.BoxGeometry(1.0, 0.08, 0.1), M.carbon, 0, y0 - 0.03, 1.1, undefined, false);
    add(new THREE.BoxGeometry(0.9, 0.02, 0.6), M.carbon, 0, y0 + 0.33, -0.65, undefined, false);
  },
  hauler({ add, exh, paint, P, S, def }) {
    const y0 = P + S.y;
    // colmillos de morsa
    for (const sx of [1, -1]) {
      const t = add(new THREE.CylinderGeometry(0.035, 0.07, 0.62, 8).rotateX(Math.PI / 2), M.chrome, sx * 0.3, y0 - 0.02, 1.32, undefined, false);
      t.rotation.y = sx * 0.1;
      add(new THREE.SphereGeometry(0.1, 8, 6), M.plastic, sx * 0.3, y0 + 0.0, 1.08, undefined, false);
    }
    // caja volquete: suelo y cuatro paredes pintadas
    const bedZ = -0.55;
    add(new THREE.BoxGeometry(0.96, 0.04, 0.9), M.carbon, 0, y0 + 0.27, bedZ, undefined, false);
    for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.05, 0.22, 0.9), paint, sx * 0.5, y0 + 0.38, bedZ);
    add(new THREE.BoxGeometry(1.0, 0.22, 0.05), paint, 0, y0 + 0.38, bedZ - 0.45);
    add(new THREE.BoxGeometry(1.0, 0.22, 0.05), paint, 0, y0 + 0.38, bedZ + 0.45);
    // chimeneas de escape
    if (def.motor === 'Nitro') for (const sx of [1, -1]) {
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), M.chrome, sx * 0.55, y0 + 0.6, 0.0, undefined, false);
      exh(sx * 0.55, y0 + 0.89, 0.0, 0, 1, -0.2);
    }
    // faros y parrilla
    for (const sx of [1, -1]) add(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 10).rotateX(Math.PI / 2), M.head, sx * 0.38, y0 + 0.16, 1.09, undefined, false);
  },
  touring({ add, exh, paint, P, S, def }) {
    if (def.motor === 'Nitro') rearExhaust(add, exh, -0.36, P + S.y - 0.06, -1.0);
    add(new THREE.BoxGeometry(1.35, 0.03, 0.2), M.carbon, 0, P + 0.02, 1.0, undefined, false);
    for (const s2 of [1, -1]) add(new THREE.BoxGeometry(0.1, 0.06, 0.06), paint, s2 * 0.62, P + S.y + 0.24, 0.32, undefined, false);
    add(new THREE.BoxGeometry(0.5, 0.08, 0.03), M.carbon, 0, P + S.y + 0.0, 1.06, undefined, false);
  },
  rally({ add, exh, paint, P, S, def }) {
    if (def.motor === 'Nitro') rearExhaust(add, exh, -0.36, P + S.y - 0.06, -0.98);
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
    // cristal lateral con su propio material y polygonOffset: gana siempre a la carrocería, juntas y calcomanías (sin parpadeo)
    const sideGlass = M.glass.clone();
    sideGlass.polygonOffset = true; sideGlass.polygonOffsetFactor = -3; sideGlass.polygonOffsetUnits = -3;
    for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.02, 0.22, 1.05), sideGlass, sx * 0.62, P + S.y + 0.48, -0.25, undefined, false);
    // parabrisas: panel pegado a la pendiente del capó (z 0.45→0.78, y 0.7→0.36), sobresale 1,2 cm
    const ws = add(new THREE.BoxGeometry(0.84, 0.36, 0.02), M.glass, 0, P + S.y + 0.565, 0.675, undefined, false);
    ws.rotation.x = -0.77;
    // cartel de pizza en el techo
    const sign = add(new THREE.BoxGeometry(0.7, 0.3, 0.12), [M.plastic, M.plastic, M.plastic, M.plastic, pizzaMat(), pizzaMat()], 0, P + S.y + 0.9, 0.0);
    sign.castShadow = true;
    add(new THREE.BoxGeometry(1.15, 0.08, 0.1), M.chrome, 0, P + S.y - 0.05, 1.08, undefined, false);
    add(new THREE.BoxGeometry(1.15, 0.08, 0.1), M.chrome, 0, P + S.y - 0.05, -1.07, undefined, false);
  },
  f1({ add, exh, paint, P, def }) {
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
      if (def.motor === 'Nitro') exh(sx * 0.09, P + 0.33, -1.11);
    }
    // caja de aire y piloto con casco
    add(new THREE.BoxGeometry(0.14, 0.22, 0.45), paint, 0, P + 0.48, -0.45);
    const helmet = add(new THREE.SphereGeometry(0.13, 12, 10), M.helmet, 0, P + 0.47, -0.05);
    helmet.scale.z = 1.15;
    add(new THREE.BoxGeometry(0.2, 0.06, 0.06), M.glass, 0, P + 0.49, 0.06, undefined, false);
    add(new THREE.BoxGeometry(0.04, 0.03, 0.2), paint, 0, P + 0.6, -0.05, undefined, false);
    // alerón delantero
    // adelantado 0,30 para que las placas laterales no queden dentro de los neumáticos delanteros, con dos soportes al morro
    add(new THREE.BoxGeometry(1.35, 0.025, 0.24), paint, 0, P + 0.03, 1.4);
    add(new THREE.BoxGeometry(1.25, 0.02, 0.12), M.carbon, 0, P + 0.07, 1.34, undefined, false);
    for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.02, 0.14, 0.28), M.carbon, sx * 0.67, P + 0.08, 1.4, undefined, false);
    for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.04, 0.025, 0.34), M.carbon, sx * 0.1, P + 0.1, 1.25, undefined, false);
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
  // Cometa (coche secreto): cohete de juguete con aletas, cabina de burbuja y tobera encendida
  rocket({ add, exh, paint, P, def }) {
    const body = new THREE.CylinderGeometry(0.3, 0.34, 1.45, 18, 1).rotateX(Math.PI / 2);
    planarUV(body, 1.05, 0.4);
    add(body, paint, 0, P + 0.38, -0.12);
    const nose = new THREE.ConeGeometry(0.3, 0.62, 18).rotateX(Math.PI / 2);
    planarUV(nose, 1.05, 0.4);
    add(nose, paint, 0, P + 0.38, 0.91);
    add(new THREE.SphereGeometry(0.06, 10, 8), M.chrome, 0, P + 0.38, 1.22, undefined, false);
    // anillos cromados
    for (const z of [0.6, -0.55]) add(new THREE.TorusGeometry(0.315, 0.025, 6, 24), M.chrome, 0, P + 0.38, z, undefined, false);
    // cabina
    const dome = new THREE.SphereGeometry(0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.scale(1, 0.85, 1.6);
    add(dome, M.glass, 0, P + 0.6, 0.22);
    // aletas
    const fin = new THREE.BufferGeometry();
    fin.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -0.55, 0, 0.42, -0.62, 0, 0, 0, 0, 0.42, -0.62, 0, 0, -0.55], 3));
    fin.computeVertexNormals();
    const finMat = new THREE.MeshStandardMaterial({ color: '#ffd400', metalness: 0.3, roughness: 0.35, side: THREE.DoubleSide });
    for (const a of [Math.PI / 2, -Math.PI / 2, 0]) {
      const f = add(fin, finMat, 0, P + 0.38, -0.25);
      f.rotation.z = a; f.translateY(0.26);
    }
    // tobera con llama azul
    add(new THREE.CylinderGeometry(0.2, 0.27, 0.22, 16).rotateX(Math.PI / 2), M.chrome, 0, P + 0.38, -0.92, undefined, false);
    if (def.motor === 'Nitro') exh(0, P + 0.38, -1.05);
    const glow = new THREE.MeshStandardMaterial({ color: '#7fd6ff', emissive: '#4fc3ff', emissiveIntensity: 2.2 });
    add(new THREE.CircleGeometry(0.17, 16).rotateY(Math.PI), glow, 0, P + 0.38, -1.035, undefined, false);
    add(new THREE.PlaneGeometry(0.24, 0.24).rotateY(Math.PI / 2), decalMat(def.number || '0'), 0.33, P + 0.4, -0.2, undefined, false);
    add(new THREE.PlaneGeometry(0.24, 0.24).rotateY(-Math.PI / 2), decalMat(def.number || '0'), -0.33, P + 0.4, -0.2, undefined, false);
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

const plateCache = new Map();
function plateMat(n) {
  if (plateCache.has(n)) return plateCache.get(n);
  const c = document.createElement('canvas'); c.width = 256; c.height = 76;
  const x = c.getContext('2d');
  x.fillStyle = '#f5f5f5'; x.fillRect(0, 0, 256, 76);
  x.fillStyle = '#1e40af'; x.fillRect(0, 0, 34, 76);
  x.strokeStyle = '#222'; x.lineWidth = 4; x.strokeRect(2, 2, 252, 72);
  x.fillStyle = '#111'; x.font = 'bold 46px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(`RB ${n}${n}${n} RC`, 145, 40);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
  plateCache.set(n, m);
  return m;
}
