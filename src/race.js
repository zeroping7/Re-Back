import * as THREE from 'three';
import { rumble } from './gamepad.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { createBuilder, clearMatCache, mergeStatic, scaleTrack, CAMERA_RAY_GROUPS, WHEEL_RAY_GROUPS } from './tracks/common.js';
import { Car } from './car.js';
import { CARS, carById, carTuning, rivalPool } from './cars.js';
import { AIDriver } from './ai.js';
import { Items, haloTexture } from './items.js';
import { Particles, SkidMarks, Ripples } from './effects.js';
import { setupBattle, battleStep, battlePlaces, battleRender, dropStar, BattleDriver } from './battle.js';
import { discTuning, carAllowed, fmtPts } from './disciplines.js';
import { loadGhost, saveGhost, ghostModel, poseAt, poseLerp, ReplayRecorder, Director, GHOST_HZ } from './replay.js';

export const FIXED = 1 / 60;
const RIVAL_COLORS = ['#ff7a00', '#00b8a9', '#ff4f9a', '#7cb342', '#5c6bc0', '#fdd835', '#8d6e63'];
const RIVAL_NAMES = ['Turbo', 'Pila', 'Zumbi', 'Trasto', 'Muelle', 'Chapa', 'Tuerca'];

// Una carrera completa: escena, física, coches, IA, objetos, vueltas y cámara.
export class Race {
  constructor({ renderer, envMap, sfx, controls, hud, trackDef, carDef, carUpgrades = {}, laps = 3, rivals = 3, difficulty = 1, baseTuning, onFinish, practice = false, star = null, onStar = null, camMode = 'normal', battle = false }) {
    this.carUpgrades = carUpgrades;
    this.renderer = renderer; this.sfx = sfx; this.controls = controls; this.hud = hud;
    this.trackDef = trackDef; this.laps = laps; this.baseTuning = baseTuning; this.onFinish = onFinish;
    this.practice = practice;
    this.battle = battle;
    if (battle) this.laps = laps = 999;
    this.disc = battle ? 'race' : (trackDef.disc || 'race'); // DIS-02
    this.simT = 0;
    this.camMode = camMode;
    this.time = 0; this.phase = 'countdown'; this.countdown = 3.2; this.started = false; this.paused = false;
    this.acc = 0; this.trauma = 0; this.clock = 0;

    // ---------- Escena ----------
    const scene = (this.scene = new THREE.Scene());
    scene.environment = envMap;
    this.world = new RAPIER.World({ x: 0, y: -baseTuning.gravity, z: 0 });
    this.world.timestep = FIXED;
    const S = (this.S = trackDef.scale ?? 2);
    const root = new THREE.Group();
    const mirror = (this.mirror = !!trackDef.mirror);
    root.scale.set(mirror ? -S : S, S, S);
    scene.add(root);
    const B = createBuilder(root, this.world, RAPIER, S, { mirror, reverse: !!trackDef.reverse });
    const T = (this.T = trackDef.build(B));
    this.dynamics = B.dynamics;
    scaleTrack(T, S, mirror);
    this.trackKey = trackDef.key || trackDef.id;
    this.circuit = T.circuit;
    this.bounds = T.bounds;
    this.setupLights(T.lights);
    mergeStatic(scene);

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.25, 1400);

    // ---------- Efectos ----------
    this.effects = {
      smoke: new Particles(scene, 700),
      sparks: new Particles(scene, 400, { additive: true, soft: 0.6 }),
      fire: new Particles(scene, 300, { additive: true, soft: 1 }),
      skids: new SkidMarks(scene, this.disc === 'drift' ? 7000 : 2400), // en drift hay muchas más marcas
      chunks: new Particles(scene, 600, { soft: 0.12 }), // barro y gotas (bordes duros)
      ripples: new Ripples(scene),
    };
    this.flashLight = new THREE.PointLight('#ffb050', 0, 30, 1.5);
    scene.add(this.flashLight);

    // ---------- Coches ----------
    this.cars = [];
    this.states = new Map();
    this.ai = new Map();
    const total = practice ? 1 : rivals + 1;
    // rivales de la clase que toca según la dificultad (como las copas por categorías)
    const disc = this.disc;
    const pool = (disc === 'race' ? rivalPool(difficulty) : CARS.filter((c) => carAllowed(c, disc) && !c.secret)).filter((c) => c.id !== carDef.id); // DCO-05
    const rivalDefs = pool.length ? pool : CARS.filter((c) => c.id !== carDef.id);
    for (let i = 0; i < total; i++) {
      const isPlayer = i === total - 1; // el jugador sale el último
      const def = isPlayer ? carDef : rivalDefs[i % rivalDefs.length];
      const skill = isPlayer ? 1 : difficulty * (0.95 + 0.05 * (i / Math.max(1, total - 1)));
      const tuning = discTuning(isPlayer ? carTuning(baseTuning, def, 1, carUpgrades) : carTuning(baseTuningDefaults(baseTuning), def, skill), disc);
      const color = isPlayer ? def.color : RIVAL_COLORS[i % RIVAL_COLORS.length];
      const car = new Car(scene, this.world, RAPIER, def, tuning, { color, index: i, name: isPlayer ? 'Tú' : RIVAL_NAMES[i % RIVAL_NAMES.length] });
      const slot = this.circuit.gridSlot(i);
      car.reset(slot.pos, slot.yaw);
      car.isPlayer = isPlayer;
      car.driftMode = disc === 'drift';
      car.crawl = disc === 'obst';
      if (car.crawl) car.collider.setCollisionGroups((0x0004 << 16) | 0xfffb); // CRW-04: sin choques entre coches
      car.gyro = isPlayer ? undefined : 1; // la IA lleva el giroscopio a tope
      if (disc !== 'race') car.damageK = disc === 'obst' ? 0.3 : 0.5;
      this.cars.push(car);
      this.states.set(car, { idx: slot.idx, progress: slot.idx - this.circuit.N, laps: 0, finished: false, finishTime: 0, lapStart: 0, lastLap: 0, bestLap: 0, wrongT: 0, place: 0, score: 0, combo: 0, mult: 1, driftT: 0, grace: 0 });
      if (isPlayer) this.player = car;
      else this.ai.set(car, new AIDriver(car, this.circuit, { skill, seed: i + 1, drift: disc === 'drift' }));
    }
    this.playerAI = new AIDriver(this.player, this.circuit, { skill: 1, seed: 99, drift: disc === 'drift' }); // para después de la meta
    if (battle) {
      for (const car of this.cars) if (!car.isPlayer) this.ai.set(car, new BattleDriver(car, this, { skill: difficulty, seed: car.index + 1 }));
      this.playerAI = new BattleDriver(this.player, this, { skill: 1, seed: 99 });
      setupBattle(this);
    }
    this.sfx.setEngine?.(carDef.motor === 'Nitro' ? 'nitro' : 'electric', carDef);

    // ---------- Objetos ----------
    this.items = new Items(this);
    if (!practice && disc === 'race') this.items.createPickups(T.itemSpots);
    if (T.itemPoints) this.items.createPickupsAt(T.itemPoints);

    // ---------- Estrella oculta (solo Contrarreloj) ----------
    this.onStar = onStar;
    this.star = practice && star ? this.createStar(star.taken) : null;

    // ---------- Cámara inicial ----------
    this.camDir = new THREE.Vector3().copy(this.player.forward).setY(0).normalize();
    this.camY = this.player.currPos.y + 7;
    this.camDist = 16;
    this.camRay = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
    this.best = loadBest(this.trackKey);

    // ---------- Fantasma (Contrarreloj) y grabación para la repetición ----------
    this.stepN = 0;
    this.ghostOn = practice || (disc === 'obst' && total === 1); // OBS-03: fantasma también en la contrarreloj de obstáculos
    if (this.ghostOn) {
      this.ghostRec = [];
      this.setGhost(loadGhost(this.trackKey));
    } else this.replayRec = new ReplayRecorder(this);
    this.updatePlaces();
    this.hud.setupMinimap(this.circuit);
  }

  setGhost(g) {
    if (this.ghostMesh) { this.scene.remove(this.ghostMesh); this.ghostMesh = null; }
    this.ghost = g;
    if (!g) return;
    this.ghostMesh = ghostModel(carById(g.car), g.color);
    this.ghostMesh.visible = false;
    this.scene.add(this.ghostMesh);
  }

  // vuelta del jugador en Contrarreloj: si es la mejor, pasa a ser el fantasma
  playerLap(lapTime) {
    const rec = this.ghostRec;
    this.ghostRec = [];
    if (!rec || rec.length < 7 * GHOST_HZ * 3) return;
    if (this.ghost && this.ghost.time <= lapTime) return;
    const frames = Float32Array.from(rec);
    const g = { time: lapTime, car: this.player.def.id, color: this.player.def.color, frames, n: frames.length / 7 };
    saveGhost(this.trackKey, g);
    this.setGhost(g);
    setTimeout(() => this.hud.message('👻 Nuevo fantasma: tu mejor vuelta', 1.6), 1700);
  }

  setupLights(L) {
    const s = this.scene;
    s.background = new THREE.Color(L.background || '#1b1d2a');
    s.environmentIntensity = L.env ?? 0.35;
    if (L.fog) s.fog = new THREE.Fog(L.fog[0], L.fog[1], L.fog[2]);
    s.add(new THREE.HemisphereLight(...L.hemi));
    const sun = (this.sun = new THREE.DirectionalLight(L.sun.color, L.sun.intensity));
    this.sunOffset = new THREE.Vector3(...L.sun.offset);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28; sc.near = 1; sc.far = 140;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    s.add(sun, sun.target);
    for (const p of L.points || []) {
      const l = new THREE.PointLight(p.color, p.intensity, p.distance, p.decay);
      l.position.set(...p.pos);
      s.add(l);
    }
  }

  state(car) { return this.states.get(car); }

  // ---------- Bucle ----------
  update(dt) {
    if (this.paused) return;
    if (this.replay) return this.updateReplay(dt);
    this.clock += dt;
    if (this.phase === 'countdown') {
      const prev = Math.ceil(this.countdown);
      this.countdown -= dt;
      const now = Math.ceil(this.countdown);
      if (now !== prev && now > 0) { this.hud.message(String(now), 0.9, 'big'); this.sfx.play('count'); }
      if (this.countdown <= 0) {
        this.phase = 'race'; this.started = true;
        this.hud.message('¡YA!', 0.9, 'big go');
        this.sfx.play('go');
      }
    }

    const playerInput = this.controls.read(dt);
    if (this.started && this.controls.consumeFire() && this.player.item && this.phase === 'race') this.items.fire(this.player);

    this.acc += dt;
    let steps = 0;
    while (this.acc >= FIXED && steps < 5) {
      this.fixedStep(FIXED, playerInput);
      this.acc -= FIXED; steps++;
    }
    if (steps === 5) this.acc = 0;
    if (this.started) this.time += dt;

    this.T.update?.(this.clock, this);
    this.items.update(dt);
    if (this.star) this.updateStar(dt);
    this.effects.smoke.update(dt); this.effects.sparks.update(dt); this.effects.fire.update(dt); this.effects.chunks.update(dt); this.effects.ripples.update(dt);
    this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 1500);
  }

  fixedStep(dt, playerInput) {
    const hold = { steer: 0, throttle: 0, brake: 0, hold: true };
    for (const car of this.cars) {
      const st = this.state(car);
      let input;
      if (!this.started) input = car.isPlayer ? { ...playerInput, throttle: 0, brake: 0, hold: true } : hold;
      else if (car.isPlayer) input = st.finished || this.autoPlayer ? this.playerAI.update(dt, this, st) : playerInput;
      else input = this.ai.get(car).update(dt, this, st);
      if (!car.isPlayer && this.started && !this.practice && !this.battle && this.disc !== 'drift') {
        const ps = this.state(this.player);
        const diff = (st.progress - ps.progress) / this.circuit.N;
        car.rubber = THREE.MathUtils.clamp(1 - diff * 0.45, 0.9, 1.1);
      }
      car.step(dt, input);
    }
    if (this.started) this.simT += dt;
    this.T.step?.(this.simT, dt); // obstáculos móviles (OBS-05)
    this.world.step();
    for (const car of this.cars) {
      car.afterStep(dt);
      this.trackProgress(car, dt);
      this.zoneEffects(car);
      if (this.disc === 'drift') this.driftStep(car, this.state(car), dt);
      this.carEffects(car);
    }
    if (this.battle) battleStep(this, dt);
    this.updatePlaces();
    // 30 Hz: fantasma y repetición
    if (this.started && (this.stepN++ & 1) === 0) {
      if (this.ghostRec) { const p = this.player.currPos, q = this.player.currQuat; this.ghostRec.push(p.x, p.y, p.z, q.x, q.y, q.z, q.w); }
      this.replayRec?.capture();
    }
  }

  trackProgress(car, dt) {
    const st = this.state(car), c = this.circuit;
    const p = car.currPos;
    if (this.battle) { // arena: sin vueltas ni sentido; solo recolocar si vuelca o se sale del cuarto
      st.idx = c.sampleNear(p.x, p.z).i;
      const b = this.bounds;
      if ((car.upsideTime > 1.4 && !car.fx.stick) || p.y < -4 || Math.abs(p.x) > b.x + 6 || Math.abs(p.z) > b.z + 6) this.respawn(car);
      return;
    }
    const ni = c.nearestFrom(st.idx, p.x, p.z, 8, 20);
    let d = ni - st.idx;
    if (d < -c.N / 2) d += c.N;
    if (d > c.N / 2) d -= c.N;
    st.progress += d; st.idx = ni;

    // CRW-11: puertas numeradas de los obstáculos (solo el jugador)
    const gates = this.T.gates;
    if (gates && car.isPlayer && this.started && !st.finished) {
      while ((st.gateN ?? 0) < gates.length && st.progress >= gates[st.gateN ?? 0].i) {
        const g = gates[st.gateN ?? 0]; st.gateN = (st.gateN ?? 0) + 1;
        this.hud.message(`🚩 Obstáculo ${st.gateN}/${gates.length} · ${g.name}`, 1.8);
        this.sfx.play('pickup');
      }
    }

    // vueltas
    if (this.started && !st.finished) {
      const laps = Math.floor(st.progress / c.N);
      if (laps > st.laps) {
        st.laps = laps;
        const lapTime = this.time - st.lapStart;
        st.lastLap = lapTime; st.lapStart = this.time;
        if (!st.bestLap || lapTime < st.bestLap) st.bestLap = lapTime;
        if (car.isPlayer && this.ghostOn) this.playerLap(lapTime);
        st.donuts = 0;
        if (car.isPlayer) {
          if (!this.best.lap || lapTime < this.best.lap) { this.best.lap = lapTime; saveBest(this.trackKey, this.best); this.hud.message(`¡Récord de vuelta! ${fmtTime(lapTime)}`, 2); }
        }
        if (!this.practice && st.laps >= this.laps) {
          st.finished = true; st.finishTime = this.time;
          if (car.isPlayer) this.playerFinished();
        } else if (car.isPlayer) {
          if (st.laps === this.laps - 1 && !this.practice) { this.hud.message('¡ÚLTIMA VUELTA!', 1.8, 'big'); this.sfx.play('lap'); }
          else { this.hud.message(`Vuelta ${st.laps + 1}${this.practice ? '' : '/' + this.laps}  ·  ${fmtTime(lapTime)}`, 1.6); this.sfx.play('lap'); }
        }
      }
    }

    // sentido contrario
    if (car.isPlayer && this.started && !st.finished) {
      const s = c.samples[st.idx];
      if (car.forward.x * s.t.x + car.forward.z * s.t.z < -0.4 && car.speed > 4) st.wrongT += dt; else st.wrongT = 0;
      if (st.wrongT > 1.2) { this.hud.message('¡SENTIDO CONTRARIO!', 0.3, 'warn'); if (st.wrongT < 1.22) this.sfx.play('wrong'); }
    }

    // IA atascada sin avanzar
    if (this.started && (!st.finished || car.isPlayer)) {
      if (st.progress > (st.bestProg ?? -1e9)) { st.bestProg = st.progress; st.noProgT = 0; } else st.noProgT = (st.noProgT || 0) + dt;
      const limit = car.isPlayer && !st.finished && !this.autoPlayer ? 10 : 5;
      if (st.noProgT > limit) { st.noProgT = 0; st.bestProg = st.progress; this.respawn(car); }
    }
    // fuera de la pista (por ejemplo tras una explosión)
    const sc = c.samples[st.idx];
    const lat = Math.abs((p.x - sc.p.x) * sc.n.x + (p.z - sc.p.z) * sc.n.z);
    // (también si está en el suelo por debajo de un puente o una cuesta: se ha caído)
    // CRW-11: foso bajo los puentes y pasarelas: si el coche está por debajo de la plataforma, se ha caído
    const pit = (this.T.pits || []).find((q) => st.idx >= q.i0 && st.idx <= q.i1);
    if ((lat > c.width / 2 + 2 || p.y < sc.p.y - 1.4 || (pit && p.y < pit.y)) && car.contacts > 0) st.offT = (st.offT || 0) + dt; else st.offT = 0;
    // recolocar si vuelca o se sale
    const b = this.bounds;
    if (car.upsideTime > 1.4 || p.y < -4 || Math.abs(p.x) > b.x + 6 || Math.abs(p.z) > b.z + 6 || st.offT > (this.disc === 'obst' ? 0.9 : car.isPlayer ? 2.5 : 1.5)) {
      st.offT = 0;
      this.respawn(car);
    }
  }

  zoneEffects(car) {
    const idx = this.state(car).idx, c = this.circuit;
    let surf = null;
    if (car.contacts === 0) return; // en el aire se conserva la superficie (no repite salpicaduras en baches)
    for (const z of this.T.zones || []) {
      if (z.from !== undefined) {
        const inside = z.from <= z.to ? idx >= z.from && idx <= z.to : idx >= z.from || idx <= z.to;
        if (!inside) continue;
        const s = c.samples[idx];
        const lat = Math.abs((car.currPos.x - s.p.x) * s.n.x + (car.currPos.z - s.p.z) * s.n.z);
        if (lat > c.width / 2) continue;
        if (z.effect === 'boost') {
          if (car.fx.boost < 0.3 && car === this.player) this.sound('turbo', car.currPos);
          car.fx.boost = Math.max(car.fx.boost, 0.8);
        } else if (z.effect === 'slide') {
          car.fx.slide = 0.2;
          if (z.surface) surf = z.surface;
        } else if (z.effect === 'sand') {
          car.fx.sand = 0.2;
          if (z.surface) surf = z.surface;
        }
        continue;
      }
      if (Math.hypot(car.currPos.x - z.pos.x, car.currPos.z - z.pos.z) > z.r) continue;
      if (z.effect === 'push') { // ventilador / cascada (OBS-01): empuja de lado
        const k = (z.on ? z.on(this.simT) : 1) * z.force * car.mass * FIXED;
        if (k) car.body.applyImpulse({ x: z.dir.x * k, y: 0, z: z.dir.z * k }, true);
        if (z.surface) { surf = z.surface; car.waterY = z.pos.y + 0.05; car.fx.wet = Math.max(car.fx.wet, 0.3); }
        continue;
      }
      if (z.effect === 'wet') {
        surf = z.surface || 'water';
        car.waterY = z.pos.y + 0.07 * this.S;
        car.fx.wet = Math.max(car.fx.wet, 0.8);
      }
    }
    if (surf !== car.surface) this.enterSurface(car, surf, car.surface);
    car.surface = surf;
  }

  // ---------- Superficies: barro, agua, suelo mojado, cera ----------
  enterSurface(car, surf, prev) {
    if (surf === 'water' && car.speed > 4) {
      // corona de salpicadura al entrar en el charco
      const E = this.effects, p = car.currPos, y = car.waterY ?? p.y, sp = Math.min(1.6, car.speed / 14);
      this.sound('splash', p);
      if (car.isPlayer) this.trauma = Math.min(1, this.trauma + 0.18 * sp);
      for (let k = 0; k < 46; k++) {
        const a = Math.random() * 6.283, v = (3 + Math.random() * 5) * sp;
        E.chunks.emit(p.x + Math.cos(a) * 0.6, y + 0.1, p.z + Math.sin(a) * 0.6, Math.cos(a) * v + car.velocity.x * 0.3, (5 + Math.random() * 7) * sp, Math.sin(a) * v + car.velocity.z * 0.3,
          { life: 0.7 + Math.random() * 0.5, size: 0.1 + Math.random() * 0.14, size1: 0.06, alpha: 0.85, color: WATER_DROP[k % 3], grav: 26, drag: 0.6 });
      }
      for (let k = 0; k < 10; k++) {
        E.smoke.emit(p.x + rnd(1), y + 0.3, p.z + rnd(1), rnd(3) * sp, 2 + Math.random() * 3, rnd(3) * sp,
          { life: 0.8, size: 0.6, size1: 2.6, alpha: 0.32, color: [0.85, 0.93, 1], drag: 2.5, grav: 2 });
      }
      E.ripples.emit(p.x, y, p.z, { r0: 0.6, r1: 5.5, life: 1.4, alpha: 0.6 });
      E.ripples.emit(p.x, y, p.z, { r0: 0.3, r1: 3.5, life: 1.1, alpha: 0.5 });
    }
    if ((surf === 'mud' || surf === 'sand') && car.speed > 6) {
      this.sound('splash', car.currPos);
      if (car.isPlayer) this.trauma = Math.min(1, this.trauma + 0.08);
    }
  }

  surfaceEffects(car, near) {
    const s = car.surface, E = this.effects, dt = FIXED;
    // rastro de las ruedas al salir (barro o agua) — se usa en carEffects
    const TR = TRAILS[s];
    if (TR) car.trail = { ...TR, t: TR.time, max: TR.time };
    else if (car.trail && (car.trail.t -= dt) <= 0) car.trail = null;
    if (s === 'mud') car.dirt = Math.min(1, car.dirt + dt * (0.15 + car.speed / 60));
    else if (s === 'water') car.dirt = Math.max(0, car.dirt - dt * 0.9);
    else if (s === 'wet') car.dirt = Math.max(0, car.dirt - dt * 0.12);
    else if (car.dirt > 0.25) car.dirt = Math.max(0.25, car.dirt - dt * 0.004); // el barro seco se queda un poco
    if (!s || !near) return;
    const many = car.isPlayer ? 1 : 0.45, v = car.velocity, f = car.forward, sp = car.speed;
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(car.currQuat);
    for (let i = 0; i < 4; i++) {
      const w = car.wheelState[i], rear = i >= 2, sgn = i % 2 ? -1 : 1;
      if (!w.contact) continue;
      const P = w.point;
      if (s === 'mud' || s === 'sand') {
        // grumos lanzados por las ruedas (más si patinan) y algo de vaho marrón (o polvo de arena)
        const COL = s === 'sand' ? SAND : MUD;
        const rate = (rear ? 0.55 : 0.2) * Math.min(1, sp / 14 + Math.max(0, w.slip - 2) / 6) * many;
        if (Math.random() < rate) {
          const k = Math.random();
          E.chunks.emit(P.x, P.y + 0.15, P.z, -f.x * sp * 0.35 + side.x * sgn * rnd(3) + rnd(1.5), 2.5 + Math.random() * 4.5, -f.z * sp * 0.35 + side.z * sgn * rnd(3) + rnd(1.5),
            { life: 0.6 + Math.random() * 0.5, size: (0.12 + k * 0.2) * (s === 'sand' ? 0.6 : 1), size1: 0.1 + k * 0.15, alpha: 1, color: COL[Math.floor(Math.random() * 3)], grav: 28, drag: 0.4 });
        }
        if (rear && sp > 8 && Math.random() < 0.15 * many) {
          E.smoke.emit(P.x, P.y + 0.2, P.z, -f.x * 2 + rnd(1), 0.6, -f.z * 2 + rnd(1), { life: 0.7, size: 0.5, size1: s === 'sand' ? 2.6 : 1.8, alpha: s === 'sand' ? 0.3 : 0.22, color: s === 'sand' ? [0.85, 0.75, 0.55] : [0.38, 0.28, 0.18], drag: 2 });
        }
      } else if (s === 'water') {
        // abanico de agua a los lados de cada rueda, gotas y ondas
        const a = Math.min(1, sp / 12);
        if (sp > 2 && Math.random() < 0.9 * a * many) {
          for (let k = 0; k < 2; k++) {
            E.chunks.emit(P.x, (car.waterY ?? P.y) + 0.05, P.z, side.x * sgn * (2 + Math.random() * 4) * a + v.x * 0.35 + rnd(1), (3 + Math.random() * 4) * a, side.z * sgn * (2 + Math.random() * 4) * a + v.z * 0.35 + rnd(1),
              { life: 0.5 + Math.random() * 0.4, size: 0.07 + Math.random() * 0.1, size1: 0.04, alpha: 0.8, color: WATER_DROP[k], grav: 24, drag: 0.8 });
          }
        }
        if (rear && sp > 4 && Math.random() < 0.35 * many) {
          E.smoke.emit(P.x, (car.waterY ?? P.y) + 0.2, P.z, -f.x * 2 + side.x * sgn * 2, 1.2, -f.z * 2 + side.z * sgn * 2, { life: 0.6, size: 0.4, size1: 1.8, alpha: 0.25, color: [0.85, 0.94, 1], drag: 2.5 });
        }
        if (Math.random() < (sp > 1 ? 0.12 : 0.02)) E.ripples.emit(P.x, car.waterY ?? P.y, P.z, { r0: 0.25, r1: 1.6 + sp * 0.08, life: 0.9, alpha: 0.45 });
      } else if (s === 'wet') {
        // estela de agua pulverizada detrás de las ruedas traseras
        if (rear && sp > 6 && Math.random() < 0.6 * many) {
          E.smoke.emit(P.x, P.y + 0.15, P.z, -f.x * sp * 0.15 + side.x * sgn * 0.8, 0.8 + Math.random(), -f.z * sp * 0.15 + side.z * sgn * 0.8,
            { life: 0.55, size: 0.3, size1: 1.4 + sp * 0.03, alpha: 0.28, color: [0.82, 0.92, 1], drag: 3 });
          if (Math.random() < 0.5) E.chunks.emit(P.x, P.y + 0.12, P.z, -f.x * sp * 0.25 + rnd(1.5), 1.5 + Math.random() * 2.5, -f.z * sp * 0.25 + rnd(1.5),
            { life: 0.4, size: 0.06 + Math.random() * 0.06, size1: 0.03, alpha: 0.75, color: WATER_DROP[2], grav: 22, drag: 0.8 });
        }
      } else if (s === 'wax') {
        // brillo del suelo encerado al patinar
        if (Math.random() < Math.max(0, w.slip - 1.5) * 0.08 * many) {
          E.sparks.emit(P.x + rnd(0.3), P.y + 0.12, P.z + rnd(0.3), rnd(1), 0.6 + Math.random(), rnd(1), { life: 0.35, size: 0.22, size1: 0.02, alpha: 0.7, color: [1, 0.97, 0.85], grav: 0 });
        }
      }
    }
  }

  // ---------- Drift: puntos por ir de lado (DRI-01..03) ----------
  driftStep(car, st, dt) {
    if (!this.started || st.finished) return;
    const fwd = car.fwdSpeed, beta = Math.atan2(Math.abs(car.localVel.x), fwd); // 0..π (de lado, cruzado o de culo)
    const yr = car.body.angvel().y;
    for (const e of car.events) if (e.type === 'hit' && e.strength > 0.24) return this.loseCombo(car, st, 'golpe');
    // derrape: va de lado (o girando sobre sí mismo), no marcha atrás recto
    const sliding = (car.speed > 5 || (car.speed > 1 && Math.abs(yr) > 2)) && car.contacts >= 2 && beta > 0.21 && !car.reversing && !(fwd < -2 && Math.abs(yr) < 1);
    if (sliding) {
      // DRI-11: trompo de 360º derrapando sin parar
      st.rot = (st.rot || 0) + yr * dt; st.rotV = (st.rotV || 0) + car.speed * dt; st.rotT = (st.rotT || 0) + dt;
      if (Math.abs(st.rot) >= Math.PI * 2) {
        // en marcha vale mucho; un donut parado, poco (para que no se pueda ganar sin moverse)
        const moving = st.rotV / st.rotT > 7;
        st.rot -= Math.sign(st.rot) * Math.PI * 2; st.rotV = 0; st.rotT = 0;
        if (!moving) st.donuts = (st.donuts || 0) + 1; // máx. 3 donuts con premio por vuelta
        const got = !moving && st.donuts > 3 ? 0 : (moving ? 300 * st.mult : 40);
        if (got) {
          st.combo += moving ? got / st.mult : got;
          if (car.isPlayer) { st.flash = { t: this.clock, text: moving ? `¡TROMPO 360°! +${got}` : `¡DONUT! +${got}`, ok: true }; this.sfx.play(moving ? 'star' : 'pickup'); }
        }
      }
      // solo puntúa avanzando por la pista (no vale quedarse dando vueltas en un sitio)
      const tg = this.circuit.samples[st.idx].t, along = car.velocity.x * tg.x + car.velocity.z * tg.z;
      st.grace = 1;
      if (along > 2) {
        st.driftT += dt;
        st.mult = Math.min(5, 1 + Math.floor(st.driftT / 1.6));
        st.combo += car.speed * Math.min(beta, 1.1) * 6 * dt;
      }
      // DRI-09: zona de clip: derrapar pegado al exterior de la curva da un bonus (una vez por paso)
      for (const cl of this.T.clips || []) {
        const inside = cl.from <= cl.to ? st.idx >= cl.from && st.idx <= cl.to : st.idx >= cl.from || st.idx <= cl.to;
        if (!inside || st.lastClip === cl) continue;
        const s = this.circuit.samples[st.idx];
        const lat = ((car.currPos.x - s.p.x) * s.n.x + (car.currPos.z - s.p.z) * s.n.z) * cl.side;
        if (lat < this.circuit.width * 0.18) continue;
        st.lastClip = cl;
        const bonus = 150 + 50 * st.mult;
        st.combo += bonus / st.mult;
        st.clips = (st.clips || 0) + 1;
        if (car.isPlayer) { st.flash = { t: this.clock, text: `¡CLIP ${cl.n}! +${bonus}`, ok: true }; this.sfx.play('pickup'); }
      }
    } else if (st.combo > 0 && (st.grace -= dt) <= 0) {
      const got = st.combo * st.mult;
      st.score += got; st.combo = 0; st.driftT = 0; st.mult = 1; st.rot = 0; st.rotV = 0; st.rotT = 0;
      if (car.isPlayer) { st.flash = { t: this.clock, text: `+${fmtPts(got)}`, ok: true }; if (got > 400) this.sfx.play('pickup'); }
    }
  }

  loseCombo(car, st, why) {
    if (st.combo > 30 && car.isPlayer) { st.flash = { t: this.clock, text: why === 'trompo' ? '¡Trompo!' : why === 'golpe' ? '¡Golpe!' : 'Combo perdido', ok: false }; this.sfx.play('wrong'); }
    st.combo = 0; st.driftT = 0; st.mult = 1; st.grace = 0; st.rot = 0;
  }

  respawn(car) {
    const st = this.state(car), c = this.circuit;
    if (this.disc === 'drift') this.loseCombo(car, st);
    if (this.battle && this.battleState?.holder === car) dropStar(this, car.currPos);
    if (this.battle && this.T.spawns) { // arena: al punto libre más cercano
      const p = car.currPos;
      const sp = this.T.spawns.reduce((a, q) => (q.distanceToSquared(p) < a.distanceToSquared(p) ? q : a));
      car.reset(sp.clone().setY(0.6), Math.atan2(-sp.x, -sp.z));
      if (car.isPlayer) this.trauma = 0;
      return;
    }
    // no recolocar encima de un obstáculo (OBS-02): se retrocede hasta un punto libre
    let ri = st.idx;
    if (this.T.safe && st.progress >= 0) { // CRW-11: se reaparece en la puerta del obstáculo en el que estabas (o tras el último superado)
      let best = null;
      for (const i of this.T.safe) if (i <= ri) best = i;
      if (best !== null) {
        // un rival que falla 3 veces seguidas el mismo obstáculo se salta al siguiente punto seguro (el jugador nunca)
        if (!car.isPlayer) {
          car.rsN = car.rsIdx === best ? (car.rsN || 0) + 1 : 1; car.rsIdx = best;
          if (car.rsN >= 3) { const nx = this.T.safe.find((i) => i > best); if (nx !== undefined) { best = nx; car.rsN = 0; car.rsIdx = null; } }
        }
        ri = best;
      }
    }
    for (let k = 0; k < 14 && (this.T.hazards || []).some((hz) => hz.r > 0 && Math.hypot(hz.pos.x - c.samples[ri].p.x, hz.pos.z - c.samples[ri].p.z) < hz.r + 5); k++) ri = (ri - 1 + c.N) % c.N;
    const s = c.samples[ri];
    // altura real del suelo en ese punto (rampas, cuestas…)
    const ray = new RAPIER.Ray({ x: s.p.x, y: s.p.y + 20, z: s.p.z }, { x: 0, y: -1, z: 0 });
    const hit = this.world.castRay(ray, 40, true, undefined, WHEEL_RAY_GROUPS);
    const pos = s.p.clone();
    if (hit) pos.y = s.p.y + 20 - hit.timeOfImpact + 0.3;
    car.reset(pos, c.yawOf(s.t));
    if (car.isPlayer) this.trauma = 0;
  }

  // Estrella flotando en el vuelo del salto: hay que coger la rampa a fondo y por el centro
  createStar(taken) {
    const c = this.circuit, N = c.N;
    const ramp = c.elev.find((e) => e.kind === 'ramp');
    if (!ramp) return null;
    const top = ramp.top;
    const s = c.samples[(top + Math.max(1, (ramp.def.deck ?? 3) - 1)) % N];
    const pos = new THREE.Vector3(s.p.x, c.samples[top].p.y + 3.2, s.p.z); // en el aire sobre la plataforma: hay que saltar
    const shape = new THREE.Shape();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + Math.PI / 2, r = k % 2 ? 0.42 : 1.0;
      if (k) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 1 });
    geo.center();
    const mat = new THREE.MeshStandardMaterial(taken
      ? { color: '#cfd8dc', emissive: '#78909c', emissiveIntensity: 0.4, transparent: true, opacity: 0.35, depthWrite: false, flatShading: true }
      : { color: '#ffd23f', emissive: '#ff9f1a', emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.3, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos); mesh.castShadow = !taken;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), transparent: true, opacity: taken ? 0.15 : 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(5); halo.position.copy(pos);
    this.scene.add(mesh, halo);
    return { mesh, halo, pos, taken, got: false };
  }

  updateStar(dt) {
    const st = this.star;
    if (st.got) {
      st.mesh.scale.multiplyScalar(1 + dt * 4); st.mesh.position.y += dt * 6;
      st.halo.material.opacity = Math.max(0, st.halo.material.opacity - dt * 1.5);
      if (st.mesh.scale.x > 4) { st.mesh.visible = st.halo.visible = false; }
      return;
    }
    st.mesh.rotation.y += dt * 2.4;
    st.mesh.position.y = st.pos.y + Math.sin(this.clock * 2.5) * 0.2;
    st.halo.position.y = st.mesh.position.y;
    if (this.player.currPos.distanceTo(st.mesh.position) > 2.4) return;
    st.got = true;
    if (st.taken) { this.hud.message('⭐ Esta estrella ya era tuya', 1.6); return; }
    this.sfx.play('star');
    this.burst(st.mesh.position, [1, 0.85, 0.3], 60);
    this.flash(st.mesh.position);
    const paid = this.onStar?.();
    this.hud.message(paid ? `⭐ ¡Estrella encontrada! +${paid} 🪙` : '⭐ ¡Estrella encontrada!', 2.6, 'go');
  }

  updatePlaces() {
    if (this.battle && this.battleState) return battlePlaces(this);
    const list = [...this.cars].sort((a, b) => {
      const A = this.state(a), Bs = this.state(b);
      if (this.disc === 'drift') return (Bs.final ?? Bs.score + Bs.combo * Bs.mult) - (A.final ?? A.score + A.combo * A.mult); // DRI-05: por puntos
      if (A.finished && Bs.finished) return A.finishTime - Bs.finishTime;
      if (A.finished) return -1;
      if (Bs.finished) return 1;
      return Bs.progress - A.progress;
    });
    list.forEach((c, i) => { this.state(c).place = i + 1; });
    this.order = list;
  }

  positionRatio(car) { return this.cars.length < 2 ? 0 : (this.state(car).place - 1) / (this.cars.length - 1); }
  carAhead(car) { const p = this.state(car).place; return p > 1 ? this.order[p - 2] : null; }

  playerFinished() {
    const st = this.state(this.player);
    this.phase = 'done';
    this.sfx.play('finish');
    if (this.disc === 'drift') { // DRI-05: se cobra el combo y se proyecta la puntuación de los que no han acabado
      const goal = this.laps * this.circuit.N;
      for (const car of this.cars) {
        const s = this.state(car);
        s.score += s.combo * s.mult; s.combo = 0;
        s.final = s.finished ? s.score : s.score * Math.min(2.5, goal / Math.max(goal * 0.4, s.progress));
      }
      this.updatePlaces();
      if (this.laps === 2 && (!this.best.score || st.final > this.best.score)) this.best.score = st.final; // récord: siempre a 2 vueltas
    }
    const solo = this.cars.length === 1;
    this.hud.message(this.disc === 'drift' ? `¡META! ${fmtPts(st.final)} pts` : solo ? `¡META! ${fmtTime(st.finishTime)}` : `¡META! ${st.place}º`, 3, 'big go');
    if (!this.best.race || st.finishTime < this.best.race) { this.best.race = st.finishTime; }
    this.best.wins = (this.best.wins || 0) + (st.place === 1 && this.cars.length > 1 ? 1 : 0);
    saveBest(this.trackKey, this.best);
    setTimeout(() => { if (this.replayRec) this.replayRec.on = false; this.onFinish?.(this.results()); }, 2500);
  }

  results() {
    return this.order.map((car) => {
      const st = this.state(car);
      return { name: car.name, color: car.color, def: car.def.id, player: car.isPlayer, place: st.place, finished: st.finished, time: st.finishTime, best: st.bestLap, laps: st.laps, score: st.final ?? st.score };
    });
  }

  // ---------- Efectos por coche ----------
  carEffects(car) {
    const E = this.effects;
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(car.currQuat);
    const near = car.currPos.distanceToSquared(this.player.currPos) < 70 * 70;
    let maxSlip = 0;
    for (let i = 0; i < 4; i++) {
      const w = car.wheelState[i];
      const rear = i >= 2;
      const launching = rear && car.throttle > 0 && car.fwdSpeed < (car.driftMode ? 13 : 6) && car.fwdSpeed > -1 && w.contact;
      const braking = car.braking && car.speed > 10 && w.contact;
      if (w.contact) maxSlip = Math.max(maxSlip, w.slip);
      let mark = 0;
      if (w.contact && w.slip > 3.5) mark = (w.slip - 3) / 6;
      if (braking) mark = Math.max(mark, 0.35);
      // drift: al ir de lado marcan las cuatro (más las traseras), sin huecos
      if (car.driftMode && w.contact && car.speed > 3) {
        const ang = Math.atan2(Math.abs(car.localVel.x), Math.abs(car.fwdSpeed) + 0.5);
        if (ang > 0.15) mark = Math.max(mark, Math.min(0.55, (rear ? 0.2 : 0.08) + ang * (rear ? 0.45 : 0.2)));
      }
      if (launching) mark = Math.max(mark, car.driftMode ? 0.5 * car.launch + 0.15 : 0.25);
      if (car.fx.oil > 0 && w.contact) mark = Math.max(mark, 0.4);
      const tr = car.trail;
      let color, lift = car.surface && car.surface !== 'water' ? 0.11 : 0.01;
      if (tr && w.contact) {
        const k = tr.t / tr.max, m = tr.a * (0.25 + 0.75 * k) * (car.speed > 1.5 ? 1 : 0);
        if (m > mark * 0.6) { mark = Math.max(mark, m); color = tr.color; }
      }
      if (car.surface === 'wax' && w.contact && w.slip > 2) { mark = Math.max(mark, 0.12); color = WAX_MARK; }
      E.skids.add(car.index * 4 + i, w.point, side, near ? mark : 0, 0.28, color, lift);
      if (!near) continue;
      const amt = (w.contact ? Math.max(0, (w.slip - 4.5) / 8) : 0) + (launching ? (car.driftMode ? 0.9 * car.launch + 0.3 : 0.35) : 0) + (car.drifting && rear && w.contact ? 0.4 : 0);
      if (amt > 0 && Math.random() < amt * (car.isPlayer ? 1 : 0.5)) {
        const v = car.velocity;
        E.smoke.emit(w.point.x, w.point.y + 0.25, w.point.z, v.x * 0.15 + rnd(1), 0.8 + Math.random() * 0.8, v.z * 0.15 + rnd(1), {
          life: 0.9 + Math.random() * 0.7, size: 0.7, size1: 3 + Math.random() * 1.5, alpha: 0.35, color: [0.9, 0.9, 0.92], drag: 2,
        });
      }
      // gotas que caen del coche después de mojarse
      if (car.fx.wet > 0 && car.surface !== 'water' && Math.random() < 0.08) {
        E.chunks.emit(w.point.x, w.point.y + 0.3, w.point.z, car.velocity.x * 0.6, 0, car.velocity.z * 0.6, { life: 0.4, size: 0.06, size1: 0.04, alpha: 0.7, color: WATER_DROP[1], grav: 20 });
      }
    }
    this.surfaceEffects(car, near);
    // humo (y algo de fuego) si el coche está muy tocado
    if (near && car.health < 55 && Math.random() < (55 - car.health) / 80) {
      const top = car.currPos.clone().addScaledVector(car.forward, -0.3); top.y += 0.5;
      const dark = car.health < 30;
      E.smoke.emit(top.x + rnd(0.2), top.y, top.z + rnd(0.2), car.velocity.x * 0.2 + rnd(0.5), 1.5 + Math.random(), car.velocity.z * 0.2 + rnd(0.5),
        { life: 1 + Math.random() * 0.6, size: 0.4, size1: 2.2, alpha: dark ? 0.55 : 0.35, color: dark ? [0.15, 0.15, 0.16] : [0.55, 0.55, 0.57], drag: 1.5 });
      if (car.health < 18 && Math.random() < 0.3) E.fire.emit(top.x, top.y, top.z, rnd(0.5), 2, rnd(0.5), { life: 0.3, size: 0.5, size1: 0.1, alpha: 0.9, color: [1, 0.5, 0.15], drag: 2 });
    }
    // chispas eléctricas si un pulso le ha dejado sin motor
    if (car.fx.zap > 0 && near && Math.random() < 0.7) {
      E.sparks.emit(car.currPos.x + rnd(0.8), car.currPos.y + 0.4 + Math.random() * 0.6, car.currPos.z + rnd(0.8), rnd(3), 2 + Math.random() * 3, rnd(3),
        { life: 0.25, size: 0.35, size1: 0.05, alpha: 1, color: [0.45, 0.85, 1], grav: 8 });
    }
    // llamas del turbo
    if (car.fx.boost > 0 && near) {
      const back = car.currPos.clone().addScaledVector(car.forward, -1.2); back.y += 0.15;
      for (let k = 0; k < 2; k++) {
        E.fire.emit(back.x + rnd(0.15), back.y, back.z + rnd(0.15), -car.forward.x * 6 + rnd(1), 0.5, -car.forward.z * 6 + rnd(1),
          { life: 0.22, size: 0.7, size1: 0.15, alpha: 0.9, color: [0.4, 0.7, 1], drag: 2 });
      }
    }
    if (car.isPlayer) {
      this.sfx.update(car.speed || 0, car.throttle, Math.max(0, maxSlip - 3) + (car.braking && car.speed > 8 ? 4 : 0) + (car.launch || 0) * 5, { max: car.t.maxSpeed, air: car.contacts === 0 });
      if (car.fx.boost > 0) this.trauma = Math.max(this.trauma, 0.12);
    }

    for (const e of car.events) {
      const vol = this.volAt(e.pos);
      if (e.type === 'land') {
        if (car.isPlayer) this.trauma = Math.min(1, this.trauma + e.strength * 0.7);
        this.sfx.hit(e.strength * 0.7 * vol);
        if (!near) continue;
        const n = 10 + Math.round(e.strength * 16);
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2, sp = 3 + Math.random() * 4 * e.strength;
          E.smoke.emit(e.pos.x + Math.cos(a) * 0.8, 0.2, e.pos.z + Math.sin(a) * 0.8, Math.cos(a) * sp, 0.4 + Math.random(), Math.sin(a) * sp, {
            life: 0.7 + Math.random() * 0.5, size: 0.6, size1: 2.4, alpha: 0.4, color: this.T.dust || [0.82, 0.76, 0.66], drag: 3.5,
          });
        }
      } else if (e.type === 'hit') {
        if (car.isPlayer) { this.trauma = Math.min(1, this.trauma + e.strength * 0.9); vibrate(20 + e.strength * 40); }
        this.sfx.hit(e.strength * vol);
        if (!near) continue;
        const n = 8 + Math.round(e.strength * 24);
        for (let k = 0; k < n; k++) {
          const sp = 6 + Math.random() * 10;
          E.sparks.emit(e.pos.x, e.pos.y, e.pos.z, e.dir.x * sp * 0.3 + rnd(sp * 0.7), 3 + Math.random() * 7, e.dir.z * sp * 0.3 + rnd(sp * 0.7),
            { life: 0.35 + Math.random() * 0.35, size: 0.3, size1: 0.05, alpha: 1, color: [1, 0.65 + Math.random() * 0.3, 0.25], grav: 30, drag: 1 });
        }
      }
    }
    car.events.length = 0;
  }

  // ---------- Utilidades para objetos ----------
  volAt(pos) { return THREE.MathUtils.clamp(1 - this.player.currPos.distanceTo(pos) / 60, 0, 1); }
  sound(name, pos) { this.sfx.play(name, pos ? this.volAt(pos) : 1); }
  shake(a) { this.trauma = Math.min(1, this.trauma + a); }
  flash(pos) { this.flashLight.position.copy(pos).setY(pos.y + 1.5); this.flashLight.intensity = 400; }
  burst(pos, color, n) {
    for (let k = 0; k < n; k++) {
      this.effects.sparks.emit(pos.x, pos.y, pos.z, rnd(6), 2 + Math.random() * 6, rnd(6), { life: 0.5, size: 0.35, size1: 0.05, alpha: 1, color, grav: 15 });
    }
  }

  // ---------- Render ----------
  render(alpha, dt) {
    if (this.replay) return this.renderReplay(dt);
    const S = this.S;
    const mx = this.mirror ? -1 : 1;
    for (const d of this.dynamics) {
      const p = d.body.translation(), r = d.body.rotation();
      d.mesh.position.set(mx * p.x / S, p.y / S, p.z / S);
      d.mesh.quaternion.set(r.x, mx * r.y, mx * r.z, r.w);
    }
    for (const car of this.cars) {
      car.render(this.paused ? 1 : alpha);
      // menos detalle en coches lejanos
      const far = car !== this.player && car.model.position.distanceToSquared(this.camera.position) > 30 * 30;
      for (const m of car.model.userData.detail) m.visible = !far;
    }
    if (this.battle) battleRender(this);
    if (this.ghostMesh) {
      const st0 = this.state(this.player), gt = this.time - st0.lapStart;
      const show = this.started && gt <= this.ghost.time;
      this.ghostMesh.visible = show;
      if (show) poseAt(this.ghostMesh, this.ghost.frames, this.ghost.n, gt);
    }
    this.updateCamera(dt);
    const pp = this.player.model.position;
    this.sun.target.position.copy(pp);
    this.sun.position.copy(pp).add(this.sunOffset);
    this.renderer.render(this.scene, this.camera);

    // HUD
    const st = this.state(this.player);
    this.hud.update({
      speed: Math.abs(this.player.fwdSpeed || 0) * 3,
      place: st.place, total: this.cars.length,
      lap: Math.min(this.laps, Math.max(1, st.laps + 1)), laps: this.laps, practice: this.practice,
      lapTime: this.started ? (st.finished ? st.lastLap : this.time - st.lapStart) : 0,
      best: this.best.lap || 0,
      lastLap: st.lastLap || 0,
      item: this.player.item,
      ammo: this.player.ammo || 0,
      health: this.player.health,
      bomb: this.items.bombs.get(this.player)?.t,
      cars: this.cars, player: this.player,
      battle: this.battleState,
      drift: this.disc === 'drift' ? st : null, solo: this.cars.length === 1 && !this.practice, noItems: this.disc !== 'race',
    });
  }

  updateCamera(dt) {
    const cam = this.camera, car = this.player, T = this.baseTuning;
    const p = car.model.position;
    if (this.debugCam === 'top') {
      const b = this.bounds;
      cam.position.set(0, Math.max(b.x, b.z) * 2.3, 0.01); cam.lookAt(0, 0, 0); cam.fov = 50; cam.updateProjectionMatrix();
      return;
    }
    if (this.debugCam && typeof this.debugCam === 'object') { // cámara fija para pruebas
      cam.position.set(...this.debugCam.pos); cam.lookAt(...this.debugCam.look); cam.fov = 55; cam.updateProjectionMatrix();
      return;
    }
    if (this.debugCam === 'preview') { // foto de la tarjeta del circuito (tests/previews.mjs)
      const b = this.bounds, m = Math.max(b.x, b.z), o = this.previewCam || {};
      cam.position.set(b.x * (o.x ?? 0.15), m * (o.y ?? 0.95), b.z * (o.z ?? 1.25));
      cam.lookAt(0, 0, b.z * (o.lz ?? 0.1)); cam.fov = o.fov ?? 48; cam.updateProjectionMatrix();
      return;
    }
    if (this.debugCam === 'close') {
      cam.position.copy(p).add(new THREE.Vector3(2.4, 1.0, 2.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(car.forward.x, car.forward.z)));
      cam.lookAt(p); cam.fov = 50; cam.updateProjectionMatrix();
      return;
    }
    // mirar atrás (CTL-06) y stick derecho (CTL-07)
    const back = this.started && this.controls.lookBack, stick = this.controls.camStick || { x: 0, y: 0 };
    this.hud.lookBack?.(back);
    if (this.camMode === 'bumper' && this.phase !== 'countdown') return this.bumperCamera(dt, back);
    const tmp = new THREE.Vector3().copy(car.forward).setY(0);
    if (tmp.lengthSq() < 0.01) tmp.copy(this.camDir);
    tmp.normalize();
    const vflat = new THREE.Vector3().copy(car.velocity).setY(0);
    if (vflat.length() > 6 && car.fwdSpeed > 0) tmp.lerp(vflat.normalize(), 0.35).normalize();
    if (car.fwdSpeed < -3) tmp.negate().lerp(this.camDir, 0.5);
    if (!car.rail) this.camDir.lerp(tmp, 1 - Math.exp(-dt * 4.5)).normalize(); // en el looping la cámara no da la vuelta

    const intro = this.phase === 'countdown' ? THREE.MathUtils.smoothstep(this.countdown, 0, 3.2) : 0;
    const far = this.camMode === 'far';
    // giro alrededor del coche: suave con el stick, de golpe al mirar atrás
    const orbitWant = back ? Math.PI : stick.x * 2.4;
    if (back !== this.wasBack) { this.orbit = orbitWant; this.camDist = Math.min(this.camDist, T.camDist); }
    this.wasBack = back;
    this.orbit = (this.orbit || 0) + (orbitWant - (this.orbit || 0)) * (1 - Math.exp(-dt * 5));
    this.camPitch = (this.camPitch || 0) + (-stick.y - (this.camPitch || 0)) * (1 - Math.exp(-dt * 5));
    const cdir = this.orbit ? this.camDir.clone().applyAxisAngle(_Y, this.orbit) : this.camDir;
    const wantDist0 = T.camDist * (far ? 1.55 : 1) * (1 - Math.max(0, this.camPitch) * 0.15) + intro * 9;
    const height = T.camHeight * (far ? 1.5 : 1) * (1 + this.camPitch * 0.9) + intro * 5;
    let want = wantDist0;
    const from = p.clone(); from.y += 1.6;
    const target = p.clone().addScaledVector(cdir, -want); target.y = p.y + height;
    const dir = target.sub(from);
    const dl = dir.length(); dir.divideScalar(dl);
    this.camRay.origin = { x: from.x, y: from.y, z: from.z };
    this.camRay.dir = { x: dir.x, y: dir.y, z: dir.z };
    const hit = this.world.castRay(this.camRay, dl, true, undefined, CAMERA_RAY_GROUPS, car.collider, car.body);
    if (hit) want = Math.max(1.5, want * (hit.timeOfImpact / dl) - 0.4);
    this.camDist += (want - this.camDist) * (1 - Math.exp(-dt * (want < this.camDist ? 20 : 3)));
    this.camY += (p.y + height - this.camY) * (1 - Math.exp(-dt * 5));

    cam.position.copy(p).addScaledVector(cdir, -this.camDist);
    cam.position.y = Math.max(this.camY, p.y + 0.8, 0.6);
    const b = this.bounds;
    cam.position.x = THREE.MathUtils.clamp(cam.position.x, -b.x, b.x);
    cam.position.z = THREE.MathUtils.clamp(cam.position.z, -b.z, b.z);
    cam.position.y = Math.min(cam.position.y, b.h);
    const look = p.clone().addScaledVector(cdir, 2.2); look.y += 0.7;

    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const sh = this.trauma * this.trauma, t = this.clock;
    if (sh > 0) {
      cam.position.x += sh * 0.6 * noise(t * 31.1);
      cam.position.y += sh * 0.45 * noise(t * 27.3 + 7);
      cam.position.z += sh * 0.6 * noise(t * 29.7 + 3);
    }
    cam.lookAt(look);
    cam.rotateZ(sh * 0.06 * noise(t * 21 + 11));
    const fov = 60 + Math.min(Math.max(car.fwdSpeed, 0), 45) * 0.32 + (car.fx.boost > 0 ? 8 : 0);
    cam.fov += (fov - cam.fov) * (1 - Math.exp(-dt * 3));
    cam.updateProjectionMatrix();
  }

  // Cámara en el parachoques: baja, pegada al coche, se inclina con él
  bumperCamera(dt, back = false) {
    const cam = this.camera, car = this.player, m = car.model;
    const fw = new THREE.Vector3(0, 0, 1).applyQuaternion(m.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion);
    cam.position.copy(m.position).addScaledVector(fw, back ? -1.05 : 1.05).addScaledVector(up, 0.32 + car.def.wheelR * 0.5);
    if (back) _qb.copy(m.quaternion); else _qb.copy(m.quaternion).multiply(_qFlip);
    if (back !== this.wasBack) cam.quaternion.copy(_qb); else cam.quaternion.slerp(_qb, 1 - Math.exp(-dt * 18));
    this.wasBack = back;
    cam.rotateX(-0.05);
    // mantener la cámara normal al día para que el cambio de vuelta sea suave
    if (fw.x * fw.x + fw.z * fw.z > 0.05) this.camDir.set(fw.x, 0, fw.z).normalize();
    this.camY = m.position.y + this.baseTuning.camHeight; this.camDist = this.baseTuning.camDist;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const sh = this.trauma * this.trauma;
    if (sh > 0) { cam.rotateX(sh * 0.05 * noise(this.clock * 27)); cam.rotateY(sh * 0.05 * noise(this.clock * 31 + 3)); }
    const fov = 72 + Math.min(Math.max(car.fwdSpeed, 0), 45) * 0.35 + (car.fx.boost > 0 ? 8 : 0);
    cam.fov += (fov - cam.fov) * (1 - Math.exp(-dt * 3));
    cam.updateProjectionMatrix();
  }

  // ---------- Repetición (UX-12) ----------
  get canReplay() { return !!this.replayRec && this.replayRec.frames.length > GHOST_HZ * 3; }

  startReplay(onEnd) {
    if (!this.canReplay) return false;
    this.replayRec.on = false;
    this.replay = { t: 0, dur: this.replayRec.frames.length / GHOST_HZ - 0.05, onEnd, ev: 0, idx: this.circuit.gridSlot(0).idx, last: this.cars.map((c) => c.model.position.clone()) };
    this.director = new Director(this);
    if (this.ghostMesh) this.ghostMesh.visible = false;
    this.hud.lookBack(false);
    for (const k of ['smoke', 'sparks', 'fire', 'chunks']) this.effects[k].p.forEach((p) => { p.life = 0; });
    return true;
  }

  endReplay() {
    const r = this.replay;
    if (!r) return;
    this.replay = null;
    this.sfx.stopEngine();
    r.onEnd?.();
  }

  updateReplay(dt) {
    const r = this.replay, F = this.replayRec.frames;
    r.t += dt;
    if (r.t >= r.dur) { this.endReplay(); return; }
    this.clock += dt;
    const x = r.t * GHOST_HZ, i = Math.floor(x), k = x - i, fa = F[i], fb = F[Math.min(i + 1, F.length - 1)];
    let o = 0;
    this.cars.forEach((car, ci) => {
      const m = car.model;
      poseLerp(m, fa, fb, k, o); o += 7;
      const prev = r.last[ci], d = prev.distanceTo(m.position);
      car.speed = d / Math.max(dt, 1e-3);
      for (const w of car.wheelMeshes) w.children[0].rotation.x += d / car.def.wheelR;
      prev.copy(m.position);
      car.currPos.copy(m.position);
    });
    const S = this.S, mx = this.mirror ? -1 : 1;
    for (const d of this.dynamics) {
      poseLerp(d.mesh, fa, fb, k, o); o += 7;
      d.mesh.position.set(mx * d.mesh.position.x / S, d.mesh.position.y / S, d.mesh.position.z / S);
      const q = d.mesh.quaternion; q.set(q.x, mx * q.y, mx * q.z, q.w);
    }
    const ev = this.replayRec.events;
    while (r.ev < ev.length && ev[r.ev].t <= r.t) { this.items.explosionFx(ev[r.ev].pos); r.ev++; }
    this.T.update?.(this.clock, this);
    for (const k2 of ['smoke', 'sparks', 'fire', 'chunks', 'ripples']) this.effects[k2].update(dt);
    this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 1500);
    const P = this.player;
    r.idx = this.circuit.nearestFrom(r.idx, P.model.position.x, P.model.position.z, 10, 30);
    this.sfx.update(Math.min(P.speed, 40), 0.7, 0, { max: P.t.maxSpeed });
  }

  renderReplay(dt) {
    const P = this.player.model.position;
    this.sun.target.position.copy(P);
    this.sun.position.copy(P).add(this.sunOffset);
    this.director.update(dt, this.player, this.replay.idx);
    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h, pr) {
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    for (const k of ['smoke', 'sparks', 'fire', 'chunks']) this.effects[k].setViewport(h * pr);
  }

  applyTuning(base) {
    this.baseTuning = base;
    this.player.t = discTuning(carTuning(base, this.player.def, 1, this.carUpgrades), this.disc);
    this.player.applyTuning();
    this.world.gravity = { x: 0, y: -base.gravity, z: 0 };
  }

  restartRequestDispose() { this.dispose(); }

  dispose() {
    this.items.dispose();
    const env = this.scene.environment;
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) {
        for (const k of ['map']) if (m[k] && m[k] !== env) m[k].dispose();
        m.dispose();
      }
    });
    clearMatCache();
    this.world.free();
    this.sfx.stopEngine();
  }
}

// La IA usa el ajuste por defecto (no el del jugador) para no heredar trucos raros
function baseTuningDefaults(base) {
  return { ...base, camDist: base.camDist, camHeight: base.camHeight };
}

const _Y = new THREE.Vector3(0, 1, 0);
const WATER_DROP = [[0.78, 0.9, 1], [0.6, 0.8, 0.95], [0.9, 0.96, 1]];
const MUD = [[0.22, 0.14, 0.08], [0.3, 0.2, 0.12], [0.17, 0.11, 0.06]];
const WAX_MARK = [0.75, 0.72, 0.62];
const SAND = [[0.86, 0.74, 0.52], [0.78, 0.66, 0.45], [0.92, 0.82, 0.62]];
const TRAILS = {
  mud: { color: [0.2, 0.13, 0.07], a: 0.6, time: 2.6 },
  water: { color: [0.05, 0.07, 0.09], a: 0.34, time: 2.2 },
  wet: { color: [0.06, 0.08, 0.1], a: 0.22, time: 1.6 },
  sand: { color: [0.72, 0.6, 0.4], a: 0.4, time: 1.4 },
};

export function fmtTime(t) {
  if (!t) return '--:--.--';
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

function loadBest(id) { try { return JSON.parse(localStorage.getItem('reback.best.' + id) || '{}'); } catch { return {}; } }
function saveBest(id, b) { try { localStorage.setItem('reback.best.' + id, JSON.stringify(b)); } catch { /* nada */ } }
export function getBest(id) { return loadBest(id); }

const _qb = new THREE.Quaternion(), _qFlip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
function rnd(a) { return (Math.random() * 2 - 1) * a; }
function noise(x) { return Math.sin(x) * 0.6 + Math.sin(x * 2.3 + 1.7) * 0.3 + Math.sin(x * 5.1 + 0.3) * 0.1; }
function vibrate(ms) { try { navigator.vibrate?.(ms); } catch { /* nada */ } rumble(ms * 2, Math.min(1, ms / 60)); }
