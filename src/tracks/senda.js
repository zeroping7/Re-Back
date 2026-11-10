import * as THREE from 'three';
import { groundTex } from '../textures.js';
import { buildCircuit, room, trackRibbon, bannerTexture } from './common.js';
import { crawlKit, LEN } from './crawlkit.js';
import { rockWalls, rockField, pines, curtainMaterial, moon } from './diorama.js';

// Circuito 1 de Obstáculos · "La maqueta" (CRW-09..12): diorama de crawlers sobre mesa, con cortinas azules y luna.
// Un solo camino estrecho (A→B, la meta está donde la salida) con nueve obstáculos obligatorios que ocupan todo el ancho.
const R = { x: 74, z: 38, h: 44 };
// Óvalo corto: dos tramos rectos (y=±10) unidos por semicírculos de radio 10. Los obstáculos van casi seguidos (CRW-13).
const XW = 42, RAD = 10;
const arc = (cx, a0, a1, n) => Array.from({ length: n }, (_, k) => { const a = a0 + (a1 - a0) * (k + 1) / (n + 1); return [cx + RAD * Math.cos(a), RAD * Math.sin(a)]; });
const PTS = [
  ...[-XW, -28, -14, 0, 14, 28, XW].map((x) => [x, RAD]),
  ...arc(XW, Math.PI / 2, -Math.PI / 2, 3),
  ...[XW, 28, 14, 0, -14, -28, -XW].map((x) => [x, -RAD]),
  ...arc(-XW, -Math.PI / 2, -3 * Math.PI / 2, 3),
];
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
  desc: 'Un solo camino y nueve obstáculos obligatorios',
  color: '#8d6e3f',
  medals: [220, 180, 150],
  music: 'parque', ambient: 'salon',
  build,
};

function build(B) {
  // ---------- Sala: cortinas azules, luna y tapete de césped ----------
  const gr = groundTex('grass', [16, 9]);
  const floorMat = new THREE.MeshStandardMaterial({ map: gr.map, normalMap: gr.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.95, color: '#a9b88a' });
  room(B, { x: R.x, z: R.z, h: R.h, floor: floorMat, wall: curtainMaterial(), ceil: '#070d24', baseboard: null });
  moon(B, { x: 20, y: 27, z: -R.z });

  // camino de tierra (también es la superficie de la cuesta)
  const dt = groundTex('dirt', [1, 1]);
  const dirtMat = new THREE.MeshStandardMaterial({ map: dt.map, normalMap: dt.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 1, color: '#c9ad82' });

  const circuit = buildCircuit(B, {
    points: PTS,
    start: [-XW, RAD],
    width: 2.6,
    limits: [R.x - 2, R.z - 2],
    hills: [{ at: [at(BOT, 'climb'), -RAD], len: LEN.climb - 1, h: 1.2 }],
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

  // salida / meta
  {
    const s0 = circuit.samples[0], yaw = circuit.yawOf(s0.t);
    for (const sd of [-1, 1]) { const p = s0.p.clone().addScaledVector(s0.n, sd * 1.55); B.cyl(0.12, 0.12, 2.2, p.x, 1.1, p.z, '#dddddd', { seg: 8, solid: false }); }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.7), new THREE.MeshBasicMaterial({ map: bannerTex('SALIDA · META'), side: THREE.DoubleSide }));
    banner.position.set(s0.p.x, 2.3, s0.p.z); banner.rotation.y = yaw + Math.PI;
    B.scene.add(banner);
  }

  // ---------- Decorado ----------
  rockWalls(B, circuit);
  rockField(B, circuit, { x0: -50, x1: 50, z0: -4, z1: 4, count: 30, rMin: 1.6, rMax: 3.2, hMin: 1.4, hMax: 2.6, away: 2.5, seed: 12 }); // montaña central
  rockField(B, circuit, { x0: -R.x + 3, x1: R.x - 3, z0: 18, z1: R.z - 2, count: 46, rMin: 3, rMax: 7, hMin: 1.1, hMax: 2.3, away: 4, seed: 21 });
  rockField(B, circuit, { x0: -R.x + 3, x1: R.x - 3, z0: -R.z + 2, z1: -18, count: 46, rMin: 3, rMax: 7, hMin: 1.1, hMax: 2.3, away: 4, seed: 22 });
  rockField(B, circuit, { x0: 66, x1: R.x - 2, z0: -22, z1: 22, count: 14, rMin: 3, rMax: 6, hMin: 1.1, hMax: 2, away: 4, seed: 23 });
  rockField(B, circuit, { x0: -R.x + 2, x1: -66, z0: -22, z1: 22, count: 14, rMin: 3, rMax: 6, hMin: 1.1, hMax: 2, away: 4, seed: 24 });
  pines(B, circuit, { x0: -46, x1: 46, z0: -5, z1: 5, count: 16, away: 4, seed: 4, min: 0.9, max: 1.5 });
  pines(B, circuit, { x0: -R.x + 4, x1: R.x - 4, z0: 16, z1: R.z - 3, count: 40, away: 7, seed: 5 });
  pines(B, circuit, { x0: -R.x + 4, x1: R.x - 4, z0: -R.z + 3, z1: -16, count: 40, away: 7, seed: 6 });

  return {
    circuit,
    bounds: { x: R.x - 1.5, z: R.z - 1.5, h: R.h - 1 },
    zones: T.zones, hazards: T.hazards, gates: T.gates, safe: T.safe, pits: T.pits,
    step: T.step, update: T.update,
    dust: [0.7, 0.6, 0.45],
    lights: {
      background: '#0a1230',
      hemi: ['#c9d6ff', '#4a3a28', 0.75],
      sun: { color: '#fff1da', intensity: 3.1, offset: [16, 42, 22] },
      env: 0.4,
      points: [],
    },
  };
}

function bannerTex(text) { return bannerTexture(text, '#1565c0'); }
