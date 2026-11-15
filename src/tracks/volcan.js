import * as THREE from 'three';
import { groundTex } from '../textures.js';
import { buildCircuit, trackRibbon, bannerTexture } from './common.js';
import { crawlKit, LEN } from './crawlkit.js';
import { rockWalls, rockTextures } from './diorama.js';
import { workshop, backdrop, roadside, detailTexture } from './senda.js';
import { mulberry } from './kit.js';

// Circuito 2 de Obstáculos · "El volcán" (CRW-30): maqueta de un volcán en el mismo taller de modelismo.
// Tramo de A (abajo) a B (junto al cráter) a 18°, con doce obstáculos y una curva entre cada dos:
// eses al pie, horquillas en la ladera y un caracol que rodea la cima. Usa las mismas piezas que La maqueta.
const DEG = Math.PI / 180;
const GRADE = Math.tan(18 * DEG);
const EXT = 18;   // rellano antes de la salida (parrilla)
const POST = 8;   // muestras de rellano tras la meta
const SLOPE = 1.6; // caída de las laderas (alto por unidad de distancia al camino)

// Variantes de las piezas que se repiten (más largas, más altas o más estrechas que en La maqueta)
const V = {
  // La cuesta es 3° más empinada que en La maqueta: las piezas rígidas son 3° más tendidas para que cueste lo mismo subirlas
  steps: { rise: 0.1 },
  ramp: { h: 2.1 },
  logs2: { n: 62, extra: 64, L: 22 },
  ramp2: { up: 9.5, deck: 3, h: 2.55, logs: 65 },
  steps2: { n: 16, rise: 0.11, tread: 0.52, top: 2 },
  tib2: { ramp: 7.5, deck: 16, h: 2.2, w: 0.95, gorge: false },
};
const HILL = { climb: 2.7, garden: 1.9 }; // jorobas de la cuesta de roca y del jardín de rocas
const OL = { ...LEN, logs2: V.logs2.L, ramp2: V.ramp2.up * 2 + V.ramp2.deck, steps2: 2 * V.steps2.n * V.steps2.tread + V.steps2.top, tib2: V.tib2.ramp * 2 + V.tib2.deck + 1 };

// Trazado con «tortuga»: ['S', largo, obstáculo?, entrada?] recta · ['A', grados (+ = hacia el fondo), radio, obstáculo?] curva
const SEQ = [
  ['S', 4],
  // eses al pie del volcán
  ['S', 23, 'logs'], ['A', 45, 9], ['S', 31, 'steps'], ['A', -90, 9], ['S', 21, 'garden'], ['A', 45, 9],
  // horquillas en la ladera
  ['S', 28, 'ramp', 4.5], ['A', 180, 7, 'sand'], ['S', 25, 'bridge', 5.5], ['A', -180, 7], ['S', 27, 'ford'], ['A', 40, 9], ['S', 22, 'climb'], ['A', 50, 6],
  // caracol alrededor de la cima
  ['S', 42, 'tib2', 5], ['A', 90, 5], ['S', 34, 'logs2'], ['A', 90, 5], ['S', 30, 'ramp2'], ['A', 90, 5], ['S', 22, 'steps2'], ['A', 90, 5],
  ['S', 5], ['B'], ['S', 20],
];
function route() {
  let x = 0, z = 0, th = 0, s = 0, fin = null;
  const pts = [[0, 0, 0]], obs = {};
  for (const [kind, a, b, c] of SEQ) {
    if (kind === 'S') {
      const n = Math.max(1, Math.round(a / 4));
      if (b) { const m = (c ?? (a - OL[b]) / 2) + OL[b] / 2; obs[b] = { x: x + Math.cos(th) * m, z: z - Math.sin(th) * m, s: s + m }; }
      for (let k = 1; k <= n; k++) { x += Math.cos(th) * a / n; z -= Math.sin(th) * a / n; s += a / n; pts.push([x, z, s]); }
    } else if (kind === 'A') {
      const sg = Math.sign(a), n = Math.max(2, Math.round(Math.abs(a) / 22.5)), cx = x - sg * Math.sin(th) * b, cz = z - sg * Math.cos(th) * b;
      if (c) { const m = th + a * DEG / 2; obs[c] = { x: cx + sg * Math.sin(m) * b, z: cz + sg * Math.cos(m) * b, s: s + Math.abs(a) * DEG * b / 2 }; }
      for (let k = 1; k <= n; k++) { const m = th + a * DEG * k / n; x = cx + sg * Math.sin(m) * b; z = cz + sg * Math.cos(m) * b; s += Math.abs(a) * DEG * b / n; pts.push([x, z, s]); }
      th += a * DEG;
    } else fin = { x, z, s, th };
  }
  return { pts, obs, fin };
}
const RT = route();
// Cráter: a la izquierda del rellano de meta
const RC = 6.5;
{ const f = RT.fin, fx = Math.cos(f.th), fz = -Math.sin(f.th); RT.crater = { x: f.x + fx * 11 + fz * 13, z: f.z + fz * 11 - fx * 13 }; }
// Base de la maqueta: caja que contiene el camino y sus laderas; todo se centra en el origen
const R = (() => {
  let x0 = -EXT - 8, x1 = 0, z0 = -8, z1 = 8;
  for (const [x, z, s] of RT.pts) { const r = s * GRADE / SLOPE + 9; x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); z0 = Math.min(z0, z - r); z1 = Math.max(z1, z + r); }
  const ox = (x0 + x1) / 2, oz = (z0 + z1) / 2;
  for (const p of [...RT.pts, ...Object.values(RT.obs), RT.fin, RT.crater]) { if (Array.isArray(p)) { p[0] -= ox; p[1] -= oz; } else { p.x -= ox; p.z -= oz; } }
  return { x: Math.ceil((x1 - x0) / 2) + 2, z: Math.ceil((z1 - z0) / 2) + 2, ax: -ox, az: -oz };
})();
const A = [R.ax, R.az]; // salida
const PTS = [...[-EXT, -EXT * 0.75, -EXT * 0.5, -EXT * 0.25].map((d) => [A[0] + d, A[1]]), ...RT.pts.map(([x, z]) => [x, z])];
const O = RT.obs;

export default {
  id: 'volcan', disc: 'obst',
  screech: false, // AUD-14
  name: 'El volcán', short: 'Volcán',
  desc: 'Subida de 18° al cráter: eses, horquillas y caracol con doce obstáculos',
  oneWay: true, // tramo A→B: una sola pasada
  revName: 'El volcán · bajada', revShort: 'Bajada', revDesc: 'Del cráter a la base, cuesta abajo: los mismos obstáculos al revés',
  color: '#b5452a',
  medals: [520, 420, 350], revMedals: [330, 280, 240],
  payK: 1.6, // ECO-16: dura ~1,6 veces lo que La maqueta
  music: 'museo', ambient: 'salon',
  build,
};

function build(B) {
  B.collider(B.RAPIER.ColliderDesc.cuboid(R.x * 2, 1, R.z * 2), { x: 0, y: -1, z: 0 }, null, { friction: 0.9 });
  workshop(B, R, ['MONTE BRASA', 'maqueta · escala 1:87']);

  // camino de ceniza y tierra oscura
  const dt = groundTex('dirt', [1, 1]);
  const dirtMat = new THREE.MeshStandardMaterial({ map: dt.map, normalMap: dt.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 1, color: '#6f625c' });
  const tr = groundTex('trail', [1, 1]);
  const trailMat = new THREE.MeshStandardMaterial({ map: tr.map, normalMap: tr.normalMap, normalScale: new THREE.Vector2(1.3, 1.3), roughness: 0.96, color: '#9c8f89' });

  let G = null;
  const circuit = buildCircuit(B, {
    points: PTS,
    start: B.reverse ? [RT.fin.x, RT.fin.z] : A,
    width: 2.6,
    limits: [R.x - 2, R.z - 2],
    grade: (S, N) => (G = grade(S, N, B.reverse)),
    hillMaterial: dirtMat,
    barrier: { colors: ['#6c7079'], thick: 0.6, hidden: true, wallHalf: 0.55 }, // solo colisión: las rocas son el dibujo
    chevrons: false,
  });
  trackRibbon(B, circuit, trailMat, 0.15, 0.025);

  // Las piezas se colocan por posición: se busca solo en el tramo que se recorre (la vuelta oculta cruza el caracol por debajo)
  const S = circuit.samples, N = circuit.N, [d0, d1] = circuit.drive;
  const road = []; for (let k = d0; k <= d1; k++) road.push(S[((k % N) + N) % N]);
  const kitCircuit = Object.assign(Object.create(circuit), {
    sampleNear: (x, z) => road.reduce((b, s) => ((s.p.x - x) ** 2 + (s.p.z - z) ** 2 < (b.p.x - x) ** 2 + (b.p.z - z) ** 2 ? s : b)),
  });

  // ---------- Obstáculos (en orden de subida) ----------
  const K = crawlKit(B, kitCircuit);
  const lava = lavaMaterial();
  K.logPile(O.logs.x, O.logs.z);                 // 1 · eses
  K.steps(O.steps.x, O.steps.z, V.steps);        // 2
  K.rockGarden(O.garden.x, O.garden.z);          // 3
  K.rampDouble(O.ramp.x, O.ramp.z, V.ramp);      // 4 · horquillas
  K.sandBank(O.sand.x, O.sand.z);                // 5 (en la horquilla)
  K.coveredBridge(O.bridge.x, O.bridge.z);       // 6
  K.ford(O.ford.x, O.ford.z);                    // 7
  K.rockClimb(O.climb.x, O.climb.z);             // 8
  const fb = K.tibetan(O.tib2.x, O.tib2.z, V.tib2); // 9 · caracol: puente largo sobre el río de lava
  K.logPile(O.logs2.x, O.logs2.z, V.logs2);      // 10
  K.rampDouble(O.ramp2.x, O.ramp2.z, V.ramp2);   // 11
  K.steps(O.steps2.x, O.steps2.z, V.steps2);     // 12 · escalera al cráter
  const T = K.finish();
  lavaRiver(B, circuit, fb, lava.mat);

  // ---------- Salida (A, abajo) y meta (B, junto al cráter) ----------
  const iB = circuit.drive[1] - POST;
  for (const [s, text, color] of [[S[0], 'SALIDA', '#1565c0'], [S[iB], 'META', '#2e7d32']]) {
    const yaw = circuit.yawOf(s.t);
    for (const sd of [-1, 1]) { const p = s.p.clone().addScaledVector(s.n, sd * 1.55); B.cyl(0.12, 0.12, 2.2, p.x, s.h + 1.1, p.z, '#dddddd', { seg: 8, solid: false }); }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.7), new THREE.MeshBasicMaterial({ map: bannerTexture(text, color), side: THREE.DoubleSide }));
    banner.position.set(s.p.x, s.h + 2.3, s.p.z); banner.rotation.y = yaw + Math.PI;
    B.scene.add(banner);
  }

  // ---------- Volcán ----------
  const M = terrain(B, road, circuit.width, G.top);
  rockWalls(B, circuit, { colors: BASALT, tint: 0.22, chunk: 24 });
  roadside(B, circuit, { pebble: [0.03, 0.04, 0.34], tuft: [0.1, 0.3, 0.55], blade: [[0.3, 0.26, 0.14], [0.62, 0.5, 0.3]] });
  const crater = craterLake(B, G.top, lava.mat);
  lavaPools(B, M, lava.mat);
  burntTrees(B, M);
  const smoke = smokeColumn(B, G.top);
  backdrop(B, R, {
    H: Math.max(140, G.top + 50), glow: 0.5,
    sky: ['#3b2a4a', '#c0603a', '#f2b56b'], cloud: 'rgba(70,52,60,0.75)',
    ranges: [[300, 120, '#6a4a55'], [350, 90, '#4f3942'], [410, 50, '#33282c']],
  });

  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: M.maxH + 20 },
    finishIdx: iB,
    zones: T.zones, hazards: T.hazards, gates: T.gates, safe: T.safe, pits: T.pits,
    step: T.step,
    update: (t) => { T.update(t); lava.update(t); smoke(t); },
    dust: [0.42, 0.36, 0.33],
    lights: { // atardecer: luz baja y cálida, bruma rojiza y el resplandor del cráter
      fog: ['#7a5548', 150, 820],
      background: '#2b2220',
      hemi: ['#ffd9bd', '#3d2a26', 0.85],
      sun: { color: '#ffd0a0', intensity: 3.0, offset: [22, 44, 18] },
      env: 0.4,
      points: [
        { pos: [0, 150, 40], color: '#ffc890', intensity: 1.0, distance: 0, decay: 0 },
        { pos: [crater.x, G.top + 5, crater.z], color: '#ff6a1a', intensity: 260, distance: 70, decay: 1.4 },
      ],
    },
  };
}

// Cuesta: 18° desde la salida hasta la meta, salvo el vado (poza horizontal); rellanos planos antes de la salida y tras la meta.
// Las jorobas de la cuesta y el jardín de rocas y las orillas del vado se suman aquí (no en `hills`): se localizan por
// distancia recorrida, porque la vuelta oculta que cierra el circuito cruza el caracol.
function grade(samples, N, rev = false) {
  const nearAll = (x, z) => samples.reduce((b, s) => ((s.p.x - x) ** 2 + (s.p.z - z) ** 2 < (b.p.x - x) ** 2 + (b.p.z - z) ** 2 ? s : b)).i;
  // U(i) = índice de la muestra i en el orden de subida (A = 0). Al revés las muestras salen de B hacia atrás.
  const iA = nearAll(A[0], A[1]);
  const U = (i) => (rev ? ((iA - i) % N + N) % N : i);
  const F = new Array(N); for (let i = 0; i < N; i++) F[U(i)] = samples[i];
  const SP = Math.hypot(F[1].p.x - F[0].p.x, F[1].p.z - F[0].p.z);
  const uOf = ({ x, z, s }) => { // muestra más cercana alrededor de la distancia recorrida s
    const c = Math.round(s / SP); let best = c, bd = Infinity;
    for (let u = Math.max(0, c - 14); u <= c + 14; u++) { const q = F[u].p, d = (q.x - x) ** 2 + (q.z - z) ** 2; if (d < bd) { bd = d; best = u; } }
    return best;
  };
  const uB = uOf(RT.fin), fc = uOf(O.ford), fh = Math.ceil((LEN.ford / 2 + 0.6) / 1.6);
  const pre = Math.round(EXT * 0.75 / 1.6), i1 = uB + POST, i0 = N - pre;
  const up = new Array(N).fill(0);
  let y = 0;
  for (let u = 1; u <= i1; u++) {
    if (u <= uB && Math.abs(u - fc) > fh) y += SP * GRADE;
    up[u] = y;
  }
  for (let u = i1 + 1; u < i0; u++) up[u] = y * (1 - (u - i1) / (i0 - i1)); // bajada oculta
  const bank = Math.round((LEN.ford / 2 - 0.4) / SP);
  for (const [c, len, hh] of [[fc - bank, 4.4, 0.52], [fc + bank, 4.4, 0.52], [uOf(O.climb), LEN.climb - 1, HILL.climb], [uOf(O.garden), LEN.garden - 1, HILL.garden]]) {
    const half = Math.round(len / 2 / 1.6), bump = [];
    for (let k = -half; k <= half; k++) bump.push(hh * 0.5 * (1 + Math.cos(Math.PI * k / half)));
    for (let k = -half; k <= half; k++) up[c + k] += bump[k + half];
  }
  const h = new Array(N); for (let i = 0; i < N; i++) h[i] = up[U(i)];
  return { h, top: y, drive: rev ? [-pre, iA + POST] : [-pre, i1] };
}

// ---------- Volcán: malla de alturas con el camino tallado en la ladera y el cráter en la cima ----------
const BASALT = ['#4a4548', '#3b3739', '#57504f', '#332f31', '#5c4a44'];
function terrain(B, road, width, top) {
  const STEP = 1.25, CORR = width / 2 + 0.6 + STEP * 1.5, C = RT.crater, rimH = top + 2.4; // malla algo más gruesa que en La maqueta: el volcán es el doble de grande
  const nx = Math.round(R.x * 2 / STEP), nz = Math.round(R.z * 2 / STEP), W1 = nx + 1;
  const H = new Float32Array(W1 * (nz + 1)), DIST = new Float32Array(H.length), DC = new Float32Array(H.length);
  let maxH = 0;
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = -R.x + i * STEP, z = -R.z + j * STEP;
    let best = Infinity, hNear = 0, hm = 0;
    for (const s of road) {
      const d = Math.hypot(s.p.x - x, s.p.z - z);
      if (d < best) { best = d; hNear = s.h; }
      const v = s.h - SLOPE * Math.max(0, d - CORR); if (v > hm) hm = v;
    }
    // cráter: anillo que sobresale por encima de la meta y hoyo con el lago de lava
    const dc = Math.hypot(C.x - x, C.z - z);
    hm = Math.max(hm, rimH - (dc > RC ? SLOPE * (dc - RC) : 2.6 * (RC - dc)));
    if (dc < RC - 1) hm = Math.min(hm, top - 2.6);
    const y = best < CORR ? hNear - 0.12 : Math.max(0, hm);
    const k = j * W1 + i; H[k] = y; DIST[k] = best; DC[k] = dc; maxH = Math.max(maxH, y);
  }
  // pintura de maqueta: basalto oscuro con vetas de escoria rojiza, ceniza en lo llano, azufre cerca del cráter y grietas de lava
  const rnd = mulberry(47), pos = [], col = [], idx = [], phys = [], uvs = [], glow = [];
  const c = new THREE.Color(), basalt = new THREE.Color('#353235'), scoria = new THREE.Color('#5a4037'), ash = new THREE.Color('#5d5653'),
    sulfur = new THREE.Color('#b59d3c'), plain = new THREE.Color('#57504a'), dry = new THREE.Color('#8a7a4e'), brush = new THREE.Color('#9a918c'), hot = new THREE.Color('#5a1608');
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * W1 + i, y = H[k], x = -R.x + i * STEP, z = -R.z + j * STEP;
    const sl = Math.max(Math.abs((H[k + 1] ?? y) - y), Math.abs((H[k + W1] ?? y) - y)) / STEP;
    const jit = sl > 0.3 && DIST[k] > CORR + 1 ? (rnd() - 0.5) * 0.5 : 0;
    pos.push(x, y + (y > 0.2 ? jit : 0), z); phys.push(x * B.S, y * B.S, z * B.S);
    uvs.push(x * 0.09 + z * 0.03, z * 0.09 + y * 0.09);
    const n1 = 0.5 + 0.5 * Math.sin(x * 0.21 + Math.sin(z * 0.17) * 2.3) * Math.cos(z * 0.13 - x * 0.05);
    const band = 0.5 + 0.5 * Math.sin(y * 0.7 + Math.sin(x * 0.05) * 1.5);
    if (y < 0.2) c.copy(plain).lerp(dry, n1 * n1 * 0.35);
    else if (sl > 0.25) c.copy(basalt).lerp(scoria, band * 0.45);
    else c.copy(ash).lerp(basalt, n1 * 0.5);
    if (sl > 2.2 && rnd() < 0.3) c.lerp(brush, 0.3); // pincel seco en las aristas
    const su = (y - top * 0.93) / (top * 0.06) + (n1 - 0.5); if (su > 0 && sl > 0.2) c.lerp(sulfur, Math.min(0.32, su * 0.3));
    // grietas de lava en las laderas (lejos del camino) y paredes del cráter al rojo
    const crack = Math.abs(Math.sin(x * 0.33 + Math.sin(z * 0.19) * 2.1) * Math.cos(z * 0.29 + Math.sin(x * 0.16) * 1.8));
    const zone = 0.5 + 0.5 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.05 - 0.7); // solo en algunas zonas de la ladera
    let gl = y > 2.5 && sl > 0.5 && zone > 0.66 && DIST[k] > CORR + 1.2 ? (crack < 0.02 ? 1 : crack < 0.045 ? 0.4 : 0) : 0;
    if (DC[k] < RC + 0.5 && DIST[k] > CORR) gl = Math.max(gl, 0.35 + 0.5 * (1 - DC[k] / RC));
    if (gl > 0) c.lerp(hot, Math.min(1, gl * 1.2));
    c.multiplyScalar(0.88 + rnd() * 0.22); col.push(c.r, c.g, c.b); glow.push(gl);
    if (i < nx && j < nz) idx.push(k, k + W1, k + 1, k + 1, k + W1, k + W1 + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('glow', new THREE.Float32BufferAttribute(glow, 1));
  g.setIndex(idx); g.computeVertexNormals();
  const rt = rockTextures();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, map: detailTexture(), normalMap: rt.normalMap, normalScale: new THREE.Vector2(0.8, 0.8) });
  mat.onBeforeCompile = (sh) => { // las grietas brillan con luz propia (atributo `glow` por vértice)
    sh.vertexShader = 'attribute float glow;\nvarying float vGlow;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vGlow = glow;');
    sh.fragmentShader = 'varying float vGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3(1.0, 0.3, 0.03) * vGlow * 1.7;');
  };
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true; m.castShadow = true; B.scene.add(m);
  if (B.mirror) for (let k = 0; k < phys.length; k += 3) phys[k] = -phys[k];
  B.world.createCollider(B.RAPIER.ColliderDesc.trimesh(new Float32Array(phys), new Uint32Array(idx), B.RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES).setFriction(0.9), B.fixed);
  const cell = (x, z) => { const i = Math.round((x + R.x) / STEP), j = Math.round((z + R.z) / STEP); return i < 0 || j < 0 || i > nx || j > nz ? -1 : j * W1 + i; };
  return {
    maxH,
    h: (x, z) => { const k = cell(x, z); return k < 0 ? 0 : H[k]; },
    road: (x, z) => { const k = cell(x, z); return k < 0 ? 1e9 : DIST[k]; },
    slope: (x, z) => { const k = cell(x, z); return k < 0 ? 0 : Math.max(Math.abs((H[k + 1] ?? H[k]) - H[k]), Math.abs((H[k + W1] ?? H[k]) - H[k])) / STEP; },
  };
}

// ---------- Lava (solo decorado): material con costra oscura que se desplaza despacio ----------
function lavaMaterial() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), r = mulberry(13);
  g.fillStyle = '#ff7a12'; g.fillRect(0, 0, S, S);
  for (let k = 0; k < 26; k++) { const x = r() * S, y = r() * S, rad = 14 + r() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,225,120,0.9)'); gr.addColorStop(1, 'rgba(255,170,40,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let k = 0; k < 60; k++) { // placas de costra
    const x = r() * S, y = r() * S, w = 12 + r() * 34, h = 8 + r() * 22;
    g.fillStyle = `rgba(${40 + r() * 30},${14 + r() * 12},8,${0.75 + r() * 0.2})`;
    for (const [ox, oy] of [[0, 0], [-S, 0], [0, -S], [-S, -S]]) { g.beginPath(); g.ellipse(x + ox, y + oy, w, h, r() * 3, 0, 7); g.fill(); }
  }
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 1.5, roughness: 0.6, color: '#000000', side: THREE.DoubleSide });
  return { mat, update: (t) => { tex.offset.set(t * 0.012, -t * 0.03); } };
}

// Lago de lava dentro del cráter
function craterLake(B, top, mat) {
  const C = RT.crater;
  const m = new THREE.Mesh(new THREE.CircleGeometry(RC - 0.2, 28), mat);
  m.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 2.2; });
  m.rotation.x = -Math.PI / 2; m.position.set(C.x, top - 1.5, C.z); m.userData.dynamic = true; B.scene.add(m);
  return C;
}

// Río de lava bajo el puente largo: sigue el camino por debajo del tablero (caerse = reaparecer, como en cualquier puente)
function lavaRiver(B, circuit, f, mat) {
  const S = circuit.samples, N = circuit.N, hw = circuit.width / 2 + 0.35, pos = [], uv = [], idx = [];
  const k0 = f.idx(f.span[0] + 1.2), k1 = f.idx(f.span[1] - 1.2), a = Math.min(k0, k1), b = Math.max(k0, k1);
  for (let k = a; k <= b; k++) {
    const s = S[((k % N) + N) % N];
    for (const sd of [1, -1]) { const q = s.p.clone().addScaledVector(s.n, sd * hw); pos.push(q.x, s.h + 0.06, q.z); }
    uv.push(0, (k - a) * 0.5, 1, (k - a) * 0.5);
    if (k < b) { const i = (k - a) * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.userData.dynamic = true; B.scene.add(m);
}

// Charcos de lava al pie del volcán, donde la base queda llana y lejos del camino
function lavaPools(B, M, mat) {
  const rnd = mulberry(5), done = [];
  for (let t = 0; t < 900 && done.length < 3; t++) {
    const rad = 7 + rnd() * 5, x = (rnd() * 2 - 1) * (R.x - rad - 3), z = (rnd() * 2 - 1) * (R.z - rad - 3);
    const flat = [[0, 0], [rad, 0], [-rad, 0], [0, rad], [0, -rad]].every(([dx, dz]) => M.h(x + dx, z + dz * 0.65) < 0.1);
    if (!flat || M.road(x, z) < rad + 8 || done.some((q) => Math.hypot(q[0] - x, q[1] - z) < 60)) continue;
    done.push([x, z]);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(rad, 24), mat);
    pool.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 3; });
    pool.rotation.x = -Math.PI / 2; pool.scale.set(1, 0.65, 1); pool.position.set(x, 0.07, z); pool.userData.dynamic = true; B.scene.add(pool);
    const crust = new THREE.Mesh(new THREE.RingGeometry(rad - 0.4, rad + 1.8, 24), new THREE.MeshStandardMaterial({ color: '#2a2526', roughness: 1 }));
    crust.rotation.x = -Math.PI / 2; crust.scale.set(1, 0.65, 1); crust.position.set(x, 0.05, z); B.scene.add(crust);
  }
}

// Árboles quemados (troncos pelados con un par de ramas) en las laderas bajas y la llanura
function burntTrees(B, M) {
  const rnd = mulberry(71), spots = [];
  for (let t = 0; t < 7000 && spots.length < 300; t++) {
    const x = (rnd() * 2 - 1) * (R.x - 3), z = (rnd() * 2 - 1) * (R.z - 3), y = M.h(x, z);
    if (M.road(x, z) < 5.5 || M.slope(x, z) > 1.3 || y > M.maxH * 0.5) continue;
    spots.push([x, y, z, 0.8 + rnd() * 1.1, rnd()]);
  }
  const n = spots.length, mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  const wood = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true });
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.2, 1, 5), wood, n);
  const twig = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.07, 1, 4), wood, n * 2);
  spots.forEach(([x, y, z, s, v], i) => {
    col.setHSL(0.06, 0.12, 0.09 + v * 0.1);
    e.set((v - 0.5) * 0.2, v * 6.28, (rnd() - 0.5) * 0.2); q.setFromEuler(e);
    mt.compose(p.set(x, y + 1.6 * s, z), q, sc.set(s, 3.4 * s, s)); trunk.setMatrixAt(i, mt); trunk.setColorAt(i, col);
    for (let b = 0; b < 2; b++) {
      const a = v * 6.28 + b * 2.6, tilt = 0.8 + rnd() * 0.4, len = (0.9 + rnd() * 0.7) * s, hy = y + (1.5 + b * 0.9) * s;
      e.set(0, a, -tilt, 'YXZ'); q.setFromEuler(e);
      mt.compose(p.set(x + Math.cos(a) * Math.sin(tilt) * len / 2, hy + Math.cos(tilt) * len / 2, z - Math.sin(a) * Math.sin(tilt) * len / 2), q, sc.set(s, len, s)); twig.setMatrixAt(i * 2 + b, mt); twig.setColorAt(i * 2 + b, col);
    }
  });
  for (const m of [trunk, twig]) { m.castShadow = true; B.scene.add(m); }
}

// Columna de humo sobre el cráter: unas pocas nubes que suben, crecen y se deshacen
function smokeColumn(B, top) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv), C = RT.crater, n = 9, puffs = [];
  for (let k = 0; k < n; k++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#4a4244', transparent: true, depthWrite: false, opacity: 0 }));
    B.scene.add(sp); puffs.push(sp);
  }
  return (t) => {
    puffs.forEach((sp, k) => {
      const u = (t * 0.045 + k / n) % 1, w = k * 2.4;
      sp.position.set(C.x + Math.sin(w + u * 3) * (1 + u * 5) + u * 9, top + u * 46, C.z + Math.cos(w * 1.3 + u * 2) * (1 + u * 4));
      const s = 5 + u * 22; sp.scale.set(s, s, 1);
      sp.material.opacity = 0.55 * Math.min(1, u * 6) * (1 - u);
      sp.material.color.setRGB(0.29 + (1 - u) * 0.45, 0.26 + (1 - u) * 0.12, 0.27); // al salir, teñido por la lava
    });
  };
}
