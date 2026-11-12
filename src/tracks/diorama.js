import * as THREE from 'three';
import { mulberry } from './kit.js';
import { ROCK } from './crawlkit.js';

// Ambientación de maqueta para los circuitos de crawler (CRW-09): rocas de poliespán con musgo,
// montaña, pinos y fondo de cortinas con luna. Todo es decorado sin colisión (los muros invisibles
// del camino son los que paran al coche).

// Roca de poliespán: icosfera irregular, con musgo en la parte de arriba (color por vértice)
function rockGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const j = 1 + 0.2 * Math.sin(x * 9.1 + y * 5.3 + z * 7.7) + 0.1 * Math.sin(x * 21.7 - y * 13.1 + z * 4.9);
    p.setXYZ(i, x * j, y * j, z * j);
    const moss = Math.max(0, Math.min(1, (y - 0.2) * 1.7)) * (0.55 + 0.45 * Math.sin(x * 6 + z * 5));
    col.push(1 - 0.28 * moss, 1 - 0.02 * moss, 1 - 0.5 * moss);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function instanced(B, items) {
  if (!items.length) return;
  const mesh = new THREE.InstancedMesh(rockGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }), items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(), s = new THREE.Vector3();
  items.forEach((it, i) => {
    e.set(it.tx || 0, it.ry, it.tz || 0); q.setFromEuler(e);
    m.compose(it.p, q, s.set(...it.s));
    mesh.setMatrixAt(i, m); mesh.setColorAt(i, c.set(it.color));
  });
  mesh.castShadow = true; mesh.receiveShadow = true;
  B.scene.add(mesh);
}

// Muros de roca a los dos lados del camino (dos filas, la de atrás más alta)
export function rockWalls(B, circuit, { seed = 5 } = {}) {
  const rnd = mulberry(seed), S = circuit.samples, N = circuit.N, hw = circuit.width / 2, items = [];
  const [r0, r1] = circuit.drive || [0, N]; // tramo A→B: solo la parte que se recorre
  for (let k = r0; k < r1; k += 1) for (let sub = 0; sub < 2; sub++) {
    const i = ((k % N) + N) % N, s = S[i], s2 = S[(i + 1) % N], u = sub * 0.5 + rnd() * 0.25;
    const px = s.p.x + (s2.p.x - s.p.x) * u, pz = s.p.z + (s2.p.z - s.p.z) * u, nx = s.n.x, nz = s.n.z, h = s.h + (s2.h - s.h) * u;
    for (const side of [1, -1]) for (let row = 0; row < 2; row++) {
      if (row && rnd() < 0.3) continue;
      const R = 0.28 + rnd() * 0.25 + row * 0.22;                     // piedras pequeñas, a escala del coche
      const lat = side * (hw + 0.12 + R * 1.0 + row * R * 1.5);
      const sy = R * (row ? 0.9 + rnd() * 0.8 : 0.7 + rnd() * 0.6);
      items.push({ p: new THREE.Vector3(px + nx * lat, h + sy * 0.45, pz + nz * lat), s: [R * (1 + rnd() * 0.4), sy, R * (1 + rnd() * 0.4)], ry: rnd() * 6.28, tx: (rnd() - 0.5) * 0.3, tz: (rnd() - 0.5) * 0.3, color: ROCK[(rnd() * ROCK.length) | 0] });
    }
  }
  instanced(B, items);
}

// Montaña / macizos de roca en una región, lejos del camino
export function rockField(B, circuit, { x0, x1, z0, z1, count, rMin = 2.5, rMax = 6, hMin = 1, hMax = 2, away = 0, seed = 9 }) {
  const rnd = mulberry(seed), items = [];
  for (let k = 0, tries = 0; k < count && tries < count * 30; tries++) {
    const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), R = rMin + rnd() * (rMax - rMin);
    if (circuit.clearance(x, z) < R * 0.7 + away) continue;
    const sy = R * (hMin + rnd() * (hMax - hMin));
    items.push({ p: new THREE.Vector3(x, sy * 0.4, z), s: [R * (1 + rnd() * 0.4), sy, R * (1 + rnd() * 0.4)], ry: rnd() * 6.28, tx: (rnd() - 0.5) * 0.25, tz: (rnd() - 0.5) * 0.25, color: ROCK[(rnd() * ROCK.length) | 0] });
    k++;
  }
  instanced(B, items);
}

// Pinos de maqueta (conos apilados)
export function pines(B, circuit, { x0, x1, z0, z1, count, away = 6, seed = 3, min = 1.1, max = 2.1 }) {
  const rnd = mulberry(seed), trunk = new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 1, flatShading: true });
  const leaf = ['#2e6b34', '#3a7d3a', '#275d31'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }));
  for (let k = 0, tries = 0; k < count && tries < count * 30; tries++) {
    const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), sc = min + rnd() * (max - min);
    if (circuit.clearance(x, z) < away + sc) continue;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * sc, 0.22 * sc, 0.9 * sc, 6), trunk);
    tr.position.set(x, 0.45 * sc, z); tr.castShadow = true; B.scene.add(tr);
    for (let j = 0; j < 3; j++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry((1.15 - j * 0.28) * sc, 1.5 * sc, 7), leaf[(k + j) % 3]);
      cone.position.set(x, (1.35 + j * 0.85) * sc, z); cone.castShadow = true; B.scene.add(cone);
    }
    k++;
  }
}

// Cortinas azules con pliegues (fondo de exposición)
export function curtainMaterial() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 8;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 128, 0);
  for (let k = 0; k < 4; k++) { grad.addColorStop(k / 4, '#0a1538'); grad.addColorStop((k + 0.5) / 4, '#1c2f6e'); }
  grad.addColorStop(1, '#0a1538');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 1); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
}

// Luna grande iluminada en la cortina del fondo
export function moon(B, { x = 18, y = 26, z, r = 15 }) {
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color: '#f1f4ff' }));
  disc.position.set(x, y, z + 0.1); B.scene.add(disc);
  const crater = new THREE.MeshBasicMaterial({ color: '#d4daf0' });
  for (const [dx, dy, cr] of [[-4, 3, 2.6], [3.5, -4, 3.3], [5, 5, 1.7], [-6, -5, 1.9], [0, 8, 1.4]]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(cr, 24), crater);
    m.position.set(x + dx, y + dy, z + 0.12); B.scene.add(m);
  }
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  gr.addColorStop(0, 'rgba(190,210,255,0.8)'); gr.addColorStop(1, 'rgba(190,210,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(r * 3.4, r * 3.4), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(x, y, z + 0.08); B.scene.add(halo);
}
