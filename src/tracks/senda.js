import * as THREE from 'three';
import { groundTex, wallpaperTexture } from '../textures.js';
import { buildCircuit, trackRibbon, bannerTexture } from './common.js';
import { crawlKit, LEN } from './crawlkit.js';
import { rockWalls, rockGeometry, rockMaterial, rockTextures } from './diorama.js';
import { mulberry } from './kit.js';

// Circuito 1 de Obstáculos · "La maqueta": maqueta de una montaña sobre la mesa de un taller de modelismo (CRW-22).
// Un solo camino estrecho de A (abajo) a B (arriba) en cuesta, con nueve obstáculos obligatorios que ocupan todo el ancho.
const R = { x: 112, z: 64 }; // base de la maqueta (la montaña con el camino en zigzag, CRW-18)
const GRADE = Math.tan(15 * Math.PI / 180); // pendiente de 15° de la salida (A) a la meta (B)
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
  desc: 'Subida de 15° de A a B con nueve obstáculos obligatorios',
  oneWay: true, // tramo A→B: una sola pasada (sin variantes en el menú)
  revName: 'La maqueta · bajada', revShort: 'Bajada', revDesc: 'De B a A, cuesta abajo: los mismos obstáculos al revés', // CRW-25: 'senda:rev' = bajada de B a A (Copa Obstáculos)
  color: '#8d6e3f',
  medals: [300, 240, 200],
  music: 'parque', ambient: 'salon',
  build,
};

function build(B) {
  // ---------- Taller de modelismo: la maqueta está sobre una mesa (CRW-22; solo decorado) ----------
  B.collider(B.RAPIER.ColliderDesc.cuboid(R.x * 2, 1, R.z * 2), { x: 0, y: -1, z: 0 }, null, { friction: 0.9 });
  workshop(B);

  // camino de tierra (también es la superficie de la cuesta)
  const dt = groundTex('dirt', [1, 1]);
  const dirtMat = new THREE.MeshStandardMaterial({ map: dt.map, normalMap: dt.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 1, color: '#a88d6a' });
  // CRW-23: superficie del camino con tierra compactada realista (roderas, guijarros, grietas, bordes con hierba)
  const tr = groundTex('trail', [1, 1]);
  const trailMat = new THREE.MeshStandardMaterial({ map: tr.map, normalMap: tr.normalMap, normalScale: new THREE.Vector2(1.3, 1.3), roughness: 0.96, color: '#e6d6c0' });

  const circuit = buildCircuit(B, {
    points: PTS,
    start: B.reverse ? [FINISH_X, -RAD] : [-XW, RAD], // CRW-25: la bajada sale de B (arriba)
    width: 2.6,
    limits: [R.x - 2, R.z - 2],
    hills: [
      // vado hundido (CRW-16): orillas altas a la entrada y la salida, el agua llena el hueco
      ...[-1, 1].map((sd) => ({ at: [at(BOT, 'ford') + sd * (LEN.ford / 2 - 0.4), -RAD], len: 4.4, h: 0.52 })),
      { at: [at(BOT, 'climb'), -RAD], len: LEN.climb - 1, h: 3.0 }, { at: [at(BOT, 'garden'), -RAD], len: LEN.garden - 1, h: 2.2 }],
    grade: (S, N) => grade(S, N, B.reverse), // CRW-18: cuesta de A a B (CRW-25: al revés, bajada de B a A)
    hillMaterial: dirtMat,
    barrier: { colors: ['#6c7079'], thick: 0.6, hidden: true, wallHalf: 0.55 }, // solo colisión: las rocas son el dibujo
    chevrons: false,
  });
  trackRibbon(B, circuit, trailMat, 0.15, 0.025);

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
  const M = mountain(B, circuit), top = M.maxH;
  rockWalls(B, circuit);
  roadside(B, circuit);
  modelTrees(B, M);
  modelDetails(B, M);
  backdrop(B);

  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: top + 20 },
    finishIdx: iB, // CRW-18: la carrera acaba al cruzar la meta (una sola pasada)
    zones: T.zones, hazards: T.hazards, gates: T.gates, safe: T.safe, pits: T.pits,
    step: T.step, update: T.update,
    dust: [0.7, 0.6, 0.45],
    lights: { // taller con luz cálida de flexo y la claridad de la ventana; algo de bruma para dar profundidad (CRW-23)
      fog: ['#cbb89c', 140, 760],
      background: '#3a3029',
      hemi: ['#ffe9cc', '#4a3a2c', 0.8],
      sun: { color: '#ffe2b8', intensity: 3.0, offset: [22, 44, 18] },
      env: 0.4,
      points: [{ pos: [0, 150, 40], color: '#ffd9a0', intensity: 1.2, distance: 0, decay: 0 }],
    },
  };
}

// Cuesta (CRW-18): 30° desde la salida hasta la meta, salvo el vado (poza horizontal). Antes de la salida y tras la meta,
// rellanos planos; el resto del bucle (oculto) baja para cerrar el circuito.
function grade(samples, N, rev = false) {
  const near = (x, z) => samples.reduce((b, s) => ((s.p.x - x) ** 2 + (s.p.z - z) ** 2 < (b.p.x - x) ** 2 + (b.p.z - z) ** 2 ? s : b)).i;
  // U(i) = índice de la muestra i en el orden de subida (A = 0). En la bajada (CRW-25) las muestras van al revés
  // desde B, así que la montaña es la misma: se calcula la subida y se lee hacia atrás.
  const iA = near(-XW, RAD);
  const U = (i) => (rev ? ((iA - i) % N + N) % N : i);
  const uOf = (x, z) => U(near(x, z));
  const iB = uOf(FINISH_X, -RAD), fc = uOf(at(BOT, 'ford'), -RAD), fh = Math.ceil((LEN.ford / 2 + 0.6) / 1.6);
  const pre = Math.round(EXT * 0.75 / 1.6), post = 8;
  const up = new Array(N).fill(0);
  let y = 0;
  for (let i = 1; i <= iB + post; i++) {
    if (i <= iB && Math.abs(i - fc) > fh) y += 1.6 * GRADE;
    up[i] = y;
  }
  const i1 = iB + post, i0 = N - pre; // bajada oculta
  for (let i = i1 + 1; i < i0; i++) up[i] = y * (1 - (i - i1) / (i0 - i1));
  const h = new Array(N); for (let i = 0; i < N; i++) h[i] = up[U(i)];
  // bajada: sale de B (índice 0) con rellano detrás y acaba en A con rellano después
  return { h, drive: rev ? [-pre, iA + post] : [-pre, i1] };
}

// Montaña: malla de alturas que deja un arcén plano a los lados del camino y cae en ladera hacia fuera.
// Devuelve la altura máxima.
function mountain(B, circuit) {
  const S = circuit.samples, N = circuit.N, [d0, d1] = circuit.drive;
  const pts = []; for (let k = d0; k <= d1; k++) pts.push(S[((k % N) + N) % N]);
  const STEP = 1, CORR = circuit.width / 2 + 0.6 + STEP * 1.5, K = 1.5;
  const nx = Math.round(R.x * 2 / STEP), nz = Math.round(R.z * 2 / STEP);
  const pos = [], col = [], idx = [], phys = [], uvs = [];
  const c = new THREE.Color(), grass = new THREE.Color('#7f9a5a'), rock = new THREE.Color('#8a857c'), dirt = new THREE.Color('#b39a74');
  let maxH = 0;
  const H = new Float32Array((nx + 1) * (nz + 1)), DIST = new Float32Array(H.length);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = -R.x + i * STEP, z = -R.z + j * STEP;
    let best = Infinity, hNear = 0, hm = 0;
    for (const s of pts) {
      const d = Math.hypot(s.p.x - x, s.p.z - z);
      if (d < best) { best = d; hNear = s.h; }
      hm = Math.max(hm, s.h - K * Math.max(0, d - CORR));
    }
    const y = best < CORR ? hNear - 0.12 : Math.max(0, hm);
    H[j * (nx + 1) + i] = y; DIST[j * (nx + 1) + i] = best; maxH = Math.max(maxH, y);
  }
  const rnd = mulberry(31);
  // pintura de maqueta: escayola gris-ocre con vetas, hierba de flocado en lo menos empinado, pincel seco en las aristas, nieve arriba
  const ochre = new THREE.Color('#9c8566'), snow = new THREE.Color('#f3f1ec'), flock = new THREE.Color('#6f9a3e'), flock2 = new THREE.Color('#8fae4c');
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i, y = H[k], x = -R.x + i * STEP, z = -R.z + j * STEP;
    const sl = Math.max(Math.abs((H[k + 1] ?? y) - y), Math.abs((H[k + nx + 1] ?? y) - y)) / STEP;
    const jit = sl > 0.3 ? (rnd() - 0.5) * 0.5 : 0; // ladera algo irregular
    pos.push(x, y + (y > 0.2 ? jit : 0), z); phys.push(x * B.S, y * B.S, z * B.S);
    uvs.push(x * 0.09 + z * 0.03, z * 0.09 + y * 0.09); // coordenadas del mundo: la textura no se estira en los cortados
    const moss = 0.5 + 0.5 * Math.sin(x * 0.21 + Math.sin(z * 0.17) * 2.3) * Math.cos(z * 0.13 - x * 0.05);
    const band = 0.5 + 0.5 * Math.sin(y * 0.9 + Math.sin(x * 0.05) * 1.5); // vetas horizontales de roca pintada
    if (sl > 0.25) c.copy(rock).lerp(ochre, band * 0.55).lerp(flock, sl < 1.6 ? Math.min(0.85, moss * 1.2) * (1 - y / (maxH + 1)) : 0);
    else c.copy(flock).lerp(flock2, moss);
    if (sl > 2.2 && rnd() < 0.35) c.lerp(new THREE.Color('#d8d2c4'), 0.35); // pincel seco
    const sn = (y - maxH * 0.78) / (maxH * 0.1) + (moss - 0.5) * 0.8; // nieve en la cumbre
    if (sn > 0) c.lerp(snow, Math.min(1, sn));
    c.multiplyScalar(0.88 + rnd() * 0.22); col.push(c.r, c.g, c.b);
    if (i < nx && j < nz) idx.push(k, k + nx + 1, k + 1, k + 1, k + nx + 1, k + nx + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // CRW-23: detalle de roca/tierra encima del color pintado (relieve fino y grano)
  const rt = rockTextures(), det = detailTexture();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, map: det, normalMap: rt.normalMap, normalScale: new THREE.Vector2(0.8, 0.8) }));
  m.receiveShadow = true; m.castShadow = true; B.scene.add(m);
  if (B.mirror) for (let k = 0; k < phys.length; k += 3) phys[k] = -phys[k];
  B.world.createCollider(B.RAPIER.ColliderDesc.trimesh(new Float32Array(phys), new Uint32Array(idx), B.RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES).setFriction(0.9), B.fixed);
  // consulta de altura y distancia al camino (para colocar árboles y detalles)
  const cell = (x, z) => { const i = Math.round((x + R.x) / STEP), j = Math.round((z + R.z) / STEP); return i < 0 || j < 0 || i > nx || j > nz ? -1 : j * (nx + 1) + i; };
  return {
    maxH,
    h: (x, z) => { const k = cell(x, z); return k < 0 ? 0 : H[k]; },
    road: (x, z) => { const k = cell(x, z); return k < 0 ? 1e9 : DIST[k]; },
    slope: (x, z) => { const k = cell(x, z); return k < 0 ? 0 : Math.max(Math.abs((H[k + 1] ?? H[k]) - H[k]), Math.abs((H[k + nx + 1] ?? H[k]) - H[k])) / STEP; },
  };
}

// ---------- Decorado de maqueta (CRW-22): todo visual, sin colisiones ----------
const TABLE_Y = -8, FLOOR_Y = -86;

// Marco de madera de la base, mesa de trabajo y habitación (taller) alrededor
function workshop(B) {
  const pl = groundTex('plank', [6, 3]);
  const wood = new THREE.MeshStandardMaterial({ map: pl.map, normalMap: pl.normalMap, roughness: 0.7, color: '#c99a68' });
  const dark = new THREE.MeshStandardMaterial({ color: '#4a3222', roughness: 0.6 });
  // marco de la base (sobresale un poco por encima del borde de la montaña)
  const T = 3, Hf = 0.4 - TABLE_Y;
  for (const [w, d, x, z] of [[R.x * 2 + T * 2, T, 0, R.z + T / 2], [R.x * 2 + T * 2, T, 0, -R.z - T / 2], [T, R.z * 2, R.x + T / 2, 0], [T, R.z * 2, -R.x - T / 2, 0]])
    B.box(w, Hf, d, x, TABLE_Y + Hf / 2, z, dark, { solid: false });
  // placa de latón en el frente del marco
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#f1d58a'); gr.addColorStop(0.5, '#c79a3c'); gr.addColorStop(1, '#9a7428');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#6e5016'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = '#3d2c0c'; g.textAlign = 'center'; g.font = 'bold 54px serif'; g.fillText('MONTE CABRERO', 256, 66); g.font = 'italic 28px serif'; g.fillText('maqueta · escala 1:87', 256, 104);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), new THREE.MeshStandardMaterial({ map: tx, metalness: 0.6, roughness: 0.35 }));
  plate.position.set(0, (TABLE_Y + 0.4) / 2, R.z + T + 0.05); B.scene.add(plate);
  // mesa (tablero y patas)
  const TX = R.x + 70, TZ = R.z + 55;
  B.box(TX * 2, 4, TZ * 2, 0, TABLE_Y - 2, 0, wood, { solid: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(7, -FLOOR_Y + TABLE_Y - 4, 7, sx * (TX - 8), (FLOOR_Y + TABLE_Y - 4) / 2, sz * (TZ - 8), dark, { solid: false });
  // habitación: suelo de parquet, paredes empapeladas, ventana y techo
  const RX = 420, RZ = 320, RH = 320;
  const pq = groundTex('parquet', [24, 18]);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(RX * 2, RZ * 2), new THREE.MeshStandardMaterial({ map: pq.map, normalMap: pq.normalMap, roughness: 0.5, color: '#b88a5c' }));
  fl.rotation.x = -Math.PI / 2; fl.position.y = FLOOR_Y; fl.receiveShadow = true; B.scene.add(fl);
  const wp = wallpaperTexture([14, 6]);
  const wall = new THREE.MeshStandardMaterial({ map: wp, color: '#e9dcc2', roughness: 0.95 });
  for (const [len, x, z, ry] of [[RX * 2, 0, -RZ, 0], [RX * 2, 0, RZ, Math.PI], [RZ * 2, -RX, 0, Math.PI / 2], [RZ * 2, RX, 0, -Math.PI / 2]]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(len, RH), wall); w.position.set(x, FLOOR_Y + RH / 2, z); w.rotation.y = ry; B.scene.add(w);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RX * 2, RZ * 2), new THREE.MeshStandardMaterial({ color: '#f3eee4', roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = FLOOR_Y + RH; B.scene.add(ceil);
  // ventana grande con cielo (pared derecha)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(220, 140), new THREE.MeshBasicMaterial({ color: '#cfe6ff' }));
  win.position.set(RX - 0.5, FLOOR_Y + 175, 0); win.rotation.y = -Math.PI / 2; B.scene.add(win);
  for (const [w, h, z, y] of [[230, 6, 0, 105], [230, 6, 0, 245], [6, 146, -112, 175], [6, 146, 112, 175], [4, 146, 0, 175], [230, 4, 0, 175]])
    B.box(4, h, w, RX - 2, FLOOR_Y + y, z, '#f4f1ea', { solid: false, shadow: false });
  // estantería con botes y cajas en la pared del fondo
  for (const y of [120, 170]) {
    B.box(160, 3, 22, -150, FLOOR_Y + y, RZ - 12, dark, { solid: false });
    for (let k = 0; k < 6; k++) B.box(14 + (k % 3) * 4, 18 + (k % 2) * 8, 14, -215 + k * 26, FLOOR_Y + y + 11 + (k % 2) * 4, RZ - 14, ['#c0392b', '#2471a3', '#f1c40f', '#7d6608', '#1e8449', '#cccccc'][k], { solid: false });
  }
  workbenchProps(B);
}

// Objetos gigantes sobre la mesa: botes de pintura, pinceles, taza, regla, tubo de cola y cúter
function workbenchProps(B) {
  const Y = TABLE_Y;
  const pots = [['#c0392b', -R.x - 25, 30], ['#2e86c1', -R.x - 40, 10], ['#f4d03f', -R.x - 22, -8], ['#27ae60', -R.x - 45, -28], ['#ecf0f1', -R.x - 26, -40]];
  for (const [col, x, z] of pots) {
    B.cyl(9, 9, 12, x, Y + 6, z, '#e8e8e8', { solid: false, seg: 24 });
    B.cyl(9.4, 9.4, 2.4, x, Y + 13.2, z, col, { solid: false, seg: 24 });
  }
  // bote con pinceles
  B.cyl(8, 7, 22, R.x + 30, Y + 11, -35, '#7f8c8d', { solid: false, seg: 20 });
  for (let k = 0; k < 4; k++) {
    const a = k * 1.6, x = R.x + 30 + Math.cos(a) * 3, z = -35 + Math.sin(a) * 3, tilt = 0.18;
    B.cyl(0.9, 1.2, 38, x, Y + 30, z, ['#b03a2e', '#1f618d', '#d4ac0d', '#1d8348'][k], { solid: false, seg: 8, rot: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt] });
  }
  // taza
  B.cyl(10, 9, 22, R.x + 34, Y + 11, 30, '#f5f0e6', { solid: false, seg: 24 });
  B.cyl(8.6, 8.6, 0.6, R.x + 34, Y + 20.5, 30, '#3b2412', { solid: false, seg: 24 });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(5, 1.4, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: '#f5f0e6', roughness: 0.4 }));
  handle.position.set(R.x + 44, Y + 12, 30); handle.rotation.z = -Math.PI / 2; B.scene.add(handle);
  // regla metálica con marcas
  const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#c9ccd1'; g.fillRect(0, 0, 1024, 64); g.fillStyle = '#222';
  for (let k = 0; k <= 100; k++) g.fillRect(k * 10.2, 0, 2, k % 10 === 0 ? 30 : k % 5 === 0 ? 22 : 14);
  g.font = 'bold 16px sans-serif'; for (let k = 0; k <= 10; k++) g.fillText(String(k * 10), k * 102 + 4, 50);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const ruler = new THREE.Mesh(new THREE.BoxGeometry(150, 0.8, 10), [0, 0, new THREE.MeshStandardMaterial({ map: tx, metalness: 0.7, roughness: 0.35 }), 0, 0, 0].map((m) => m || new THREE.MeshStandardMaterial({ color: '#aeb2b8', metalness: 0.7, roughness: 0.35 })));
  ruler.position.set(-10, Y + 0.4, R.z + 22); ruler.rotation.y = 0.06; B.scene.add(ruler);
  // tubo de cola y cúter
  B.cyl(3.2, 3.2, 22, 45, Y + 3.2, R.z + 38, '#f0f0f0', { solid: false, seg: 14, rot: [0, 0, Math.PI / 2] });
  B.cyl(1.4, 3.2, 5, 58.5, Y + 3.2, R.z + 38, '#e67e22', { solid: false, seg: 14, rot: [0, 0, -Math.PI / 2] });
  B.box(30, 2.2, 5, -70, Y + 1.1, R.z + 36, '#f39c12', { solid: false, rot: [0, -0.4, 0] });
  B.box(9, 0.6, 4, -84, Y + 1.1, R.z + 41.6, '#bdc3c7', { solid: false, rot: [0, -0.4, 0] });
}

// Fondo pintado (cielo con nubes y montañas lejanas) curvado detrás de la maqueta, como en las de tren
function backdrop(B) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 512; const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, '#6fa6dc'); sky.addColorStop(0.7, '#cfe3f3'); sky.addColorStop(1, '#eef3ef');
  g.fillStyle = sky; g.fillRect(0, 0, 2048, 512);
  const r = mulberry(7);
  for (let k = 0; k < 14; k++) { // nubes pintadas
    const x = r() * 2048, y = 60 + r() * 160; g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let j = 0; j < 6; j++) { g.beginPath(); g.ellipse(x + j * 26 - 60, y + Math.sin(j) * 8, 40 + r() * 30, 16 + r() * 10, 0, 0, 7); g.fill(); }
  }
  for (const [base, amp, col] of [[300, 120, '#9db3c9'], [350, 90, '#7f97ad'], [410, 50, '#5f7a5a']]) { // cordilleras lejanas
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 512);
    for (let x = 0; x <= 2048; x += 16) g.lineTo(x, base - amp * Math.abs(Math.sin(x * 0.004 + base) * Math.cos(x * 0.0013 + amp)) - r() * 8);
    g.lineTo(2048, 512); g.fill();
  }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  // media elipse que pasa por las esquinas traseras de la base
  const a = R.x * Math.SQRT2, b = R.z * Math.SQRT2, H = 120, n = 48, pos = [], uv = [], idx = [];
  for (let k = 0; k <= n; k++) {
    const t = Math.PI * 0.25 + (Math.PI * 0.5) * (k / n), x = -a * Math.cos(t) * (k / n * 2 - 1 < 0 ? 1 : 1), z = -b * Math.sin(t);
    const xx = a * Math.cos(Math.PI - t);
    pos.push(xx, TABLE_Y, z, xx, TABLE_Y + H, z); uv.push(k / n, 0, k / n, 1);
    if (k < n) idx.push(k * 2, k * 2 + 2, k * 2 + 1, k * 2 + 1, k * 2 + 2, k * 2 + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tx, emissiveMap: tx, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 1, side: THREE.DoubleSide }));
  B.scene.add(m);
  B.box(4, H + 4, 4, -a * Math.cos(Math.PI * 0.75), TABLE_Y + H / 2, -b * Math.sin(Math.PI * 0.25), '#4a3222', { solid: false });
  B.box(4, H + 4, 4, a * Math.cos(Math.PI * 0.75), TABLE_Y + H / 2, -b * Math.sin(Math.PI * 0.25), '#4a3222', { solid: false });
}

// Árboles de maqueta (espuma verde sobre tronco), en las laderas menos empinadas y lejos del camino
function modelTrees(B, M) {
  const rnd = mulberry(77), spots = [];
  for (let t = 0; t < 6000 && spots.length < 420; t++) {
    const x = (rnd() * 2 - 1) * (R.x - 3), z = (rnd() * 2 - 1) * (R.z - 3);
    const y = M.h(x, z);
    if (M.road(x, z) < 5.5 || M.slope(x, z) > 1.3 || y > M.maxH * 0.72) continue;
    spots.push([x, y, z, 0.8 + rnd() * 0.9, rnd()]);
  }
  const n = spots.length, mt = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.2, 1, 5), new THREE.MeshStandardMaterial({ color: '#5b4030', roughness: 1 }), n);
  const tiers = [0, 1, 2].map((k) => new THREE.InstancedMesh(new THREE.ConeGeometry(1 - k * 0.25, 1.5, 7), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), n));
  spots.forEach(([x, y, z, s, v], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), v * 6.28);
    mt.compose(p.set(x, y + 0.5 * s, z), q, sc.set(s, s, s)); trunk.setMatrixAt(i, mt);
    col.setHSL(0.27 + v * 0.07, 0.45, 0.2 + v * 0.1);
    tiers.forEach((m, k) => { mt.compose(p.set(x, y + (1.3 + k * 0.8) * s, z), q, sc.set(s * 1.3, s, s * 1.3)); m.setMatrixAt(i, mt); m.setColorAt(i, col); });
  });
  for (const m of [trunk, ...tiers]) { m.castShadow = true; m.receiveShadow = true; B.scene.add(m); }
}

// Detalles de maqueta al pie de la montaña: lago de resina, cabañas y valla
function modelDetails(B, M) {
  const free = (x, z, r) => M.road(x, z) > r + 4 && M.h(x, z) < 0.5 && M.h(x + r, z) < 0.5 && M.h(x - r, z) < 0.5 && M.h(x, z + r) < 0.5 && M.h(x, z - r) < 0.5;
  // lago: resina azul brillante
  for (const [x, z] of [[-85, 48], [-90, -48], [80, 50], [90, -50]]) {
    if (!free(x, z, 12)) continue;
    const lake = new THREE.Mesh(new THREE.CircleGeometry(12, 28), new THREE.MeshStandardMaterial({ color: '#2f6f9a', roughness: 0.05, metalness: 0.3 }));
    lake.rotation.x = -Math.PI / 2; lake.scale.set(1, 0.65, 1); lake.position.set(x, 0.06, z); B.scene.add(lake);
    const shore = new THREE.Mesh(new THREE.RingGeometry(11.5, 13.5, 28), new THREE.MeshStandardMaterial({ color: '#c8b48a', roughness: 1 }));
    shore.rotation.x = -Math.PI / 2; shore.scale.set(1, 0.65, 1); shore.position.set(x, 0.04, z); B.scene.add(shore);
    break;
  }
  // cabañas con tejado rojo
  let k = 0;
  for (const [x, z, ry] of [[-60, 46], [-40, 52], [20, 50], [60, -52], [-20, -54], [95, 20]].map((v, i) => [...v, i * 0.9])) {
    if (k >= 4 || !free(x, z, 4)) continue; k++;
    B.box(4.5, 3, 3.5, x, 1.5, z, '#d9c7a3', { solid: false, rot: [0, ry, 0] });
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 5.2, 3), new THREE.MeshStandardMaterial({ color: '#a8342a', roughness: 0.8, flatShading: true }));
    roof.rotation.set(0, ry, Math.PI / 2); roof.rotateX(Math.PI / 2); roof.position.set(x, 3.9, z); roof.castShadow = true; B.scene.add(roof);
    B.box(1, 1.8, 0.2, x + Math.sin(ry) * 1.8, 0.9, z + Math.cos(ry) * 1.8, '#5b3a22', { solid: false, rot: [0, ry, 0] });
  }
}

// Textura de detalle en gris claro (media ≈ 1): solo añade grano y manchas al color de la ladera
function detailTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), r = mulberry(91);
  g.fillStyle = '#ececec'; g.fillRect(0, 0, S, S);
  for (let k = 0; k < 160; k++) { const x = r() * S, y = r() * S, rad = 10 + r() * 60, v = 190 + r() * 65; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${v},${v},${v},0.5)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let k = 0; k < 40000; k++) { const v = 150 + r() * 105; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Borde del camino (CRW-23, solo visual): guijarros sueltos y matas de hierba entre el camino y las rocas
function roadside(B, circuit) {
  const S = circuit.samples, N = circuit.N, hw = circuit.width / 2, [r0, r1] = circuit.drive, rnd = mulberry(23);
  const pebbles = [], tufts = [];
  for (let k = r0; k < r1; k++) {
    const i = ((k % N) + N) % N, s = S[i], s2 = S[(i + 1) % N];
    for (let j = 0; j < 9; j++) { // guijarros: casi todos en el borde, algunos dentro del camino
      const u = rnd(), side = rnd() < 0.5 ? -1 : 1, inner = rnd() < 0.25;
      const lat = side * (inner ? rnd() * (hw - 0.3) : hw - 0.35 + rnd() * 0.45), sz = inner ? 0.025 + rnd() * 0.035 : 0.04 + Math.pow(rnd(), 2) * 0.12;
      const px = s.p.x + (s2.p.x - s.p.x) * u + s.n.x * lat, pz = s.p.z + (s2.p.z - s.p.z) * u + s.n.z * lat, h = s.h + (s2.h - s.h) * u;
      pebbles.push([px, h + sz * 0.25, pz, sz, rnd()]);
    }
    for (let j = 0; j < 4; j++) { // matas de hierba seca pegadas a las rocas
      const u = rnd(), side = rnd() < 0.5 ? -1 : 1, lat = side * (hw + 0.02 + rnd() * 0.3);
      const px = s.p.x + (s2.p.x - s.p.x) * u + s.n.x * lat, pz = s.p.z + (s2.p.z - s.p.z) * u + s.n.z * lat, h = s.h + (s2.h - s.h) * u;
      tufts.push([px, h, pz, 0.6 + rnd() * 0.7, rnd()]);
    }
  }
  const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
  // guijarros (roca realista pequeña)
  const peb = new THREE.InstancedMesh(rockGeometry(1, 3.3), rockMaterial(), pebbles.length);
  pebbles.forEach(([x, y, z, sz, v], i) => {
    e.set((v - 0.5) * 0.6, v * 40, (v - 0.5) * 0.5); q.setFromEuler(e);
    mt.compose(p.set(x, y, z), q, sc.set(sz * (1 + v * 0.5), sz * 0.6, sz)); peb.setMatrixAt(i, mt);
    peb.setColorAt(i, c.setHSL(0.08 + v * 0.05, 0.08 + v * 0.1, 0.55 + v * 0.25));
  });
  peb.receiveShadow = true; B.scene.add(peb);
  // matas: haz de briznas finas, verde en la base y pajizo en la punta
  const blades = [], cols = [];
  for (let b = 0; b < 9; b++) {
    const a = b / 9 * Math.PI * 2 + b, lean = 0.25 + (b % 3) * 0.15, h = 0.16 + (b % 4) * 0.05, w = 0.012;
    const bx = Math.cos(a) * 0.02, bz = Math.sin(a) * 0.02, tx = bx + Math.cos(a) * lean * h, tz = bz + Math.sin(a) * lean * h;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    blades.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, h, tz);
    cols.push(0.33, 0.42, 0.18, 0.33, 0.42, 0.18, 0.78, 0.72, 0.42);
  }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); bg.computeVertexNormals();
  const tuft = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), tufts.length);
  tufts.forEach(([x, y, z, s, v], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), v * 6.28);
    mt.compose(p.set(x, y, z), q, sc.set(s, s * (0.8 + v * 0.5), s)); tuft.setMatrixAt(i, mt);
    tuft.setColorAt(i, c.setHSL(0.15 + v * 0.08, 0.35, 0.75 + v * 0.25));
  });
  B.scene.add(tuft);
}
