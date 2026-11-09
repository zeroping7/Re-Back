import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createBuilder, clearMatCache, mergeStatic, scaleTrack, CAMERA_RAY_GROUPS, WHEEL_RAY_GROUPS } from './tracks/common.js';
import { Car } from './car.js';
import { CARS, carTuning } from './cars.js';
import { AIDriver } from './ai.js';
import { Items } from './items.js';
import { Particles, SkidMarks } from './effects.js';

export const FIXED = 1 / 60;
const RIVAL_COLORS = ['#ff7a00', '#00b8a9', '#ff4f9a', '#7cb342', '#5c6bc0', '#fdd835', '#8d6e63'];
const RIVAL_NAMES = ['Turbo', 'Pila', 'Zumbi', 'Trasto', 'Muelle', 'Chapa', 'Tuerca'];

// Una carrera completa: escena, física, coches, IA, objetos, vueltas y cámara.
export class Race {
  constructor({ renderer, envMap, sfx, controls, hud, trackDef, carDef, carUpgrades = {}, laps = 3, rivals = 3, difficulty = 1, baseTuning, onFinish, practice = false }) {
    this.carUpgrades = carUpgrades;
    this.renderer = renderer; this.sfx = sfx; this.controls = controls; this.hud = hud;
    this.trackDef = trackDef; this.laps = laps; this.baseTuning = baseTuning; this.onFinish = onFinish;
    this.practice = practice;
    this.time = 0; this.phase = 'countdown'; this.countdown = 3.2; this.started = false; this.paused = false;
    this.acc = 0; this.trauma = 0; this.clock = 0;

    // ---------- Escena ----------
    const scene = (this.scene = new THREE.Scene());
    scene.environment = envMap;
    this.world = new RAPIER.World({ x: 0, y: -baseTuning.gravity, z: 0 });
    this.world.timestep = FIXED;
    const S = (this.S = trackDef.scale ?? 2);
    const root = new THREE.Group();
    root.scale.setScalar(S);
    scene.add(root);
    const B = createBuilder(root, this.world, RAPIER, S);
    const T = (this.T = trackDef.build(B));
    this.dynamics = B.dynamics;
    scaleTrack(T, S);
    this.circuit = T.circuit;
    this.bounds = T.bounds;
    this.setupLights(T.lights);
    mergeStatic(scene);

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1400);

    // ---------- Efectos ----------
    this.effects = {
      smoke: new Particles(scene, 700),
      sparks: new Particles(scene, 400, { additive: true, soft: 0.6 }),
      fire: new Particles(scene, 300, { additive: true, soft: 1 }),
      skids: new SkidMarks(scene, 2400),
    };
    this.flashLight = new THREE.PointLight('#ffb050', 0, 30, 1.5);
    scene.add(this.flashLight);

    // ---------- Coches ----------
    this.cars = [];
    this.states = new Map();
    this.ai = new Map();
    const total = practice ? 1 : rivals + 1;
    const rivalDefs = CARS.filter((c) => c.id !== carDef.id);
    for (let i = 0; i < total; i++) {
      const isPlayer = i === total - 1; // el jugador sale el último
      const def = isPlayer ? carDef : rivalDefs[i % rivalDefs.length];
      const skill = isPlayer ? 1 : difficulty * (0.95 + 0.05 * (i / Math.max(1, total - 1)));
      const tuning = isPlayer ? carTuning(baseTuning, def, 1, carUpgrades) : carTuning(baseTuningDefaults(baseTuning), def, skill);
      const color = isPlayer ? def.color : RIVAL_COLORS[i % RIVAL_COLORS.length];
      const car = new Car(scene, this.world, RAPIER, def, tuning, { color, index: i, name: isPlayer ? 'Tú' : RIVAL_NAMES[i % RIVAL_NAMES.length] });
      const slot = this.circuit.gridSlot(i);
      car.reset(slot.pos, slot.yaw);
      car.isPlayer = isPlayer;
      this.cars.push(car);
      this.states.set(car, { idx: slot.idx, progress: slot.idx - this.circuit.N, laps: 0, finished: false, finishTime: 0, lapStart: 0, lastLap: 0, bestLap: 0, wrongT: 0, place: 0 });
      if (isPlayer) this.player = car;
      else this.ai.set(car, new AIDriver(car, this.circuit, { skill, seed: i + 1 }));
    }
    this.playerAI = new AIDriver(this.player, this.circuit, { skill: 1, seed: 99 }); // para después de la meta

    // ---------- Objetos ----------
    this.items = new Items(this);
    if (!practice) this.items.createPickups(T.itemSpots);

    // ---------- Cámara inicial ----------
    this.camDir = new THREE.Vector3().copy(this.player.forward).setY(0).normalize();
    this.camY = this.player.currPos.y + 7;
    this.camDist = 16;
    this.camRay = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
    this.best = loadBest(trackDef.id);
    this.updatePlaces();
    this.hud.setupMinimap(this.circuit);
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

    this.T.update?.(this.clock);
    this.items.update(dt);
    this.effects.smoke.update(dt); this.effects.sparks.update(dt); this.effects.fire.update(dt);
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
      if (!car.isPlayer && this.started && !this.practice) {
        const ps = this.state(this.player);
        const diff = (st.progress - ps.progress) / this.circuit.N;
        car.rubber = THREE.MathUtils.clamp(1 - diff * 0.45, 0.9, 1.1);
      }
      car.step(dt, input);
    }
    this.world.step();
    for (const car of this.cars) {
      car.afterStep(dt);
      this.trackProgress(car, dt);
      this.zoneEffects(car);
      this.carEffects(car);
    }
    this.updatePlaces();
  }

  trackProgress(car, dt) {
    const st = this.state(car), c = this.circuit;
    const p = car.currPos;
    const ni = c.nearestFrom(st.idx, p.x, p.z, 8, 20);
    let d = ni - st.idx;
    if (d < -c.N / 2) d += c.N;
    if (d > c.N / 2) d -= c.N;
    st.progress += d; st.idx = ni;

    // vueltas
    if (this.started && !st.finished) {
      const laps = Math.floor(st.progress / c.N);
      if (laps > st.laps) {
        st.laps = laps;
        const lapTime = this.time - st.lapStart;
        st.lastLap = lapTime; st.lapStart = this.time;
        if (!st.bestLap || lapTime < st.bestLap) st.bestLap = lapTime;
        if (car.isPlayer) {
          if (!this.best.lap || lapTime < this.best.lap) { this.best.lap = lapTime; saveBest(this.trackDef.id, this.best); this.hud.message(`¡Récord de vuelta! ${fmtTime(lapTime)}`, 2); }
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
    if (lat > c.width / 2 + 2 && car.contacts > 0) st.offT = (st.offT || 0) + dt; else st.offT = 0;
    // recolocar si vuelca o se sale
    const b = this.bounds;
    if (car.upsideTime > 1.4 || p.y < -4 || Math.abs(p.x) > b.x + 2 || Math.abs(p.z) > b.z + 2 || st.offT > (car.isPlayer ? 2.5 : 1.5)) {
      st.offT = 0;
      this.respawn(car);
    }
  }

  zoneEffects(car) {
    const idx = this.state(car).idx, c = this.circuit;
    for (const z of this.T.zones || []) {
      if (car.contacts === 0) continue;
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
          if (z.particles && car.speed > 6 && Math.random() < 0.5) {
            const w = car.wheelState[2 + (Math.random() < 0.5 ? 0 : 1)];
            this.effects.smoke.emit(w.point.x, w.point.y + 0.2, w.point.z, rnd(2), 1 + Math.random() * 3, rnd(2),
              { life: 0.6, size: 0.4, size1: 1.2, alpha: 0.6, color: z.particles, grav: 12, drag: 1 });
          }
        }
        continue;
      }
      if (Math.hypot(car.currPos.x - z.pos.x, car.currPos.z - z.pos.z) > z.r) continue;
      if (z.effect === 'wet') {
        if (car.fx.wet < 0.2 && car.speed > 6) {
          this.sound('splash', car.currPos);
          for (let k = 0; k < 20; k++) {
            this.effects.smoke.emit(car.currPos.x, 0.3, car.currPos.z, rnd(5), 3 + Math.random() * 6, rnd(5),
              { life: 0.6, size: 0.3, size1: 0.7, alpha: 0.8, color: [0.45, 0.7, 0.95], grav: 25, drag: 0.5 });
          }
        }
        car.fx.wet = Math.max(car.fx.wet, 0.8);
      }
    }
  }

  respawn(car) {
    const st = this.state(car), c = this.circuit;
    const s = c.samples[st.idx];
    // altura real del suelo en ese punto (rampas, cuestas…)
    const ray = new RAPIER.Ray({ x: s.p.x, y: s.p.y + 20, z: s.p.z }, { x: 0, y: -1, z: 0 });
    const hit = this.world.castRay(ray, 40, true, undefined, WHEEL_RAY_GROUPS);
    const pos = s.p.clone();
    if (hit) pos.y = s.p.y + 20 - hit.timeOfImpact + 0.3;
    car.reset(pos, c.yawOf(s.t));
    if (car.isPlayer) this.trauma = 0;
  }

  updatePlaces() {
    const list = [...this.cars].sort((a, b) => {
      const A = this.state(a), Bs = this.state(b);
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
    this.hud.message(`¡META! ${st.place}º`, 3, 'big go');
    if (!this.best.race || st.finishTime < this.best.race) { this.best.race = st.finishTime; }
    this.best.wins = (this.best.wins || 0) + (st.place === 1 ? 1 : 0);
    saveBest(this.trackDef.id, this.best);
    setTimeout(() => this.onFinish?.(this.results()), 2500);
  }

  results() {
    return this.order.map((car) => {
      const st = this.state(car);
      return { name: car.name, color: car.color, player: car.isPlayer, place: st.place, finished: st.finished, time: st.finishTime, best: st.bestLap, laps: st.laps };
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
      const launching = rear && car.throttle > 0 && car.fwdSpeed < 6 && car.fwdSpeed > -1 && w.contact;
      const braking = car.braking && car.speed > 10 && w.contact;
      if (w.contact) maxSlip = Math.max(maxSlip, w.slip);
      let mark = 0;
      if (w.contact && w.slip > 3.5) mark = (w.slip - 3) / 6;
      if (braking) mark = Math.max(mark, 0.35);
      if (launching) mark = Math.max(mark, 0.25);
      if (car.fx.oil > 0 && w.contact) mark = Math.max(mark, 0.4);
      E.skids.add(car.index * 4 + i, w.point, side, near ? mark : 0);
      if (!near) continue;
      const amt = (w.contact ? Math.max(0, (w.slip - 4.5) / 8) : 0) + (launching ? 0.35 : 0) + (car.drifting && rear && w.contact ? 0.4 : 0);
      if (amt > 0 && Math.random() < amt * (car.isPlayer ? 1 : 0.5)) {
        const v = car.velocity;
        E.smoke.emit(w.point.x, w.point.y + 0.25, w.point.z, v.x * 0.15 + rnd(1), 0.8 + Math.random() * 0.8, v.z * 0.15 + rnd(1), {
          life: 0.9 + Math.random() * 0.7, size: 0.7, size1: 3 + Math.random() * 1.5, alpha: 0.35, color: [0.9, 0.9, 0.92], drag: 2,
        });
      }
      if (car.fx.wet > 0 && Math.random() < 0.3) {
        E.smoke.emit(w.point.x, w.point.y + 0.2, w.point.z, rnd(1.5), 2 + Math.random() * 2, rnd(1.5), { life: 0.4, size: 0.25, size1: 0.4, alpha: 0.7, color: [0.5, 0.78, 1], grav: 20 });
      }
    }
    // humo (y algo de fuego) si el coche está muy tocado
    if (near && car.health < 55 && Math.random() < (55 - car.health) / 80) {
      const top = car.currPos.clone().addScaledVector(car.forward, -0.3); top.y += 0.5;
      const dark = car.health < 30;
      E.smoke.emit(top.x + rnd(0.2), top.y, top.z + rnd(0.2), car.velocity.x * 0.2 + rnd(0.5), 1.5 + Math.random(), car.velocity.z * 0.2 + rnd(0.5),
        { life: 1 + Math.random() * 0.6, size: 0.4, size1: 2.2, alpha: dark ? 0.55 : 0.35, color: dark ? [0.15, 0.15, 0.16] : [0.55, 0.55, 0.57], drag: 1.5 });
      if (car.health < 18 && Math.random() < 0.3) E.fire.emit(top.x, top.y, top.z, rnd(0.5), 2, rnd(0.5), { life: 0.3, size: 0.5, size1: 0.1, alpha: 0.9, color: [1, 0.5, 0.15], drag: 2 });
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
      this.sfx.update(car.speed || 0, car.throttle, Math.max(0, maxSlip - 3) + (car.braking && car.speed > 8 ? 4 : 0));
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
    const S = this.S;
    for (const d of this.dynamics) {
      const p = d.body.translation(), r = d.body.rotation();
      d.mesh.position.set(p.x / S, p.y / S, p.z / S);
      d.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
    for (const car of this.cars) {
      car.render(this.paused ? 1 : alpha);
      // menos detalle en coches lejanos
      const far = car !== this.player && car.model.position.distanceToSquared(this.camera.position) > 30 * 30;
      for (const m of car.model.userData.detail) m.visible = !far;
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
      item: this.player.item,
      health: this.player.health,
      bomb: this.items.bombs.get(this.player)?.t,
      cars: this.cars, player: this.player,
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
    if (this.debugCam === 'close') {
      cam.position.copy(p).add(new THREE.Vector3(2.4, 1.0, 2.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(car.forward.x, car.forward.z)));
      cam.lookAt(p); cam.fov = 50; cam.updateProjectionMatrix();
      return;
    }
    const tmp = new THREE.Vector3().copy(car.forward).setY(0);
    if (tmp.lengthSq() < 0.01) tmp.copy(this.camDir);
    tmp.normalize();
    const vflat = new THREE.Vector3().copy(car.velocity).setY(0);
    if (vflat.length() > 6 && car.fwdSpeed > 0) tmp.lerp(vflat.normalize(), 0.35).normalize();
    if (car.fwdSpeed < -3) tmp.negate().lerp(this.camDir, 0.5);
    this.camDir.lerp(tmp, 1 - Math.exp(-dt * 4.5)).normalize();

    const intro = this.phase === 'countdown' ? THREE.MathUtils.smoothstep(this.countdown, 0, 3.2) : 0;
    const wantDist0 = T.camDist + intro * 9;
    const height = T.camHeight + intro * 5;
    let want = wantDist0;
    const from = p.clone(); from.y += 1.6;
    const target = p.clone().addScaledVector(this.camDir, -want); target.y = p.y + height;
    const dir = target.sub(from);
    const dl = dir.length(); dir.divideScalar(dl);
    this.camRay.origin = { x: from.x, y: from.y, z: from.z };
    this.camRay.dir = { x: dir.x, y: dir.y, z: dir.z };
    const hit = this.world.castRay(this.camRay, dl, true, undefined, CAMERA_RAY_GROUPS, car.collider, car.body);
    if (hit) want = Math.max(1.5, want * (hit.timeOfImpact / dl) - 0.4);
    this.camDist += (want - this.camDist) * (1 - Math.exp(-dt * (want < this.camDist ? 20 : 3)));
    this.camY += (p.y + height - this.camY) * (1 - Math.exp(-dt * 5));

    cam.position.copy(p).addScaledVector(this.camDir, -this.camDist);
    cam.position.y = Math.max(this.camY, p.y + 0.8, 0.6);
    const b = this.bounds;
    cam.position.x = THREE.MathUtils.clamp(cam.position.x, -b.x, b.x);
    cam.position.z = THREE.MathUtils.clamp(cam.position.z, -b.z, b.z);
    cam.position.y = Math.min(cam.position.y, b.h);
    const look = p.clone().addScaledVector(this.camDir, 2.2); look.y += 0.7;

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

  resize(w, h, pr) {
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    for (const k of ['smoke', 'sparks', 'fire']) this.effects[k].setViewport(h * pr);
  }

  applyTuning(base) {
    this.baseTuning = base;
    this.player.t = carTuning(base, this.player.def, 1, this.carUpgrades);
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

export function fmtTime(t) {
  if (!t) return '--:--.--';
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

function loadBest(id) { try { return JSON.parse(localStorage.getItem('reback.best.' + id) || '{}'); } catch { return {}; } }
function saveBest(id, b) { try { localStorage.setItem('reback.best.' + id, JSON.stringify(b)); } catch { /* nada */ } }
export function getBest(id) { return loadBest(id); }

function rnd(a) { return (Math.random() * 2 - 1) * a; }
function noise(x) { return Math.sin(x) * 0.6 + Math.sin(x * 2.3 + 1.7) * 0.3 + Math.sin(x * 5.1 + 0.3) * 0.1; }
function vibrate(ms) { try { navigator.vibrate?.(ms); } catch { /* nada */ } }
