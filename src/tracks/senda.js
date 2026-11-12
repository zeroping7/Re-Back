import * as THREE from 'three';
import { groundTex } from '../textures.js';
import { buildCircuit, trackRibbon, bannerTexture } from './common.js';
import { crawlKit, LEN } from './crawlkit.js';
import { rockWalls } from './diorama.js';
import { mulberry } from './kit.js';

// Circuito 1 de Obstáculos · "La maqueta" (CRW-09..12): diorama de crawlers sobre mesa, con cortinas azules y luna.
// Un solo camino estrecho (A→B, la meta está donde la salida) con nueve obstáculos obligatorios que ocupan todo el ancho.
const R = { x: 112, z: 64 }; // al aire libre: una montaña con el camino en zigzag (CRW-18)
const GRADE = Math.tan(30 * Math.PI / 180); // pendiente de 30° de la salida (A) a la meta (B)
const EXT = 18; // tramo plano antes de la salida y después de la meta (parrilla y frenada)
// Óvalo corto: dos tramos rectos (y=±10) unidos por semicírculos de radio 10. Los obstáculos van casi seguidos (CRW-13).
const XW = 50, RAD = 10;
const arc = (cx, a0, a1, n) => Array.from({ length: n }, (_, k) => { const a = a0 + (a1 - a0) * (k + 1) / (n + 1); return [cx + RAD * Math.cos(a), RAD * Math.sin(a)]; });
const PTS = [
  ...[-XW - EXT, -XW, -34, -17, 0, 17, 34, XW].map((x) => [x, RAD]),
  ...arc(XW, Math.PI / 2, -Math.PI / 2, 3),
  ...[XW, 34, 17, 0, -17, -34, -XW, -XW - EXT].map((x) => [x, -RAD]),
  ...arc(-XW - EXT, -Math.PI / 2, -3 * Math.PI / 2, 3), // vuelta oculta (cierra el bucle; no se recorre)
];
const FINISH_X = -XW - 4;
// Centros de los obstáculos: se reparten en cada recta con el mismo hueco entre ellos (mínimo 4,5 u)
function lay(names, x0, dir, span, entry) {
  const free = span - names.reduce((t, n) => t + LEN[n], 0) - entry, gap = Math.max(4.5, free / names.length);
  let x = x0 + dir * (entry + gap * 0.5);
  return names.map((n) => { const c = x + dir * LEN[n] / 2; x += dir * (LEN[n] + gap); return [n, c]; });
}
const TOP = lay(['steps', 'logs', 'ramp', 'bridge'], -XW, 1, 2 * XW - 5, 3);
const BOT = lay(['ford', 'climb', 'garden', 'tib'], XW, -1, 2 * XW - 5, 6);
const at = (list, n) => list.find((q) => q[0] === n)[1];

export default {
  id: 'senda', disc: 'obst',
  name: 'La maqueta', short: 'Maqueta',
  desc: 'Subida de 30° de A a B con nueve obstáculos obligatorios',
  oneWay: true, // tramo A→B: una sola pasada, sin variantes
  color: '#8d6e3f',
  medals: [300, 240, 200],
  music: 'parque', ambient: 'salon',
  build,
};

function build(B) {
  // ---------- Exterior: prado y cielo (la montaña se hace con el camino, más abajo) ----------
  const gr = groundTex('grass', [40, 24]);
  const floorMat = new THREE.MeshStandardMaterial({ map: gr.map, normalMap: gr.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.95, color: '#a9b88a' });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(R.x * 12, R.z * 12), floorMat);
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; B.scene.add(fl);
  B.collider(B.RAPIER.ColliderDesc.cuboid(R.x * 2, 1, R.z * 2), { x: 0, y: -1, z: 0 }, null, { friction: 0.9 });

  // camino de tierra (también es la superficie de la cuesta)
  const dt = groundTex('dirt', [1, 1]);
  const dirtMat = new THREE.MeshStandardMaterial({ map: dt.map, normalMap: dt.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 1, color: '#c9ad82' });

  const circuit = buildCircuit(B, {
    points: PTS,
    start: [-XW, RAD],
    width: 2.6,
    limits: [R.x - 2, R.z - 2],
    hills: [
      // vado hundido (CRW-16): orillas altas a la entrada y la salida, el agua llena el hueco
      ...[-1, 1].map((sd) => ({ at: [at(BOT, 'ford') + sd * (LEN.ford / 2 - 0.4), -RAD], len: 4.4, h: 0.52 })),
      { at: [at(BOT, 'climb'), -RAD], len: LEN.climb - 1, h: 3.0 }, { at: [at(BOT, 'garden'), -RAD], len: LEN.garden - 1, h: 2.2 }],
    grade, // CRW-18: cuesta de 30° de A a B
    hillMaterial: dirtMat,
    barrier: { colors: ['#6c7079'], thick: 0.6, hidden: true, wallHalf: 0.55 }, // solo colisión: las rocas son el dibujo
    chevrons: false,
  });
  trackRibbon(B, circuit, dirtMat, 0.15, 0.025);

  // ---------- Obstáculos (en orden de recorrido) ----------
  const K = crawlKit(B, circuit);
  K.steps(at(TOP, 'steps'), RAD);        // 1
  K.logPile(at(TOP, 'logs'), RAD);       // 2
  K.rampDouble(at(TOP, 'ramp'), RAD);    // 3
  K.coveredBridge(at(TOP, 'bridge'), RAD); // 4
  K.sandBank(XW + RAD, 0);               // 5
  K.ford(at(BOT, 'ford'), -RAD);         // 6
  K.rockClimb(at(BOT, 'climb'), -RAD);   // 7
  K.rockGarden(at(BOT, 'garden'), -RAD); // 8
  K.tibetan(at(BOT, 'tib'), -RAD);       // 9
  const T = K.finish();

  // ---------- Salida (A, abajo) y meta (B, arriba) ----------
  const S = circuit.samples, iB = circuit.drive[1] - 8;
  for (const [s, text, color] of [[S[0], 'SALIDA', '#1565c0'], [S[iB], 'META', '#2e7d32']]) {
    const yaw = circuit.yawOf(s.t);
    for (const sd of [-1, 1]) { const p = s.p.clone().addScaledVector(s.n, sd * 1.55); B.cyl(0.12, 0.12, 2.2, p.x, s.h + 1.1, p.z, '#dddddd', { seg: 8, solid: false }); }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.7), new THREE.MeshBasicMaterial({ map: bannerTexture(text, color), side: THREE.DoubleSide }));
    banner.position.set(s.p.x, s.h + 2.3, s.p.z); banner.rotation.y = yaw + Math.PI;
    B.scene.add(banner);
  }

  // ---------- Montaña ----------
  const top = mountain(B, circuit);
  rockWalls(B, circuit);

  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: top + 20 },
    finishIdx: iB, // CRW-18: la carrera acaba al cruzar la meta (una sola pasada)
    zones: T.zones, hazards: T.hazards, gates: T.gates, safe: T.safe, pits: T.pits,
    step: T.step, update: T.update,
    dust: [0.7, 0.6, 0.45],
    lights: {
      background: '#8fb8e6',
      hemi: ['#dbe8ff', '#5a4a34', 0.85],
      sun: { color: '#fff1da', intensity: 3.1, offset: [16, 42, 22] },
      env: 0.45,
      points: [],
    },
  };
}

// Cuesta (CRW-18): 30° desde la salida hasta la meta, salvo el vado (poza horizontal). Antes de la salida y tras la meta,
// rellanos planos; el resto del bucle (oculto) baja para cerrar el circuito.
function grade(samples, N) {
  const near = (x, z) => samples.reduce((b, s) => ((s.p.x - x) ** 2 + (s.p.z - z) ** 2 < (b.p.x - x) ** 2 + (b.p.z - z) ** 2 ? s : b)).i;
  const iB = near(FINISH_X, -RAD), fc = near(at(BOT, 'ford'), -RAD), fh = Math.ceil((LEN.ford / 2 + 0.6) / 1.6);
  const pre = Math.round(EXT * 0.75 / 1.6), post = 8;
  const h = new Array(N).fill(0);
  let y = 0;
  for (let i = 1; i <= iB + post; i++) {
    if (i <= iB && Math.abs(i - fc) > fh) y += 1.6 * GRADE;
    h[i] = y;
  }
  const i1 = iB + post, i0 = N - pre; // bajada oculta
  for (let i = i1 + 1; i < i0; i++) h[i] = y * (1 - (i - i1) / (i0 - i1));
  return { h, drive: [-pre, i1] };
}

// Montaña: malla de alturas que deja un arcén plano a los lados del camino y cae en ladera hacia fuera.
// Devuelve la altura máxima.
function mountain(B, circuit) {
  const S = circuit.samples, N = circuit.N, [d0, d1] = circuit.drive;
  const pts = []; for (let k = d0; k <= d1; k++) pts.push(S[((k % N) + N) % N]);
  const STEP = 1, CORR = circuit.width / 2 + 0.6 + STEP * 1.5, K = 1.5;
  const nx = Math.round(R.x * 2 / STEP), nz = Math.round(R.z * 2 / STEP);
  const pos = [], col = [], idx = [], phys = [];
  const c = new THREE.Color(), grass = new THREE.Color('#7f9a5a'), rock = new THREE.Color('#8a857c'), dirt = new THREE.Color('#b39a74');
  let maxH = 0;
  const H = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = -R.x + i * STEP, z = -R.z + j * STEP;
    let best = Infinity, hNear = 0, hm = 0;
    for (const s of pts) {
      const d = Math.hypot(s.p.x - x, s.p.z - z);
      if (d < best) { best = d; hNear = s.h; }
      hm = Math.max(hm, s.h - K * Math.max(0, d - CORR));
    }
    const y = best < CORR ? hNear - 0.12 : Math.max(0, hm);
    H[j * (nx + 1) + i] = y; maxH = Math.max(maxH, y);
  }
  const rnd = mulberry(31);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i, y = H[k], x = -R.x + i * STEP, z = -R.z + j * STEP;
    const sl = Math.max(Math.abs((H[k + 1] ?? y) - y), Math.abs((H[k + nx + 1] ?? y) - y)) / STEP;
    const jit = sl > 0.3 ? (rnd() - 0.5) * 0.5 : 0; // ladera algo irregular
    pos.push(x, y + (y > 0.2 ? jit : 0), z); phys.push(x * B.S, y * B.S, z * B.S);
    const moss = 0.5 + 0.5 * Math.sin(x * 0.21 + Math.sin(z * 0.17) * 2.3) * Math.cos(z * 0.13 - x * 0.05); // manchas de hierba en la ladera
    c.copy(sl > 2.5 ? rock : sl > 0.25 ? rock.clone().lerp(grass, Math.min(1, moss * 1.3)) : grass).lerp(dirt, sl > 0.25 && sl < 2.5 ? 0.15 : 0).multiplyScalar(0.88 + rnd() * 0.22); col.push(c.r, c.g, c.b);
    if (i < nx && j < nz) idx.push(k, k + nx + 1, k + 1, k + 1, k + nx + 1, k + nx + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  m.receiveShadow = true; m.castShadow = true; B.scene.add(m);
  if (B.mirror) for (let k = 0; k < phys.length; k += 3) phys[k] = -phys[k];
  B.world.createCollider(B.RAPIER.ColliderDesc.trimesh(new Float32Array(phys), new Uint32Array(idx), B.RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES).setFriction(0.9), B.fixed);
  return maxH;
}
