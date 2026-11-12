import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { groundTex, rugTexture } from './textures.js';
import { buildCircuit, room, mat, chevronTexture, CAMERA_RAY_GROUPS } from './tracks/common.js';
import { haloTexture } from './items.js';

// ---------- Batalla de la Estrella (UX-14) ----------
// Arena cerrada. La estrella aparece en el centro; quien la lleva gasta su reloj; se roba tocando al que la
// lleva (o con un arma que le aturda); gana quien vacía su reloj.
export const BATTLE_TIME = 60;

const ROOM = { x: 50, z: 36, h: 32 };
export const ARENA = {
  id: 'arena',
  name: 'Cuarto de juegos',
  short: 'Arena',
  desc: 'Arena cerrada con bloques, rampas y una caja de juguetes',
  color: '#ffca28',
  battle: true,
  build,
};

function build(B) {
  const { scene, box, cyl, RAPIER } = B;
  const S = B.S;
  const pq = groundTex('parquet', [24, 18]);
  const floorMat = new THREE.MeshStandardMaterial({ map: pq.map, normalMap: pq.normalMap, roughness: 0.35 });
  room(B, { ...ROOM, floor: floorMat, wall: new THREE.MeshStandardMaterial({ color: '#b3e5fc', roughness: 0.9 }), ceil: '#fffde7', baseboard: '#ffffff' });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 0.95 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(4, 0.03, 2); rug.receiveShadow = true; scene.add(rug);

  // contorno de referencia (sin bordes): solo para el minimapa
  const circuit = buildCircuit(B, {
    points: [[-44, 30], [0, 32], [44, 30], [46, 0], [44, -30], [0, -32], [-44, -30], [-46, 0]],
    start: [-20, 31], width: 7, limits: [ROOM.x - 1, ROOM.z - 1], barrier: false, chevrons: false, noLine: true,
  });

  // ---------- Rampas (UX-17): losas inclinadas, sin plataformas sueltas encima ----------
  // slab (BAT-01): rampa MACIZA desde (a0, h0) hasta (a1, h1) a lo largo del eje que marca ry, centrada en (cx, cz).
  // Cuña cerrada hasta el suelo: no queda hueco debajo donde los coches se metan y se atasquen.
  const slab = (cx, cz, ry, a0, a1, h0, h1, w, color) => {
    const sh = new THREE.Shape();
    sh.moveTo(a0, 0); sh.lineTo(a1, 0);
    if (h1 > 0) sh.lineTo(a1, h1);
    if (h0 > 0) sh.lineTo(a0, h0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
    geo.translate(0, 0, -w / 2);
    const m = new THREE.Mesh(geo, mat(color));
    m.position.set(cx, 0, cz); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true;
    scene.add(m); m.updateMatrixWorld(true);
    const pts = [];
    const v = new THREE.Vector3();
    for (const [a, h] of [[a0, 0], [a1, 0], [a1, h1], [a0, h0]]) for (const z of [-w / 2, w / 2]) {
      v.set(a, h, z).applyMatrix4(m.matrixWorld);
      pts.push(v.x * S * B.MX, v.y * S, v.z * S);
    }
    const desc = RAPIER.ColliderDesc.convexHull(new Float32Array(pts)).setFriction(0.6).setRestitution(0.1);
    B.world.createCollider(desc, B.fixed);
  };
  const ramp = '#8d6e63';

  // 1) caja de juguetes central: subida, caja y bajada (pasillo libre |z| < 6)
  slab(0, 0, 0, -16, -5, 0, 3, 9, ramp);
  slab(0, 0, 0, 5, 16, 3, 0, 9, ramp);
  box(10, 3, 9, 0, 1.5, 0, '#ef6c00');

  // 2) subida a lo alto: suelo → silla → mesa → bajada al suelo (todo encadenado)
  const wood = new THREE.MeshStandardMaterial({ map: groundTex('plank', [2, 2]).map, color: '#c79a6a', roughness: 0.7 });
  slab(0, 24, 0, -10, 4, 4.5, 0, 7, ramp);                    // suelo → asiento de la silla
  box(10, 0.8, 10, -15, 4.1, 24, '#d84315');                  // asiento
  for (const [x, z] of [[-10.6, 19.6], [-19.4, 19.6], [-10.6, 28.4], [-19.4, 28.4]]) box(0.8, 3.7, 0.8, x, 1.85, z, '#bf360c');
  box(10, 9, 0.8, -15, 9, 29.6, '#d84315');                   // respaldo (lado de la pared, fuera del camino)
  slab(0, 24, 0, -30, -20, 9, 4.5, 7, ramp);                  // silla → mesa
  box(18, 1, 26, -39, 8.5, 21, wood);                          // tablero de la mesa (arriba a 9)
  for (const [x, z] of [[-47, 9], [-31, 9], [-47, 33], [-31, 33]]) cyl(0.8, 0.8, 8, x, 4, z, '#6d4c41', { seg: 8 });
  slab(-39, 0, Math.PI / 2, -8, 12, 9, 0, 7, ramp);           // mesa → suelo (hacia el norte)
  // tazas y libro de adorno en la mesa (en el borde, sin estorbar)
  cyl(1.2, 1, 2.2, -46, 10.1, 30, '#ffffff', { seg: 12 });
  box(5, 1.2, 4, -45, 9.6, 14, '#1e88e5');

  // 3) looping (rizo completo) al noreste: se entra hacia el oeste por z=-27 y se sale por z=-19
  const loopInfo = loop(B, { cx: 24, z0: -27, z1: -19, R: 5, w: 6 });
  // placa de turbo antes de la entrada
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ map: chevronTexture(), emissive: '#ffffff', emissiveMap: chevronTexture(), emissiveIntensity: 0.8 }));
  pad.rotation.x = -Math.PI / 2; pad.rotation.z = Math.PI / 2; pad.position.set(36, 0.05, -27); scene.add(pad);

  // bloques de construcción solo fuera de los pasillos
  const cols = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa'];
  [[22, 12], [38, 13], [8, -12], [-14, -10]].forEach(([x, z], k) => {
    box(4, 4, 4, x, 2, z, cols[k % cols.length], { rot: [0, k * 0.4, 0] });
    for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) cyl(0.5, 0.5, 0.5, x + dx, 4.25, z + dz, cols[k % cols.length], { seg: 8, solid: false });
  });
  for (const [x, z, c] of [[30, 4, '#ff5252'], [-6, 14, '#40c4ff']]) B.dynBall(1.4, x, 1.6, z, c, { density: 0.02 });
  // estanterías de pared (decorado)
  for (const x of [-10, 20]) {
    box(14, 0.6, 3, x, 12, -ROOM.z + 1.5, '#8d6e63', { solid: false });
    for (let k = 0; k < 4; k++) box(2, 2 + k % 2, 2, x - 5 + k * 3.3, 13.3 + (k % 2) * 0.5, -ROOM.z + 1.5, cols[k % 4], { solid: false });
  }
  void RAPIER;

  const W = (a) => a.map(([x, z, y = 0]) => new THREE.Vector3(x * S, y * S, z * S));
  return {
    circuit,
    bounds: { x: ROOM.x - 1.5, z: ROOM.z - 1.5, h: ROOM.h - 1 },
    itemSpots: [],
    itemPoints: W([[30, -4], [-24, 8], [10, -28], [-39, 21, 9], [-15, 24, 4.5], [40, 26]]),
    spawns: W([[32, 2], [-26, -2], [12, 16], [-8, -28], [44, 26], [-24, 10], [0, -14], [40, -6]]),
    loops: [loopInfo],
    zones: [],
    dust: [0.85, 0.8, 0.7],
    lights: {
      background: '#1b1d2a',
      hemi: ['#fff8e1', '#8a6a4a', 0.65],
      sun: { color: '#fff0d6', intensity: 3.0, offset: [10, 34, -18] },
      env: 0.4,
      points: [{ color: '#ffd59a', intensity: 200, distance: 70, decay: 1.4, pos: [0, 22, 0] }],
    },
  };
}

// Looping estilo pista de juguete: cinta de plástico naranja con bordes, recorrida hacia -x.
// Entra por z0 y sale por z1 (desplazado para que la entrada y la salida no se crucen).
function loop(B, { cx, z0, z1, R, w }) {
  const S = B.S, n = 72, pos = [], phys = [], idx = [], tri = [];
  const rail = 1.2;
  for (let k = 0; k <= n; k++) {
    const th = (k / n) * Math.PI * 2, u = k / n, sm = u * u * (3 - 2 * u);
    const x = cx - R * Math.sin(th), y = R * (1 - Math.cos(th)) + 0.04, z = z0 + (z1 - z0) * sm;
    const nx = (cx - x) / R, ny = (R - y) / R; // hacia el centro del rizo
    for (const [dz, up] of [[-w / 2, rail], [-w / 2, 0], [w / 2, 0], [w / 2, rail]]) {
      const v = [x + nx * up, y + ny * up, z + dz];
      pos.push(...v); phys.push(v[0] * S, v[1] * S, v[2] * S);
    }
    if (k < n) for (let j = 0; j < 3; j++) {
      const a = k * 4 + j, b = a + 4;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
      tri.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#ff6d00', roughness: 0.35, side: THREE.DoubleSide }));
  m.castShadow = true; m.receiveShadow = true;
  B.scene.add(m);
  const desc = B.RAPIER.ColliderDesc.trimesh(new Float32Array(phys), new Uint32Array(tri)).setFriction(0.9);
  B.world.createCollider(desc, B.fixed);
  // soportes
  for (const sd of [-1, 1]) B.cyl(0.4, 0.4, 2 * R, cx + sd * (R + 0.6), R, (z0 + z1) / 2, '#424242', { seg: 6, solid: false });
  const zl = Math.min(z0, z1) - w / 2 - 1, zh = Math.max(z0, z1) + w / 2 + 1;
  return {
    cx: cx * S, R: R * S, z0: z0 * S, z1: z1 * S, w: w * S,
    min: new THREE.Vector3((cx - R - 2) * S, -1, zl * S), max: new THREE.Vector3((cx + R + 2) * S, (2 * R + 2) * S, zh * S),
    // carril de entrada: turbo para coger velocidad
    pad: { min: new THREE.Vector3((cx + R + 6) * S, -1, (z0 - w / 2) * S), max: new THREE.Vector3((cx + R + 14) * S, 3, (z0 + w / 2) * S) },
  };
}

// Estrella grande (también se usa en la batalla)
export function starMesh() {
  const shape = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2, r = k % 2 ? 0.42 : 1.0;
    if (k) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 1 });
  geo.center();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ff9f1a', emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.3, flatShading: true }));
  mesh.castShadow = true;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(5);
  return { mesh, halo };
}

// ---------- Lógica de la batalla (se engancha a Race) ----------
export function setupBattle(race) {
  const c = race.circuit, N = c.N, n = race.cars.length;
  // coches repartidos alrededor de la arena
  const sp = race.T.spawns;
  race.cars.forEach((car, k) => {
    const p = sp[k % sp.length];
    car.reset(p.clone().setY(0.6), Math.atan2(-p.x, -p.z)); // mirando al centro
    race.state(car).idx = c.sampleNear(p.x, p.z).i;
  });
  void N; void n;
  const { mesh, halo } = starMesh();
  mesh.scale.setScalar(1.3);
  const light = new THREE.PointLight('#ffd23f', 60, 18, 1.6);
  race.scene.add(mesh, halo, light);
  race.battleState = {
    timers: new Map(race.cars.map((car) => [car, BATTLE_TIME])),
    holder: null, holdT: 0, lastHolder: null, lastT: 0,
    pos: new THREE.Vector3(0, 2.4, 14 * race.S * (Math.random() < 0.5 ? 1 : -1)), // en la alfombra, entre la caja y un salto
    mesh, halo, light, over: false,
  };
}

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function battleStep(race, dt) {
  const B = race.battleState;
  if (B.over) return;
  if (!race.started) return;
  B.lastT = Math.max(0, B.lastT - dt);
  // looping (UX-17): con velocidad suficiente el coche entra "en el carril" y lo recorre entero,
  // como en las pistas de juguete; si entra lento, sube un poco y cae hacia atrás
  for (const L of race.T.loops || []) {
    for (const c of race.cars) {
      if (c.rail) { railStep(c, L, dt); continue; }
      const p = c.currPos, P = L.pad;
      if (p.x > P.min.x && p.x < P.max.x && p.z > P.min.z && p.z < P.max.z && p.y < 3 && c.velocity.x < -2) {
        if (c.fx.boost < 0.3 && c.isPlayer) race.sound('turbo', p);
        c.fx.boost = Math.max(c.fx.boost, 0.9);
      }
      if (p.y > 2 || c.speed < 12) continue;
      const dx = p.x - L.cx;
      // entrada normal (hacia -x por el carril z0) o al revés (hacia +x por el carril z1)
      if (dx > 0 && dx < 3 && Math.abs(p.z - L.z0) < L.w / 2 - 0.5 && c.velocity.x < -6) c.rail = { th: 0, dir: 1, v: c.speed };
      else if (dx < 0 && dx > -3 && Math.abs(p.z - L.z1) < L.w / 2 - 0.5 && c.velocity.x > 6) c.rail = { th: Math.PI * 2, dir: -1, v: c.speed };
      if (c.rail && c.isPlayer) race.shake(0.15);
    }
  }
  // quien lleva la estrella va algo más lento (si no, nadie le alcanzaría)
  for (const c of race.cars) c.rubber = c === B.holder ? 0.84 : 1;
  if (B.holder) {
    const h = B.holder;
    B.holdT += dt;
    const left = Math.max(0, B.timers.get(h) - dt);
    B.timers.set(h, left);
    if (h.isPlayer && Math.ceil(left) !== Math.ceil(left + dt) && left <= 5 && left > 0) race.sfx.play('count');
    if (left <= 0) return finishBattle(race, h);
    // aturdido por un arma: suelta la estrella
    if (h.fx.stun > 0.4 && B.holdT > 0.5) return dropStar(race);
    // robo al tocarle
    if (B.holdT > 1.0) {
      for (const o of race.cars) {
        if (o === h || o.currPos.distanceTo(h.currPos) > 2.7) continue;
        give(race, o);
        break;
      }
    }
  } else {
    for (const o of race.cars) {
      if (o === B.lastHolder && B.lastT > 0) continue;
      if (flat(o.currPos, B.pos) < 2.8 && Math.abs(o.currPos.y - B.pos.y) < 3.5) { give(race, o); break; }
    }
  }
}

function give(race, car) {
  const B = race.battleState, prev = B.holder;
  B.holder = car; B.holdT = 0;
  race.burst(car.currPos.clone().setY(car.currPos.y + 1.2), [1, 0.85, 0.3], 30);
  race.sound('pickup', car.currPos);
  if (car.isPlayer) race.hud.message(prev ? '⭐ ¡Le has robado la estrella!' : '⭐ ¡Tienes la estrella!', 1.4, 'go');
  else if (prev?.isPlayer) race.hud.message(`⭐ ${car.name} te ha robado la estrella`, 1.4, 'warn');
}

export function dropStar(race, at) {
  const B = race.battleState, h = B.holder;
  if (!h) return;
  const p = (at || h.currPos).clone();
  const a = Math.random() * Math.PI * 2;
  p.x += Math.cos(a) * 4; p.z += Math.sin(a) * 4;
  const b = race.bounds;
  p.x = THREE.MathUtils.clamp(p.x, -b.x + 3, b.x - 3); p.z = THREE.MathUtils.clamp(p.z, -b.z + 3, b.z - 3);
  p.y = Math.max(1.4, (at || h.currPos).y + 0.8);
  B.pos.copy(p);
  B.lastHolder = h; B.lastT = 0.8;
  B.holder = null; B.holdT = 0;
  race.burst(p, [1, 0.85, 0.3], 20);
  if (h.isPlayer) race.hud.message('⭐ ¡Has perdido la estrella!', 1.2, 'warn');
}

function finishBattle(race, winner) {
  const B = race.battleState;
  B.over = true;
  race.phase = 'done';
  const order = [...race.cars].sort((a, b) => B.timers.get(a) - B.timers.get(b));
  order.forEach((car, i) => { const st = race.state(car); st.place = i + 1; st.finished = true; st.finishTime = BATTLE_TIME - B.timers.get(car); });
  race.order = order;
  race.sfx.play(winner.isPlayer ? 'finish' : 'lap');
  race.hud.message(winner.isPlayer ? '⭐ ¡HAS GANADO LA BATALLA!' : `⭐ ¡Gana ${winner.name}!`, 3, 'big go');
  race.flash(winner.currPos);
  setTimeout(() => { if (race.replayRec) race.replayRec.on = false; race.onFinish?.(race.results()); }, 2500);
}

// orden en el marcador: el que menos reloj le queda va primero
export function battlePlaces(race) {
  const B = race.battleState;
  const list = [...race.cars].sort((a, b) => B.timers.get(a) - B.timers.get(b));
  list.forEach((c, i) => { race.state(c).place = i + 1; });
  race.order = list;
}

export function battleRender(race) {
  const B = race.battleState, t = race.clock;
  const p = B.holder ? B.holder.model.position.clone().setY(B.holder.model.position.y + 1.9) : B.pos.clone().setY(B.pos.y + Math.sin(t * 2.5) * 0.25);
  B.mesh.position.copy(p); B.mesh.rotation.y = t * 2.6;
  B.mesh.scale.setScalar(B.holder ? 0.75 : 1.3);
  B.halo.position.copy(p); B.halo.scale.setScalar(B.holder ? 3 : 5);
  B.light.position.copy(p);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
function railStep(c, L, dt) {
  const r = c.rail;
  r.v = Math.max(r.v, 24);
  r.th += (r.dir * r.v * dt) / L.R;
  const done = r.dir > 0 ? r.th >= Math.PI * 2 : r.th <= 0;
  const th = THREE.MathUtils.clamp(r.th, 0, Math.PI * 2), u = th / (Math.PI * 2), sm = u * u * (3 - 2 * u), dsm = 6 * u * (1 - u);
  const ride = 0.62; // altura del centro del coche sobre la cinta
  const nIn = new THREE.Vector3(Math.sin(th), Math.cos(th), 0); // hacia el centro del rizo
  const pos = new THREE.Vector3(L.cx - L.R * Math.sin(th), L.R * (1 - Math.cos(th)) + 0.08, L.z0 + (L.z1 - L.z0) * sm).addScaledVector(nIn, ride);
  const T = new THREE.Vector3(-Math.cos(th) * L.R, Math.sin(th) * L.R, (L.z1 - L.z0) * dsm / (Math.PI * 2)).normalize().multiplyScalar(r.dir);
  const side = new THREE.Vector3().crossVectors(nIn, T).normalize(); // eje X local del coche
  const up = new THREE.Vector3().crossVectors(T, side).normalize();
  _m.makeBasis(side, up, T); _q.setFromRotationMatrix(_m);
  c.body.setTranslation(pos, true); c.body.setRotation(_q, true);
  c.body.setLinvel({ x: T.x * r.v, y: T.y * r.v, z: T.z * r.v }, true); c.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  c.fx.stick = 0.2;
  if (done) c.rail = null;
}

// ---------- Piloto de batalla: persigue la estrella o a quien la lleva; si la tiene, huye ----------
export class BattleDriver {
  constructor(car, race, { skill = 1, seed = 1 } = {}) {
    this.car = car; this.race = race; this.skill = skill;
    this.r = mulberry(seed * 7919);
    this.stuck = 0; this.reverse = 0; this.fleeT = 0; this.flee = null; this.itemDelay = 1;
    this.ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
    this.input = { steer: 0, throttle: 0, brake: 0 };
  }

  target() {
    const R = this.race, B = R.battleState, car = this.car;
    if (!B.holder) return B.pos;
    if (B.holder !== car) { const h = B.holder, d = flat(h.currPos, car.currPos); return h.currPos.clone().addScaledVector(h.velocity, Math.min(1.2, d / 25)); }
    // huir: el punto del recorrido más lejos de los rivales (se recalcula a ratos)
    this.fleeT -= 1 / 60;
    if (!this.flee || this.fleeT <= 0) {
      this.fleeT = 1.2 + this.r();
      const S = R.T.spawns.concat(R.T.itemPoints || []);
      let best = null, bd = -1;
      for (let i = 0; i < S.length; i++) {
        const p = S[i];
        let near = Infinity;
        for (const o of R.cars) if (o !== car) near = Math.min(near, flat(o.currPos, p));
        const score = near - flat(car.currPos, p) * 0.25;
        if (score > bd) { bd = score; best = p; }
      }
      this.flee = best;
    }
    return this.flee;
  }

  // distancia libre delante (rayo contra decorado)
  free(dir, len) {
    const p = this.car.currPos;
    this.ray.origin = { x: p.x, y: p.y + 0.4, z: p.z }; this.ray.dir = { x: dir.x, y: 0, z: dir.z };
    const hit = this.race.world.castRay(this.ray, len, true, undefined, CAMERA_RAY_GROUPS, this.car.collider, this.car.body);
    return hit ? hit.timeOfImpact : len;
  }

  update(dt) {
    const car = this.car, R = this.race, p = car.currPos, f = car.forward;
    const tgt = this.target();
    const dx = tgt.x - p.x, dz = tgt.z - p.z, dist = Math.hypot(dx, dz) || 1;
    // ángulo con signo (+ = a la izquierda, como el volante)
    const cross = f.x * dz - f.z * dx, dot = f.x * dx + f.z * dz;
    let ang = Math.atan2(-cross, dot);
    // esquivar obstáculos
    const fw = new THREE.Vector3(f.x, 0, f.z).normalize();
    const look = 5 + car.speed * 0.35;
    if (this.free(fw, look) < look * 0.9) {
      const l = this.free(fw.clone().applyAxisAngle(_Y, 0.6), look), rr = this.free(fw.clone().applyAxisAngle(_Y, -0.6), look);
      ang += (l > rr ? 1 : -1) * 0.9;
    }
    let steer = THREE.MathUtils.clamp(ang * 1.6, -1, 1);
    let throttle = 1, brake = 0;
    if (Math.abs(ang) > 1.6 && car.speed > 9) { throttle = 0.4; }
    // atascado: marcha atrás girando al revés
    if (car.speed < 1.5 && this.reverse <= 0) this.stuck += dt; else this.stuck = Math.max(0, this.stuck - dt * 2);
    if (this.stuck > 1.1) { this.reverse = 0.9 + this.r() * 0.5; this.stuck = 0; }
    if (this.reverse > 0) { this.reverse -= dt; throttle = 0; brake = 1; steer = -steer; }
    // objetos: disparar si hay alguien delante cerca
    this.itemDelay -= dt;
    if (car.item && this.itemDelay <= 0 && R.started) {
      const B = R.battleState;
      let shoot = false;
      for (const o of R.cars) {
        if (o === car) continue;
        const ox = o.currPos.x - p.x, oz = o.currPos.z - p.z, d = Math.hypot(ox, oz);
        if (d < 22 && (ox * f.x + oz * f.z) / d > 0.85 && (o === B.holder || !B.holder || this.r() < 0.3)) shoot = true;
      }
      if (['turbo', 'repair'].includes(car.item)) shoot = car.item === 'repair' ? car.health < 60 : B.holder === car || dist > 25;
      if (shoot) { R.items.fire(car); this.itemDelay = 1.5 + this.r() * 2; }
    }
    const k = 1 - Math.exp(-dt * 10);
    this.input.steer += (steer - this.input.steer) * k;
    this.input.throttle = throttle * (0.9 + 0.1 * this.skill); this.input.brake = brake;
    return this.input;
  }
}

const _Y = new THREE.Vector3(0, 1, 0);
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
