import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createBuilder, scaleTrack, mergeStatic, clearMatCache, chevronTexture, makePuddles } from '/home/claude/re-back/src/tracks/common.js';
import { ALL_TRACKS, trackFromKey } from '/home/claude/re-back/src/tracks/index.js';
import { surfaceTex } from '/home/claude/re-back/src/textures.js';

const $ = (id) => document.getElementById(id);
globalThis.__visorElev = { override: null, seen: null };
const DISC = { race: 'Carrera', drift: 'Drift', obst: 'Obstáculos' };
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.localClippingEnabled = true;
$('view').appendChild(renderer.domElement);
const pm = new THREE.PMREMGenerator(renderer);
const envMap = pm.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.maxDistance = 900; controls.minDistance = 3;
const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 30);
renderer.clippingPlanes = [clip];

let PUD = null, scene, T, world, marks, curves = [], clock = 0, bounds, S = 2, MIR = false, trackId = '', ROOT = null;

function label(text, color, size = 1) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = 'bold 56px system-ui'; const w = Math.ceil(g.measureText(text).width) + 40; c.width = w; c.height = 80;
  g.font = 'bold 56px system-ui'; g.fillStyle = color; g.beginPath(); g.roundRect(0, 0, w, 80, 24); g.fill();
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(text, 20, 42);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, transparent: true }));
  sp.renderOrder = 999; sp.userData.base = [w / 80 * size, size]; sp.material.clippingPlanes = [];
  return sp;
}

function findCurves(c) {
  const s = c.samples, N = s.length, R = 34;
  const yaw = (i) => Math.atan2(s[i].t.x, s[i].t.z);
  const out = []; let cur = null;
  for (let i = 0; i < N; i++) {
    const dr = c.drive, inDrive = !dr || ((i - dr[0]) % N + N) % N <= dr[1] - dr[0];
    const tight = inDrive && s[i].radius < R;
    if (tight) { if (!cur) cur = { i0: i, i1: i, minR: Infinity }; cur.i1 = i; cur.minR = Math.min(cur.minR, s[i].radius); }
    else if (cur && i - cur.i1 > 3) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  if (out.length > 1 && out[0].i0 === 0 && out[out.length - 1].i1 >= N - 4) { const l = out.pop(); out[0] = { i0: l.i0 - N, i1: out[0].i1, minR: Math.min(l.minR, out[0].minR) }; }
  return out.map((q) => {
    let turn = 0; for (let i = q.i0; i < q.i1; i++) { let d = yaw((i + 1 + N) % N) - yaw((i + N) % N); d = Math.atan2(Math.sin(d), Math.cos(d)); turn += d; }
    const deg = Math.round(Math.abs(turn) * 180 / Math.PI);
    const mid = s[((Math.round((q.i0 + q.i1) / 2)) + N) % N];
    return { ...q, deg, dir: turn > 0 ? 'izq' : 'der', p: mid.p.clone(), h: mid.h ?? 0, kind: deg > 150 ? 'horquilla' : q.minR < 18 ? 'cerrada' : 'abierta' };
  }).filter((q) => q.deg >= 20);
}

async function load(key) {
  if (scene) { scene.traverse((o) => { o.geometry?.dispose(); }); world?.free(); }
  clearMatCache?.();
  const def = trackFromKey(key);
  scene = new THREE.Scene(); scene.environment = envMap;
  world = new RAPIER.World({ x: 0, y: -9.8, z: 0 });
  S = def.scale ?? 2; MIR = !!def.mirror; trackId = key; const mirror = MIR;
  const root = new THREE.Group(); root.scale.set(mirror ? -S : S, S, S); scene.add(root); ROOT = root;
  const B = createBuilder(root, world, RAPIER, S, { mirror, reverse: !!def.reverse });
  T = def.build(B); scaleTrack(T, S, mirror); bounds = T.bounds; PUD = makePuddles(B);
  const L = T.lights;
  scene.background = new THREE.Color(L.background || '#1b1d2a'); scene.environmentIntensity = L.env ?? 0.35;
  scene.add(new THREE.HemisphereLight(...L.hemi));
  const sun = new THREE.DirectionalLight(L.sun.color, L.sun.intensity);
  sun.position.set(...L.sun.offset).normalize().multiplyScalar(400); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const m = Math.max(bounds.x, bounds.z) * 1.1; Object.assign(sun.shadow.camera, { left: -m, right: m, top: m, bottom: -m, near: 1, far: 1000 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; scene.add(sun, sun.target);
  for (const p of L.points || []) { const l = new THREE.PointLight(p.color, p.intensity, p.distance, p.decay); l.position.set(...p.pos); scene.add(l); }
  // zonas: guardar sus mallas antes de fusionar lo estático
  for (const z of T.zones || []) if (z.mesh) z.mesh.userData.dynamic = true;
  mergeStatic(scene);
  clip.constant = def.oneWay ? bounds.h + 5 : bounds.h * 0.55; $('cut').max = Math.ceil(bounds.h * 1.05); $('cut').value = clip.constant;

  marks = new THREE.Group(); scene.add(marks);
  const cs = T.circuit.samples;
  curves = findCurves(T.circuit);
  const list = $('list'); list.innerHTML = '';
  const add = (sp, p, h, info, item) => { sp.position.set(p.x, h + 3, p.z); marks.add(sp); if (item) { const b = document.createElement('button'); b.textContent = item; b.onclick = () => focus(p, h, info); list.appendChild(b); } };
  add(label('SALIDA', '#2e7d32', 1.4), cs[0].p, cs[0].h ?? 0, 'Salida', '🏁 Salida');
  if (T.finishIdx !== undefined) { const f = cs[T.finishIdx]; add(label('META', '#2e7d32', 1.4), f.p, f.p.y, 'Meta', '🏆 Meta'); }
  curves.forEach((q, k) => {
    const name = `C${k + 1}`;
    add(label(`${name} ${q.dir === 'izq' ? '↰' : '↱'} ${q.deg}°`, q.kind === 'abierta' ? '#1565c0' : q.kind === 'cerrada' ? '#ef6c00' : '#c62828', 1.4), q.p, q.h, `${name}: ${q.kind}, a la ${q.dir === 'izq' ? 'izquierda' : 'derecha'}, ${q.deg}°`, `${name} ${q.dir === 'izq' ? '↰' : '↱'}`);
  });
  (T.gates || []).forEach((g, k) => { const s = cs[g.i]; if (s) add(label(`O${k + 1}`, '#6a1b9a', 1.2), s.p, (s.h ?? 0) + 2.5, `Obstáculo ${k + 1}: ${g.name || ''}`, `O${k + 1}`); });
  const dr = T.circuit.drive, N = cs.length;
  const pts = dr ? Array.from({ length: dr[1] - dr[0] + 1 }, (_, k) => cs[((dr[0] + k) % N + N) % N]).map((s) => new THREE.Vector3(s.p.x, s.p.y + 0.25, s.p.z)) : cs.map((s) => new THREE.Vector3(s.p.x, (s.h ?? 0) + 0.25, s.p.z));
  if (!dr) pts.push(pts[0].clone());
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#ffeb3b', depthTest: false, transparent: true, opacity: 0.8 }));
  line.renderOrder = 998; line.material.clippingPlanes = []; marks.add(line);
  const lbOn = $('lb').classList.contains('on'); for (const o of marks.children) if (o.isSprite) o.visible = lbOn;
  $('info').textContent = `${def.name} · ${DISC[def.disc || 'race']} · ${curves.length} curvas · ${Math.round(T.circuit.drive ? (T.circuit.drive[1] - T.circuit.drive[0]) * T.circuit.spacing : T.circuit.length)} m`;
  let hk = 0, rk = 0;
  boosts = (T.zones || []).filter((z) => z.effect === 'boost' && z.mesh);
  boosts.forEach((z) => { z.c = (z.from + Math.round(((z.to - z.from + N) % N) / 2)) % N; });
  // armas: filas de 3 cajas en T.itemSpots (fracción de vuelta)
  arms = (T.itemSpots || []).map((f) => newArm(Math.floor(f * N) % N));
  for (const a of arms) a.g.visible = $('ar').classList.contains('on');
  // alturas: etiquetas Cuesta/Rampa en el pico de cada una
  (T.circuit.elev || []).forEach((e) => {
    if (e.kind !== 'hill' && e.kind !== 'ramp') return;
    let best = e.i0; for (let i = e.i0; i <= e.i1; i++) if ((cs[(i + N) % N].h ?? 0) > (cs[(best + N) % N].h ?? 0)) best = i;
    const s = cs[(best + N) % N], n = e.kind === 'hill' ? `Cuesta ${++hk}` : `Rampa ${++rk}`;
    add(label(n, e.kind === 'hill' ? '#00897b' : '#5d4037', 1.2), s.p, (s.h ?? 0) * S + 1, n, null);
  });
  initZones();
  tCount();
  detectComps();
  view('top');
}

function focus(p, h, info) {
  controls.target.set(p.x, h, p.z);
  const d = camera.position.clone().sub(controls.target).setLength(45); if (d.y < 18) d.y = 18;
  camera.position.copy(controls.target).add(d); controls.update(); $('info').textContent = info;
}
function view(k) {
  const rot = camera.aspect < 1 && bounds.x > bounds.z;
  const [w, h] = rot ? [bounds.z, bounds.x] : [bounds.x, bounds.z];
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const m = Math.max(h / tv, w / (tv * camera.aspect)) * 1.05;
  controls.target.set(0, 0, 0);
  if (k === 'top') camera.position.set(rot ? 0.01 : 0, m, rot ? 0 : 0.01); else camera.position.set(m * 0.45, m * 0.55, m * 0.6);
  controls.update();
}

const sel = $('trk');
for (const t of ALL_TRACKS) sel.add(new Option(`${DISC[t.disc || 'race']} · ${t.name}`, t.id));
const q = new URLSearchParams(location.search).get('t'); sel.value = q && [...sel.options].some((o) => o.value === q) ? q : 'salon';
sel.onchange = async () => { EV.override = null; await load(sel.value); if ($('elp').style.display !== 'none') $('elt').value = elevText(); };
$('cut').oninput = (e) => { clip.constant = +e.target.value; };
document.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => view(b.dataset.v)));
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const tick = () => {
  controls.update(); clock += 1 / 60; T?.update?.(clock, {}); PUD?.update(clock);
  if (marks) { const k = camera.position.distanceTo(controls.target) * 0.022; for (const o of marks.children) if (o.isSprite) o.scale.set(o.userData.base[0] * k, o.userData.base[1] * k, 1); }
  if (scene) renderer.render(scene, camera);
};
RAPIER.init().then(() => load(sel.value).then(() => renderer.setAnimationLoop(tick)));

// ---------- Mover turbos ----------
let boosts = [], editing = false, drag = null, arms = [];
const boxG = new THREE.BoxGeometry(2.4, 2.4, 2.4), boxM = new THREE.MeshStandardMaterial({ color: '#ff9d00', emissive: '#ff9d00', emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
function placeArm(a) {
  const s = T.circuit.samples[a.c], w = T.circuit.width / 2;
  a.g.children.forEach((m, k) => { m.position.copy(s.p).addScaledVector(s.n, (k - 1) * 0.45 * w); m.position.y = (s.h ?? 0) * S + 2; });
}
function newArm(c) {
  const g = new THREE.Group(); for (let k = 0; k < 3; k++) g.add(new THREE.Mesh(boxG, boxM));
  scene.add(g); const a = { g, c }; placeArm(a); return a;
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hitP = new THREE.Vector3();
function setRay(e) { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
const loc = (v) => new THREE.Vector3(v.x / (MIR ? -S : S), v.y / S, v.z / S);
function reshape(z, c) {
  const cs = T.circuit.samples, N = cs.length, g = z.mesh.geometry, pa = g.attributes.position;
  const half = (pa.count / 2 - 1) / 2;
  const hw = Math.hypot(pa.getX(0) - pa.getX(1), pa.getZ(0) - pa.getZ(1)) / 2;
  for (let k = -half, n = 0; k <= half; k++, n++) {
    const s = cs[(c + k + N) % N], p = loc(s.p), nn = loc(s.n).normalize();
    pa.setXYZ(n * 2, p.x + nn.x * hw, s.h + 0.05, p.z + nn.z * hw);
    pa.setXYZ(n * 2 + 1, p.x - nn.x * hw, s.h + 0.05, p.z - nn.z * hw);
  }
  pa.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox();
  z.c = c; z.from = (c - half + N) % N; z.to = (c + half) % N;
}
function exportText() {
  const cs = T.circuit.samples;
  const list = boosts.map((z) => { const p = loc(cs[z.c].p); return `[${Math.round(p.x)}, ${Math.round(p.z)}]`; });
  const N = cs.length, out = [];
  out.push(`turbos ${trackId}: [${list.join(', ')}]`);
  out.push(`armas ${trackId}: [${[...arms].sort((a, b) => a.c - b.c).map((a) => +(a.c / N).toFixed(3)).join(', ')}]`);
  return out.join('\n');
}
function showExport() { $('info').textContent = exportText(); }
const cvs = renderer.domElement;
cvs.addEventListener('pointerdown', (e) => {
  if (!editing) return; setRay(e);
  const vis = arms.filter((a) => a.g.visible);
  const h = ray.intersectObjects([...boosts.map((z) => z.mesh), ...vis.flatMap((a) => a.g.children)])[0];
  if (!h) return;
  drag = boosts.find((z) => z.mesh === h.object) || vis.find((a) => a.g.children.includes(h.object));
  plane.set(new THREE.Vector3(0, 1, 0), -h.point.y);
  controls.enabled = false; cvs.setPointerCapture(e.pointerId); (drag.mesh ? drag.mesh.material : boxM).emissive.set('#ffd54f');
}, true);
cvs.addEventListener('pointermove', (e) => {
  if (!drag) return; setRay(e);
  if (!ray.ray.intersectPlane(plane, hitP)) return;
  const s = T.circuit.sampleNear(hitP.x, hitP.z); if (s.i !== drag.c) { if (drag.mesh) reshape(drag, s.i); else { drag.c = s.i; placeArm(drag); } showExport(); }
});
for (const ev of ['pointerup', 'pointercancel']) cvs.addEventListener(ev, () => { if (!drag) return; if (drag.mesh) drag.mesh.material.emissive.set('#ffffff'); else boxM.emissive.set('#ff9d00'); drag = null; controls.enabled = true; showExport(); });
$('bt').onclick = (e) => { editing = !editing; e.target.classList.toggle('on', editing); if (editing) { setTMode(null); showExport(); } for (const z of boosts) z.mesh.material.emissive.set('#ffffff'); };

// ---------- Añadir / quitar turbos y armas ----------
let tMode = null, chevTex = null;
function newBoost(c) {
  chevTex ||= chevronTexture();
  const cs = T.circuit.samples, N = cs.length, half = Math.max(1, Math.round(5 / 2 / 1.6)), hw = T.circuit.width / S / 2 - 0.4;
  const pos = [], uv = [], idx = [];
  for (let k = -half, n = 0; k <= half; k++, n++) {
    const s = cs[(c + k + N) % N], p = loc(s.p), nn = loc(s.n).normalize();
    pos.push(p.x + nn.x * hw, s.h + 0.05, p.z + nn.z * hw, p.x - nn.x * hw, s.h + 0.05, p.z - nn.z * hw);
    uv.push(0, n / (half * 2) * 5 / (hw * 2), 1, n / (half * 2) * 5 / (hw * 2));
    if (k < half) { const a = n * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: chevTex, emissive: '#ffffff', emissiveMap: chevTex, emissiveIntensity: 0.9, transparent: true, opacity: 0.95, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -3 }));
  mesh.receiveShadow = true; ROOT.add(mesh);
  const z = { mesh, effect: 'boost', added: true }; reshape(z, c); return z;
}
function tCount() { const l = $('tl'); if (l) l.textContent = `🚀 ${boosts.length} turbos · 🎁 ${arms.length} armas`; }
function setTMode(m) {
  tMode = tMode === m ? null : m;
  for (const [id, k] of [['ta', 'boost'], ['aa', 'arm'], ['tq', 'del']]) $(id).classList.toggle('on', tMode === k);
  if (tMode) { if (cMode) setCMode(null); if (zMode) setZMode(zMode); if (editing) $('bt').click(); }
  if (tMode === 'del' && !$('ar').classList.contains('on')) $('ar').click();
  $('info').textContent = tMode === 'boost' ? 'Toca la pista para poner un turbo' : tMode === 'arm' ? 'Toca la pista para poner armas' : tMode === 'del' ? 'Toca un turbo o una caja para quitarlo' : exportText();
}
$('tu').onclick = (e) => { const on = $('tp').style.display === 'none'; if (on && $('cp').style.display !== 'none') $('co').click(); if (on && $('zp').style.display !== 'none') $('zo').click(); $('tp').style.display = on ? '' : 'none'; e.target.classList.toggle('on', on); if (!on) setTMode(null); else tCount(); };
$('ta').onclick = () => setTMode('boost');
$('aa').onclick = () => setTMode('arm');
$('tq').onclick = () => setTMode('del');
$('tc').onclick = async () => { try { await navigator.clipboard.writeText(exportText()); $('info').textContent = '✅ Turbos y armas copiados'; } catch { showExport(); } };
let tDown = null;
cvs.addEventListener('pointerdown', (e) => { if (tMode) tDown = [e.clientX, e.clientY]; });
cvs.addEventListener('pointerup', (e) => {
  if (!tMode || !tDown) return;
  const moved = Math.hypot(e.clientX - tDown[0], e.clientY - tDown[1]); tDown = null;
  if (moved > 8) return; // arrastre de cámara
  setRay(e);
  if (tMode === 'del') {
    const vis = arms.filter((a) => a.g.visible);
    const h = ray.intersectObjects([...boosts.map((z) => z.mesh), ...vis.flatMap((a) => a.g.children)])[0];
    let b = h && boosts.find((z) => z.mesh === h.object), a = h && !b && vis.find((x) => x.g.children.includes(h.object));
    if (!h) { // sin acierto directo: el más cercano al punto tocado de la pista
      const hp = ray.intersectObjects(scene.children, true).filter((x) => !x.object.isSprite && !x.object.isLine)[0]?.point;
      if (hp) {
        const N = T.circuit.samples.length, i = T.circuit.sampleNear(hp.x, hp.z).i, d = (c) => Math.min((c - i + N) % N, (i - c + N) % N);
        const best = [...boosts, ...vis].map((o) => [o, d(o.c)]).sort((x, y) => x[1] - y[1])[0];
        if (best && best[1] <= 6) { if (best[0].mesh) b = best[0]; else a = best[0]; }
      }
    }
    if (b) { b.mesh.parent?.remove(b.mesh); b.mesh.geometry.dispose(); boosts = boosts.filter((z) => z !== b); $('info').textContent = '🗑️ Turbo quitado'; }
    else if (a) { scene.remove(a.g); arms = arms.filter((x) => x !== a); $('info').textContent = '🗑️ Armas quitadas'; }
    else $('info').textContent = 'Ahí no hay turbo ni armas';
    tCount(); return;
  }
  const hits = ray.intersectObjects(scene.children, true).filter((h) => !h.object.isSprite && !h.object.isLine);
  const p = hits[0]?.point || (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP) && hitP);
  if (!p) return;
  const s = T.circuit.sampleNear(p.x, p.z);
  if (Math.hypot(p.x - s.p.x, p.z - s.p.z) > T.circuit.width * 0.9) { $('info').textContent = 'Toca encima de la pista'; return; }
  if (tMode === 'boost') { boosts.push(newBoost(s.i)); $('info').textContent = '✅ Turbo añadido'; }
  else { const a = newArm(s.i); a.g.visible = true; if (!$('ar').classList.contains('on')) $('ar').click(); arms.push(a); $('info').textContent = '✅ Armas añadidas'; }
  tCount();
});

// ---------- Alturas (texto editable) ----------
const EV = globalThis.__visorElev;
const fmt = (a) => '[\n' + a.map((o) => '  { ' + Object.entries(o).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(', ')}]` : v}`).join(', ') + ' },').join('\n') + '\n]';
function elevText() { const v = EV.override || EV.seen || { hills: [], ramps: [] }; return `hills: ${fmt(v.hills || [])},\nramps: ${fmt(v.ramps || [])},`; }
function parseElev(t) {
  const j = ('{' + t.replace(/\/\/.*$/gm, '') + '}').replace(/([{,\s])([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/,(\s*[}\]])/g, '$1').replace(/,\s*}$/, '}');
  const o = JSON.parse(j);
  for (const k of Object.keys(o)) if (k !== 'hills' && k !== 'ramps') throw new Error('solo hills y ramps');
  return { hills: o.hills || [], ramps: o.ramps || [] };
}
$('el').onclick = (e) => { const on = $('elp').style.display === 'none'; $('elp').style.display = on ? '' : 'none'; e.target.classList.toggle('on', on); if (on) $('elt').value = elevText(); };
$('ela').onclick = async () => {
  try { EV.override = parseElev($('elt').value); } catch (err) { $('info').textContent = '❌ Error en el texto: ' + err.message; return; }
  await reloadKeep();
  $('info').textContent = '✅ Alturas aplicadas';
};
$('elr').onclick = async () => { EV.override = null; await load(sel.value); $('elt').value = elevText(); $('info').textContent = 'Alturas originales'; };

$('lb').onclick = (e) => { const on = e.target.classList.toggle('on'); if (marks) { marks.visible = true; for (const o of marks.children) if (o.isSprite) o.visible = on; } applyZoneVis(); };

// Copiar todo: alturas + turbos + zonas de una vez
$('ca').onclick = async () => {
  const t = `alturas ${trackId}:\n${$('elp').style.display !== 'none' ? $('elt').value : elevText()}\n` + exportText() + '\n' + zonesText();
  try { await navigator.clipboard.writeText(t); $('info').textContent = '✅ Copiado (alturas + turbos + armas + zonas)'; } catch { $('info').textContent = 'No se pudo copiar'; }
};

$('ar').onclick = (e) => { const on = e.target.classList.toggle('on'); for (const a of arms) a.g.visible = on; };

// ---------- Zonas de superficie (tierra, agua, arena…) ----------
const ZT = {
  mud: { name: 'Tierra/barro', icon: '🟫', color: '#8d5a2b', effect: 'slide' },
  sand: { name: 'Arena', icon: '🟨', color: '#e8c25a', effect: 'slide', tex: 'sand' },
  sandDeep: { name: 'Arena profunda', icon: '🏜️', color: '#b8862e', effect: 'sand', tex: 'sand' },
  wax: { name: 'Cera', icon: '🟧', color: '#f2a03c', effect: 'slide' },
  water: { name: 'Charco', icon: '💧', color: '#29b6f6', effect: 'wet' },
};
let zones = [], zMode = null, zType = 'mud', zLen = 18, zShow = true;
const zMats = {};
function zMat(type, real) {
  const k = type + (real ? 'R' : 'O');
  if (zMats[k]) return zMats[k];
  if (real && type !== 'water') {
    const tx = surfaceTex(ZT[type].tex || type, [1, 3]);
    zMats[k] = new THREE.MeshStandardMaterial({ ...tx, color: '#ffffff', roughness: 1, metalness: 0.05 });
  } else zMats[k] = new THREE.MeshStandardMaterial({ color: ZT[type].color, roughness: 0.15, metalness: 0.1, transparent: true, opacity: real ? 0.8 : 0.45, depthWrite: false });
  zMats[k].polygonOffset = true; zMats[k].polygonOffsetFactor = -2;
  return zMats[k];
}
// tira sobre la pista (en coordenadas locales del circuito, como trackPatch)
function stripGeo(c, len, lift) {
  const cs = T.circuit.samples, N = cs.length, half = Math.max(1, Math.round(len / 2 / 1.6)), hw = T.circuit.width / S / 2 - 0.1;
  const pos = [], uv = [], idx = [];
  for (let k = -half, n = 0; k <= half; k++, n++) {
    const s = cs[(c + k + N) % N], p = loc(s.p), nn = loc(s.n).normalize();
    pos.push(p.x + nn.x * hw, s.h + lift, p.z + nn.z * hw, p.x - nn.x * hw, s.h + lift, p.z - nn.z * hw);
    uv.push(0, n / (half * 2) * len / (hw * 2), 1, n / (half * 2) * len / (hw * 2));
    if (k < half) { const a = n * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return { g, half };
}
function discGeo(c, r, lift) {
  const s = T.circuit.samples[c], p = loc(s.p);
  const g = new THREE.CircleGeometry(r, 28); g.rotateX(-Math.PI / 2); g.translate(p.x, s.h + lift, p.z);
  return g;
}
function makeOverlay(z) {
  const geo = z.type === 'water' ? discGeo(z.c, z.r, 0.12) : stripGeo(z.c, z.len, 0.12).g;
  const o = new THREE.Mesh(geo, zMat(z.type, false)); o.renderOrder = 5; o.userData.zone = z;
  ROOT.add(o); z.overlay = o;
  const s = T.circuit.samples[z.c];
  z.label = label(`${ZT[z.type].icon} ${ZT[z.type].name}${z.added ? ' +' : ''}`, ZT[z.type].color, 1.1);
  z.label.position.set(s.p.x, (s.h ?? 0) * S + 2.5, s.p.z); marks.add(z.label);
}
function guessType(z) {
  if (z.effect === 'sand') return 'sandDeep'; // arena profunda: frena
  if (z.surface && ZT[z.surface]) return z.surface;
  if (z.effect === 'wet') return 'water';
  return 'mud';
}
function initZones() {
  zones = [];
  const cs = T.circuit.samples, N = cs.length;
  for (const z of T.zones || []) {
    if (z.effect === 'boost' || z.effect === 'push') continue;
    let c, entry;
    if (z.from !== undefined) {
      const span = (z.to - z.from + N) % N; c = (z.from + Math.round(span / 2)) % N;
      entry = { orig: z, type: guessType(z), c, len: Math.round(span * 1.6), mesh: z.mesh };
    } else if (z.pos) {
      c = T.circuit.sampleNear(z.pos.x, z.pos.z).i;
      entry = { orig: z, type: guessType(z), c, r: z.r / S, pos: z.pos };
    } else continue;
    zones.push(entry); makeOverlay(entry);
  }
  applyZoneVis(); zoneList();
}
function applyZoneVis() {
  for (const z of zones) {
    if (z.overlay) z.overlay.visible = zShow;
    if (z.label) z.label.visible = zShow && $('lb').classList.contains('on');
    if (z.real) z.real.visible = true;
  }
}
function addZone(c) {
  const z = { type: zType, c, added: true };
  if (zType === 'water') z.r = 3.6; else z.len = zLen;
  if (zType === 'water') {
    // el charco de siempre (el del muelle), igual que en el juego
    const s = T.circuit.samples[c], lt = loc(s.t);
    z.r = 3.4; z.realMeshes = PUD.add(loc(s.p), Math.atan2(lt.x, lt.z), s.h).meshes;
  } else { z.real = new THREE.Mesh(stripGeo(c, z.len, 0.05).g, zMat(zType, true)); z.real.receiveShadow = true; ROOT.add(z.real); }
  zones.push(z); makeOverlay(z); applyZoneVis(); zoneList();
  $('info').textContent = `✅ ${ZT[zType].name} añadida`;
}
function removeZone(z) {
  for (const k of ['overlay', 'real']) if (z[k]) { z[k].parent?.remove(z[k]); z[k].geometry.dispose(); }
  if (z.label) marks.remove(z.label);
  if (z.mesh) z.mesh.visible = false;
  for (const m of [...(z.realMeshes || []), ...(z.orig?.meshes || [])]) m.parent?.remove(m);
  if (z.orig) z.removed = true;
  zones = zones.filter((x) => x !== z || x.orig);
  applyZoneVis(); zoneList();
  $('info').textContent = `🗑️ ${ZT[z.type].name} quitada`;
}
function zonesText() {
  const cs = T.circuit.samples, N = cs.length;
  const live = zones.filter((z) => !z.removed);
  const fmtZ = (z) => { const p = loc(cs[z.c].p); return `{ tipo: '${z.type}', at: [${Math.round(p.x)}, ${Math.round(p.z)}], frac: ${(z.c / N).toFixed(3)}, ${z.type === 'water' ? `r: ${+z.r.toFixed(1)}` : `len: ${z.len}`} }`; };
  const out = [`zonas ${trackId}: [${live.map(fmtZ).join(', ')}]`];
  const rem = zones.filter((z) => z.removed).length, add = zones.filter((z) => z.added).length;
  if (rem || add) out.push(`// ${add} añadidas, ${rem} quitadas`);
  return out.join('\n');
}
function zoneList() {
  const l = $('zl'); if (!l) return;
  const live = zones.filter((z) => !z.removed);
  l.textContent = live.length ? live.map((z) => ZT[z.type].icon).join(' ') + ` (${live.length})` : 'Sin zonas';
}
// panel
const zt = $('zt');
for (const [k, v] of Object.entries(ZT)) { const b = document.createElement('button'); b.textContent = `${v.icon} ${v.name}`; b.dataset.zt = k; if (k === zType) b.classList.add('on'); b.onclick = () => { zType = k; zt.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); $('zlr').style.display = k === 'water' ? 'none' : ''; }; zt.appendChild(b); }
$('zlen').oninput = (e) => { zLen = +e.target.value; $('zlv').textContent = zLen; };
$('zo').onclick = (e) => { const on = $('zp').style.display === 'none'; if (on && $('cp').style.display !== 'none') $('co').click(); if (on && $('tp').style.display !== 'none') $('tu').click(); $('zp').style.display = on ? '' : 'none'; e.target.classList.toggle('on', on); if (!on && zMode) setZMode(zMode); };
$('zv').onclick = (e) => { zShow = !zShow; e.target.classList.toggle('on', zShow); e.target.textContent = zShow ? '👁️ Ver' : '🙈 Ocultas'; applyZoneVis(); };
function setZMode(m) { zMode = zMode === m ? null : m; $('za').classList.toggle('on', zMode === 'add'); $('zr').classList.toggle('on', zMode === 'del'); if (zMode && tMode) setTMode(tMode); if (zMode && cMode) setCMode(null); $('info').textContent = zMode === 'add' ? 'Toca la pista para añadir la zona' : zMode === 'del' ? 'Toca una zona para quitarla' : zonesText(); if (zMode === 'del' && !zShow) $('zv').click(); }
$('za').onclick = () => setZMode('add');
$('zr').onclick = () => setZMode('del');
$('zc').onclick = async () => { try { await navigator.clipboard.writeText(zonesText()); $('info').textContent = '✅ Zonas copiadas'; } catch { $('info').textContent = zonesText(); } };
let zDown = null;
cvs.addEventListener('pointerdown', (e) => { if (zMode) zDown = [e.clientX, e.clientY]; });
cvs.addEventListener('pointerup', (e) => {
  if (!zMode || !zDown) return;
  const moved = Math.hypot(e.clientX - zDown[0], e.clientY - zDown[1]); zDown = null;
  if (moved > 8) return; // fue un arrastre de cámara
  setRay(e);
  if (zMode === 'del') {
    const h = ray.intersectObjects(zones.filter((z) => z.overlay && !z.removed).map((z) => z.overlay))[0];
    let zz = h?.object.userData.zone;
    if (!zz) { const i = trackIdxAt(e); if (i >= 0) { const best = zones.filter((z) => !z.removed).map((z) => [z, cyc(z.c, i)]).sort((x, y) => x[1] - y[1])[0]; if (best && best[1] <= 6) zz = best[0]; } }
    if (zz) removeZone(zz); else $('info').textContent = 'Ahí no hay zona';
    return;
  }
  const hits = ray.intersectObjects(scene.children, true).filter((h) => !h.object.isSprite && !h.object.isLine);
  const p = hits[0]?.point || (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP) && hitP);
  if (!p) return;
  const s = T.circuit.sampleNear(p.x, p.z);
  if (Math.hypot(p.x - s.p.x, p.z - s.p.z) > T.circuit.width * 0.9) { $('info').textContent = 'Toca encima de la pista'; return; }
  addZone(s.i);
});

// ---------- Componentes (piezas reutilizables) ----------
// Rampa con turbo: la del salón (rampa len 9, h 1.5) con su turbo en la bajada, 11 muestras desde el inicio de la rampa.
const COMPS = { rampaTurbo: { name: 'Rampa con turbo', icon: '🛹', ramp: { len: 9, h: 1.5 }, turboOff: 11, span: 15 } };
let cMode = null, cType = 'rampaTurbo', comps = [], cSel = null, pending = [];
const nS = () => T.circuit.samples.length;
const rampStart = (e) => ((e.i0 + 1) % nS() + nS()) % nS();
const cyc = (a, b) => { const N = nS(); return Math.min((a - b + N) % N, (b - a + N) % N); };
const curRamps = () => (EV.override || EV.seen || { ramps: [] }).ramps || [];
function ensureOverride() {
  if (!EV.override) { const v = EV.seen || { hills: [], ramps: [] }; EV.override = { hills: (v.hills || []).map((o) => ({ ...o })), ramps: (v.ramps || []).map((o) => ({ ...o })) }; }
  return EV.override;
}
function detectComps() {
  const cs = T.circuit.samples, N = cs.length;
  comps = [];
  for (const e of T.circuit.elev || []) {
    if (e.kind !== 'ramp') continue;
    for (const [type, C] of Object.entries(COMPS)) {
      if (e.def.len !== C.ramp.len || e.def.h !== C.ramp.h) continue;
      const c = rampStart(e), tc = (c + C.turboOff) % N;
      const boost = boosts.find((z) => cyc(z.c, tc) <= 2);
      if (!boost) continue;
      const s = cs[e.top ?? c];
      const lb = label(`${C.icon} ${C.name}`, '#7b1fa2', 1.2); lb.position.set(s.p.x, (s.h ?? 0) * S + 5, s.p.z);
      lb.visible = $('lb').classList.contains('on'); marks.add(lb);
      comps.push({ type, rp: e.def, c, boost, lb });
    }
  }
  cCount();
}
// recarga el circuito (alturas nuevas) conservando turbos y armas tal como están en el visor
async function reloadKeep(mutate) {
  const st = { keepB: boosts.map((z) => z.c), keepA: arms.map((a) => a.c) };
  mutate?.(st);
  const cam = camera.position.clone(), tg = controls.target.clone();
  await load(sel.value);
  camera.position.copy(cam); controls.target.copy(tg); controls.update();
  for (const z of boosts) z.mesh.parent?.remove(z.mesh);
  for (const a of arms) scene.remove(a.g);
  boosts = st.keepB.map((c) => newBoost(c));
  arms = st.keepA.map((c) => { const a = newArm(c); a.g.visible = $('ar').classList.contains('on'); return a; });
  for (const { rp, type } of pending) { const e = T.circuit.elev.find((x) => x.def === rp); if (e) boosts.push(newBoost((rampStart(e) + COMPS[type].turboOff) % nS())); }
  pending = [];
  for (const o of comps) marks.remove(o.lb);
  detectComps(); tCount();
  if ($('elp').style.display !== 'none') $('elt').value = elevText();
}
const dropBoost = (st, c) => { const k = st.keepB.indexOf(c); if (k >= 0) st.keepB.splice(k, 1); };
function cCount() { const l = $('cn'); if (l) l.textContent = comps.length ? `${comps.length} en el circuito: ` + comps.map((o) => COMPS[o.type].icon).join(' ') : 'Ninguno en el circuito'; }
function setCMode(m) {
  cMode = m === null || cMode === m ? null : m; cSel = null;
  $('cl').querySelectorAll('button').forEach((b) => b.classList.toggle('on', cMode === 'add' && b.dataset.ct === cType));
  $('cm').classList.toggle('on', cMode === 'move'); $('cd').classList.toggle('on', cMode === 'del');
  if (cMode) { if (tMode) setTMode(tMode); if (zMode) setZMode(zMode); if (editing) $('bt').click(); }
  $('info').textContent = cMode === 'add' ? `Toca la pista para poner: ${COMPS[cType].name}` : cMode === 'move' ? 'Arrastra el componente por la pista' : cMode === 'del' ? 'Toca el componente que quieres eliminar' : '';
}
for (const [k, C] of Object.entries(COMPS)) {
  const b = document.createElement('button'); b.textContent = `${C.icon} ${C.name}`; b.dataset.ct = k;
  b.onclick = () => { if (cMode === 'add' && cType === k) setCMode(null); else { cType = k; cMode = null; setCMode('add'); } };
  $('cl').appendChild(b);
}
$('cm').onclick = () => setCMode('move');
$('cd').onclick = () => setCMode('del');
$('co').onclick = (e) => {
  const on = $('cp').style.display === 'none';
  if (on) { if ($('tp').style.display !== 'none') $('tu').click(); if ($('zp').style.display !== 'none') $('zo').click(); }
  $('cp').style.display = on ? '' : 'none'; e.target.classList.toggle('on', on); if (!on) setCMode(null); else cCount();
};
function trackIdxAt(e) {
  setRay(e);
  const hits = ray.intersectObjects(scene.children, true).filter((h) => !h.object.isSprite && !h.object.isLine);
  const p = hits[0]?.point || (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP) && hitP);
  if (!p) return null;
  const s = T.circuit.sampleNear(p.x, p.z);
  return Math.hypot(p.x - s.p.x, p.z - s.p.z) > T.circuit.width * 0.9 ? -1 : s.i;
}
// centro exacto de la rampa (coords de diseño) para { at: [x, z] }
const atOf = (i) => { const p = loc(T.circuit.samples[(i + nS()) % nS()].p); return [+p.x.toFixed(1), +p.z.toFixed(1)]; };
const half15 = (type) => Math.floor(COMPS[type].span / 2);
function pickComp(i) {
  let best = null, bd = 14;
  for (const o of comps) { const d = cyc(i, (o.c + Math.round(COMPS[o.type].span / 2)) % nS()); if (d <= bd) { bd = d; best = o; } }
  return best;
}
let cDown = null;
cvs.addEventListener('pointerdown', (e) => { if (cMode) cDown = [e.clientX, e.clientY]; });
cvs.addEventListener('pointerup', async (e) => {
  if (!cMode || !cDown || cMode === 'move') { cDown = null; return; }
  const moved = Math.hypot(e.clientX - cDown[0], e.clientY - cDown[1]); cDown = null;
  if (moved > 8) return; // arrastre de cámara
  const i = trackIdxAt(e);
  if (i === null) return;
  if (i < 0) { $('info').textContent = 'Toca encima de la pista'; return; }
  const frac = +(i / nS()).toFixed(3);
  if (cMode === 'add') {
    const o = ensureOverride(), rp = { at: atOf(i), ...COMPS[cType].ramp };
    o.ramps.push(rp); pending.push({ rp, type: cType });
    $('info').textContent = 'Colocando…'; await reloadKeep();
    $('info').textContent = `✅ ${COMPS[cType].name} añadida (rampa en Alturas + turbo)`;
    return;
  }
  if (cMode === 'del') {
    const o = pickComp(i);
    if (!o) { $('info').textContent = 'Ahí no hay ningún componente'; return; }
    const ri = curRamps().indexOf(o.rp), ov = ensureOverride();
    if (ri >= 0) ov.ramps.splice(ri, 1);
    $('info').textContent = 'Eliminando…'; await reloadKeep((st) => dropBoost(st, o.boost.c));
    $('info').textContent = `🗑️ ${COMPS[o.type].name} eliminada`;
    return;
  }
});

// mover componente: arrastrar (como turbos y armas); al soltar se recoloca la rampa y su turbo
let cDrag = null, ghost = null;
const ghostMat = new THREE.MeshBasicMaterial({ color: '#b388ff', transparent: true, opacity: 0.5, depthWrite: false });
cvs.addEventListener('pointerdown', (e) => {
  if (cMode !== 'move') return;
  const i = trackIdxAt(e); if (i === null || i < 0) return;
  const o = pickComp(i); if (!o) { $('info').textContent = 'Ahí no hay ningún componente'; return; }
  const hits = ray.intersectObjects(scene.children, true).filter((h) => !h.object.isSprite && !h.object.isLine);
  plane.set(new THREE.Vector3(0, 1, 0), -(hits[0]?.point.y ?? 0));
  cDrag = { o, grab: i, shift: 0 };
  controls.enabled = false; cvs.setPointerCapture(e.pointerId);
  ghost = new THREE.Mesh(stripGeo((o.c + half15(o.type)) % nS(), COMPS[o.type].span * 1.6, 0.3).g, ghostMat); ghost.renderOrder = 6; ROOT.add(ghost);
  $('info').textContent = 'Arrastra y suelta donde quieras la rampa';
}, true);
cvs.addEventListener('pointermove', (e) => {
  if (!cDrag) return; setRay(e);
  if (!ray.ray.intersectPlane(plane, hitP)) return;
  const N = nS(), j = T.circuit.sampleNear(hitP.x, hitP.z).i;
  let d = ((j - cDrag.grab) % N + N) % N; if (d > N / 2) d -= N;
  if (d === cDrag.shift) return;
  cDrag.shift = d;
  const { o } = cDrag, start = (o.c + d + N) % N, mid = (start + half15(o.type)) % N;
  reshape(o.boost, (start + COMPS[o.type].turboOff) % N);
  ghost.geometry.dispose(); ghost.geometry = stripGeo(mid, COMPS[o.type].span * 1.6, 0.3).g;
  const s = T.circuit.samples[mid]; o.lb.position.set(s.p.x, (s.h ?? 0) * S + 5, s.p.z);
});
for (const ev of ['pointerup', 'pointercancel']) cvs.addEventListener(ev, async () => {
  if (!cDrag) return;
  const { o, shift } = cDrag; cDrag = null; controls.enabled = true;
  if (ghost) { ghost.parent?.remove(ghost); ghost.geometry.dispose(); ghost = null; }
  if (!shift) { $('info').textContent = 'Arrastra el componente por la pista'; return; }
  const N = nS(), mid = (o.c + shift + half15(o.type) + N) % N;
  const ri = curRamps().indexOf(o.rp), ov = ensureOverride(), old = ov.ramps[ri];
  if (!old) return;
  const { frac, at, idx, ...rest } = old, rp = { at: atOf(mid), ...rest };
  ov.ramps[ri] = rp; pending.push({ rp, type: o.type });
  $('info').textContent = 'Moviendo…'; await reloadKeep((st) => dropBoost(st, o.boost.c));
  $('info').textContent = `✅ ${COMPS[o.type].name} movida`;
});
