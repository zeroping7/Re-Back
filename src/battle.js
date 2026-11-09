import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { groundTex, rugTexture } from './textures.js';
import { buildCircuit, room, mat, CAMERA_RAY_GROUPS } from './tracks/common.js';
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
  const { scene, box, cyl } = B;
  const pq = groundTex('parquet', [24, 18]);
  const floorMat = new THREE.MeshStandardMaterial({ map: pq.map, normalMap: pq.normalMap, roughness: 0.35 });
  room(B, { ...ROOM, floor: floorMat, wall: new THREE.MeshStandardMaterial({ color: '#b3e5fc', roughness: 0.9 }), ceil: '#fffde7', baseboard: '#ffffff' });
  // alfombra
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(56, 38), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 0.95 }));
  rug.rotation.x = -Math.PI / 2; rug.position.y = 0.03; rug.receiveShadow = true; scene.add(rug);

  // recorrido de referencia (sin bordes): sirve para el minimapa, las cajas de energía y recolocar
  const circuit = buildCircuit(B, {
    points: [[-34, 22], [0, 26], [34, 22], [40, 0], [34, -22], [0, -26], [-34, -22], [-40, 0]],
    start: [-20, 24],
    width: 7,
    limits: [ROOM.x - 1, ROOM.z - 1],
    barrier: false,
    chevrons: false,
    noLine: true,
  });

  // ---------- Obstáculos colocados con pasillos libres (UX-15) ----------
  // Rampa "de mesa": subida, plataforma y bajada, en línea recta y con espacio libre delante y detrás
  // para coger carrerilla y aterrizar. ry = orientación; a = distancia a lo largo del eje.
  const slab = (cx, cz, ry, a0, a1, h0, h1, w, color) => {
    const da = a1 - a0, dh = h1 - h0, L = Math.hypot(da, dh), ang = Math.atan2(dh, da), t = 0.8;
    const ma = (a0 + a1) / 2 + Math.sin(ang) * t / 2, my = (h0 + h1) / 2 - Math.cos(ang) * t / 2;
    const x = cx + Math.cos(ry) * ma, z = cz - Math.sin(ry) * ma;
    box(L + 0.6, t, w, x, my, z, color, { rot: [0, ry, ang] });
  };
  const tableTop = (cx, cz, ry, { ramp, deck, h, w, rampCol = '#8d6e63', deckCol = '#ef6c00' }) => {
    slab(cx, cz, ry, -deck / 2 - ramp, -deck / 2, 0, h, w, rampCol);
    slab(cx, cz, ry, deck / 2, deck / 2 + ramp, h, 0, w, rampCol);
    box(deck, h, w, cx, h / 2, cz, deckCol, { rot: [0, ry, 0] });
    box(deck + 0.4, 0.3, w + 0.4, cx, h + 0.1, cz, '#ffb74d', { rot: [0, ry, 0], solid: false });
  };
  // caja de juguetes central: rampas este-oeste, pasillo libre |z| < 6 hasta las paredes
  tableTop(0, 0, 0, { ramp: 11, deck: 10, h: 3, w: 9 });
  // dos saltos pequeños en las rectas largas del recorrido (norte y sur), pasillo libre |x| < 22
  tableTop(0, 25, 0, { ramp: 6, deck: 4, h: 1.4, w: 7, deckCol: '#1e88e5' });
  tableTop(0, -25, 0, { ramp: 6, deck: 4, h: 1.4, w: 7, deckCol: '#43a047' });
  // bloques de construcción: solo en las cuatro "islas" entre pasillos (|z| entre 10 y 17)
  const cols = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa'];
  const blocks = [[-10, 13], [10, -13], [-30, 13], [30, -13], [30, 14], [-30, -14]];
  blocks.forEach(([x, z], k) => {
    box(4, 4, 4, x, 2, z, cols[k % cols.length], { rot: [0, k * 0.4, 0] });
    for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) cyl(0.5, 0.5, 0.5, x + dx, 4.25, z + dz, cols[k % cols.length], { seg: 8, solid: false });
  });
  // pelotas para empujar
  for (const [x, z, c] of [[-20, 12, '#ff5252'], [20, -12, '#40c4ff'], [10, 13, '#ffd740']]) B.dynBall(1.4, x, 1.6, z, c, { density: 0.02 });
  // estanterías con juguetes en las paredes (decorado)
  for (const x of [-30, 0, 30]) {
    box(14, 0.6, 3, x, 10, -ROOM.z + 1.5, '#8d6e63', { solid: false });
    for (let k = 0; k < 4; k++) box(2, 2 + k % 2, 2, x - 5 + k * 3.3, 11.3 + (k % 2) * 0.5, -ROOM.z + 1.5, cols[(k + x) & 3], { solid: false });
  }

  return {
    circuit,
    bounds: { x: ROOM.x - 1.5, z: ROOM.z - 1.5, h: ROOM.h - 1 },
    itemSpots: [0.2, 0.32, 0.68, 0.8],
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
  race.cars.forEach((car, k) => {
    const s = c.samples[Math.floor(((k + 0.5) / n) * N) % N];
    car.reset(s.p.clone().setY(s.p.y + 0.6), c.yawOf(s.t));
    race.state(car).idx = s.i;
  });
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
  if (!race.started || B.over) return;
  B.lastT = Math.max(0, B.lastT - dt);
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
      const S = R.circuit.samples;
      let best = null, bd = -1;
      for (let i = 0; i < S.length; i += 6) {
        const p = S[i].p;
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
