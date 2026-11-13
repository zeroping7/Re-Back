import * as THREE from 'three';
import { WHEEL_RAY_GROUPS, CAR_GROUPS } from './tracks/common.js';
import { buildCarModel } from './carModel.js';
import { driftForces } from './driftPhysics.js';
export { DRIFT } from './driftPhysics.js';

// Coche RC: chasis de Rapier + controlador de vehículo por rayos (suspensión real).
// Ejes locales: +Z adelante, +Y arriba, +X izquierda.
function wheelsFor(def) {
  return [
    { x: def.wheelX, z: def.wheelZf, front: true },
    { x: -def.wheelX, z: def.wheelZf, front: true },
    { x: def.wheelX, z: def.wheelZr, front: false },
    { x: -def.wheelX, z: def.wheelZr, front: false },
  ];
}
const CONN_Y = -0.02;
const SPIN_START = 40 / 57.3, ANTI_GAIN = 3, STRAIGHTEN = 0.5;
// FIS-42: menos raíles: la trasera desliza al girar fuerte a velocidad, dirección más viva y carrocería que se inclina más
const CRAWL_DECEL = 6, CRAWL_HOLD_V = 0.8; // CRW-28
const contacts0 = (veh) => { for (let i = 0; i < 4; i++) if (veh.wheelIsInContact(i)) return true; return false; };
const SLIDE = 0.5, SLIDE_GRIP = 0.08, ANTIROLL = 4.5; // FIS-40/41
const MASS = 8; // masa de referencia: la potencia y el freno se escalan con la masa de cada coche

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _qi = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

export class Car {
  constructor(scene, world, RAPIER, def, tuning, { color = def.color, index = 0, name = def.name } = {}) {
    this.world = world; this.RAPIER = RAPIER; this.t = tuning; this.def = def;
    this.mass = def.mass ?? MASS;
    this.massK = this.mass / MASS;
    this.index = index; this.name = name; this.color = color;
    const WHEELS = (this.W = wheelsFor(def));
    this.R = def.wheelR;
    // efectos de objetos (segundos restantes)
    this.fx = { boost: 0, oil: 0, stun: 0, wet: 0, slide: 0, sand: 0, zap: 0, stick: 0 };
    this.dirt = 0; this.surface = null; this.trail = null; this.loopZone = false; this.rail = null;
    this.item = null;
    this.health = 100;
    this.pullDir = Math.random() < 0.5 ? -1 : 1;
    this.steer = 0; this._ax = 0; this._ay = 0; this._din = 0;
    this.spin = [0, 0, 0, 0];
    this.lastW = [0, 0, 0, 0];
    this.wheelState = WHEELS.map(() => ({ contact: false, point: new THREE.Vector3(), slip: 0, normal: new THREE.Vector3(0, 1, 0) }));
    this.airTime = 0;
    this.upsideTime = 0;
    this.events = []; // { type: 'land'|'hit', strength, pos }
    this.prevPos = new THREE.Vector3(); this.currPos = new THREE.Vector3();
    this.prevQuat = new THREE.Quaternion(); this.currQuat = new THREE.Quaternion();
    this.velocity = new THREE.Vector3();
    this.localVel = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.throttle = 0; this.braking = false; this.drifting = false; this.reversing = false;
    this.rpm = 0.04; // vueltas del motor nitro (0 ralentí … 1 tope), ver exhaust.js
    this.crawl = false; // CRW-01: física de crawler (Obstáculos)
    this.antenna = { pitch: 0, roll: 0, vp: 0, vr: 0 };
    this.lastVel = new THREE.Vector3();
    this.speed = 0; this.fwdSpeed = 0; this.contacts = 4;

    // ----- Física -----
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 0)
        .setLinearDamping(0.05).setAngularDamping(0.8).setCcdEnabled(true).setCanSleep(false),
    );
    const col = RAPIER.ColliderDesc.roundCuboid(0.62, 0.13, 0.92, 0.1)
      .setTranslation(0, 0.12, 0)
      .setFriction(0.1).setRestitution(0.35).setCollisionGroups(CAR_GROUPS)
      .setMassProperties(this.mass, { x: 0, y: -0.58, z: 0 }, { x: 4.2 * this.massK, y: 5.0 * this.massK, z: 3.0 * this.massK }, { x: 0, y: 0, z: 0, w: 1 });
    this.collider = world.createCollider(col, body);
    this.body = body;

    const veh = world.createVehicleController(body);
    veh.indexUpAxis = 1;
    veh.setIndexForwardAxis = 2;
    WHEELS.forEach((w) => {
      veh.addWheel({ x: w.x, y: CONN_Y, z: w.z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, tuning.suspRest, def.wheelR);
    });
    this.vehicle = veh;
    this.applyTuning();

    // ----- Modelo low-poly -----
    this.model = buildCarModel(def, color, WHEELS, CONN_Y);
    this.hubY = [0, 0, 0, 0];
    this.wheelMeshes = this.model.userData.wheels;
    scene.add(this.model);
  }

  applyTuning() {
    const t = this.t, v = this.vehicle;
    for (let i = 0; i < 4; i++) {
      const front = this.W[i].front;
      v.setWheelSuspensionRestLength(i, t.suspRest);
      v.setWheelMaxSuspensionTravel(i, t.suspRest * 0.95);
      v.setWheelSuspensionStiffness(i, t.suspStiff);
      v.setWheelSuspensionCompression(i, t.suspComp);
      v.setWheelSuspensionRelaxation(i, t.suspRelax);
      v.setWheelMaxSuspensionForce(i, 4000 * this.massK);
      v.setWheelFrictionSlip(i, front ? t.gripFront : t.gripRear);
      v.setWheelSideFrictionStiffness(i, front ? t.sideFront : t.sideRear);
    }
  }

  reset(pos, yaw) {
    _q.setFromAxisAngle(UP, yaw);
    this.body.setTranslation({ x: pos.x, y: pos.y + 1.2, z: pos.z }, true);
    this.body.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.steer = 0; this.airTime = 0; this.upsideTime = 0; this.loopZone = false; this.rail = null;
    this.lastVel.set(0, 0, 0);
    this.snapshot(); this.prevPos.copy(this.currPos); this.prevQuat.copy(this.currQuat);
  }

  snapshot() {
    const p = this.body.translation(), r = this.body.rotation();
    this.currPos.set(p.x, p.y, p.z);
    this.currQuat.set(r.x, r.y, r.z, r.w);
  }

  // Un paso de física fijo. input: { steer:-1..1 (+izq), throttle:0..1, brake:0..1 }
  step(dt, input) {
    const t = this.t, b = this.body, veh = this.vehicle;
    this.prevPos.copy(this.currPos); this.prevQuat.copy(this.currQuat);

    const r = b.rotation(); _q.set(r.x, r.y, r.z, r.w); _qi.copy(_q).invert();
    const lv = b.linvel();
    this.velocity.set(lv.x, lv.y, lv.z);
    this.localVel.copy(this.velocity).applyQuaternion(_qi);
    this.forward.set(0, 0, 1).applyQuaternion(_q);
    this.up.set(0, 1, 0).applyQuaternion(_q);
    const fwd = this.localVel.z;
    const speed = this.velocity.length();

    // --- Dirección (más suave a alta velocidad) ---
    const pull = (1 - this.health / 100) * 0.12 * this.pullDir;
    // FIS-24: giro extra a baja velocidad (maniobrar en parado), se desvanece a 6 u/s
    const sens = input.sens ?? 1; // UX-29: sensibilidad elegida en Opciones (solo jugador)
    const lowBoost = 1 + (t.steerLow || 0) * Math.max(0, 1 - Math.abs(fwd) / 6);
    const target = THREE.MathUtils.clamp(input.steer + (Math.abs(fwd) > 3 ? pull : 0), -1, 1) * t.steerMax * lowBoost * sens / (1 + Math.abs(fwd) * t.steerFalloff);
    const ds = t.steerSpeed * sens * dt * (Math.sign(target - this.steer) !== Math.sign(this.steer) ? 1.6 : 1);
    this.steer += THREE.MathUtils.clamp(target - this.steer, -ds, ds);
    veh.setWheelSteering(0, this.steer);
    veh.setWheelSteering(1, this.steer);

    // --- Motor / freno / marcha atrás ---
    let engine = 0, brakeF = 0, brakeR = 0;
    if (!(input.brake > 0 && input.throttle === 0 && Math.abs(input.steer) > 0.3)) this._driftV = 0;
    this._wasDrift = this.drifting;
    this.drifting = false; this.braking = false; this.reversing = false;
    const fx = this.fx;
    for (const k in fx) fx[k] = Math.max(0, fx[k] - dt);
    const stunned = fx.stun > 0;
    const zapped = fx.zap > 0;
    const thr = stunned || zapped ? 0 : input.throttle, brk = stunned ? 0 : input.brake;
    const boost = fx.boost > 0;
    const rb = (this.rubber ?? 1) * (0.72 + 0.28 * this.health / 100);
    const maxSpeed = t.maxSpeed * rb * (boost ? 1.35 : 1) * (fx.wet > 0 ? 0.7 : 1) * (fx.sand > 0 ? 0.6 : 1);
    const power = t.engine * rb * (0.85 + 0.15 * this.health / 100) * (boost ? 1.8 : 1);
    if (thr > 0) {
      // motor eléctrico de RC (como Re-Volt): mucho par al arrancar que cae con la velocidad
      const k = Math.max(0, fwd) / maxSpeed;
      engine = power * thr * 1.25 * Math.max(0, 1 - Math.pow(k, 1.6));
      if (fwd < -1) { brakeF = brakeR = t.brake / 4; engine *= 0.3; }
    }
    if (brk > 0) {
      if (fwd > 2) {
        // FIS-39: una vez derrapando sigue derrapando hasta casi parar (antes, al bajar de 8 u/s frenaba las 4 ruedas cruzado = trompo)
        if (Math.abs(input.steer) > 0.3 && (fwd > 8 || (this._wasDrift && speed > 3))) {
          // Freno + giro = derrape (como freno de mano)
          this.drifting = true;
          // FIS-38: el motor solo mantiene las ruedas traseras girando; frenando nunca se gana velocidad
          if (!this._driftV) this._driftV = fwd;
          this._driftV = Math.min(this._driftV, fwd + 0.3) - 1.5 * dt;
          engine = t.engine * 0.55 * THREE.MathUtils.clamp((this._driftV - fwd) / 1.5, 0, 1);
        } else {
          brakeF = brakeR = (t.brake / 4) * brk;
          this.braking = true;
        }
      } else if (thr === 0) {
        // FIS-37: parado, el freno mete la marcha atrás también con el volante girado
        {
          const lim = THREE.MathUtils.clamp((12 + fwd) / 3, 0, 1);
          engine = -t.engine * 0.55 * brk * lim;
          this.reversing = true;
        }
      }
    }
    if (boost && thr === 0 && brk === 0) engine = power * THREE.MathUtils.clamp((maxSpeed - fwd) / (maxSpeed * 0.25), 0, 1);
    // resistencia a rodar; el crawler lleva freno motor fuerte: se queda quieto en la cuesta al soltar el gas (CRW-01)
    // CRW-28: en llano el crawler rueda suelto al soltar el gas; en cuesta (o casi parado) se sujeta como antes
    if (thr === 0 && brk === 0 && !boost) {
      const slope = THREE.MathUtils.clamp((Math.abs(this.forward.y) - 0.05) / 0.07, 0, 1); // 3° → 7°
      const hold = !this.crawl ? 0 : speed < CRAWL_HOLD_V ? 1 : slope;
      brakeF = brakeR = 0.04 + (1.8 - 0.04) * hold;
      if (this.crawl && hold < 1 && contacts0(veh)) {
        // freno motor suave y constante en llano (deceleración CRAWL_DECEL u/s²)
        const v = b.linvel(), h = Math.hypot(v.x, v.z) || 1, k = Math.min(h, CRAWL_DECEL * dt) * (1 - hold) * this.mass / h;
        b.applyImpulse({ x: -v.x * k, y: 0, z: -v.z * k }, true);
      }
    }
    if (input.hold) { engine = 0; brakeF = brakeR = t.brake / 4; this.reversing = false; }
    // charco: frena suave con resistencia del agua (sin bloquear ruedas, que hacía trompos)
    if (fx.wet > 0 && fwd > maxSpeed) {
      const k = Math.min(fwd - maxSpeed, 6) * 1.2 * this.mass * dt;
      b.applyImpulse({ x: -this.forward.x * k, y: 0, z: -this.forward.z * k }, true);
      engine = 0;
    }
    // arena blanda (CRW-13): se hunde, frena fuerte y cuesta avanzar
    if (fx.sand > 0) {
      const v = b.linvel(), k = 1.7 * this.mass * dt;
      b.applyImpulse({ x: -v.x * k, y: 0, z: -v.z * k }, true);
      if (fwd > maxSpeed) engine = 0;
    }
    this.throttle = thr;

    // FIS-39: el agarre trasero del derrape entra y sale en ~0,3 s (antes era un interruptor)
    this._dk = THREE.MathUtils.clamp((this._dk || 0) + (this.drifting ? dt / 0.3 : -dt / 0.25), 0, 1);
    // FIS-40: ángulo de cruzada (morro vs. dirección real); por encima de 40° la trasera recupera agarre
    // tras derrapar (o yendo hacia delante) vigila también más allá de 90°; marcha atrás normal no cuenta
    this._guard = this.drifting ? 1.2 : Math.max(0, (this._guard || 0) - dt);
    const watch = !this.driftMode && speed > 4 && !this.reversing && (this._guard > 0 || this.localVel.z > 1);
    const beta = watch ? Math.atan2(Math.abs(this.localVel.x), this.localVel.z) : 0;
    const anti = THREE.MathUtils.clamp((beta - SPIN_START) / 0.5, 0, 1);
    const rearK = (1 + (t.driftRear - 1) * this._dk) * (1 + anti * 0.9);
    // FIS-42: deslizamiento progresivo sin frenar: girando fuerte a velocidad, la trasera pierde algo de rigidez lateral y culea
    const lk = this.driftMode || this.crawl ? 0 : THREE.MathUtils.clamp(Math.abs(this.steer) / (t.steerMax * 0.55), 0, 1) * THREE.MathUtils.clamp((speed - 6) / 14, 0, 1) * (1 - anti);
    const sideR = t.sideRear * (1 - SLIDE * lk), slipR = 1 - SLIDE_GRIP * lk;
    const rear = t.rearBias / 100;
    for (let i = 0; i < 4; i++) {
      const front = this.W[i].front;
      // DRI-15: en drift las fuerzas de los neumáticos las pone driftPhysics.js; Rapier solo hace la suspensión
      veh.setWheelEngineForce(i, this.driftMode ? 0 : ((engine * (front ? 1 - rear : rear)) / 2) * this.massK);
      veh.setWheelBrake(i, this.driftMode ? 0 : (front ? brakeF : brakeR) * this.massK);
      veh.setWheelSideFrictionStiffness(i, this.driftMode ? 0 : front ? t.sideFront : sideR);
      // aceite: casi sin agarre · zona de derrape: agarre reducido pero controlable
      const oil = fx.oil > 0 ? 0.22 : fx.slide > 0 ? (front ? 0.88 : 0.74) : fx.sand > 0 ? 0.8 : 1;
      veh.setWheelFrictionSlip(i, (front ? t.gripFront : t.gripRear * rearK * slipR) * oil);
    }

    veh.updateVehicle(dt, undefined, WHEEL_RAY_GROUPS);

    // --- Estado de ruedas ---
    let contacts = 0;
    for (let i = 0; i < 4; i++) {
      const ws = this.wheelState[i];
      ws.contact = veh.wheelIsInContact(i);
      if (ws.contact) {
        contacts++;
        const cp = veh.wheelContactPoint(i);
        if (cp) ws.point.set(cp.x, cp.y, cp.z);
        const cn = veh.wheelContactNormal(i);
        if (cn) ws.normal.set(cn.x, cn.y, cn.z);
      }
      // deslizamiento lateral aproximado en la rueda
      const lat = this.localVel.x;
      const steerAng = this.W[i].front ? this.steer : 0;
      const wheelLat = Math.cos(steerAng) * lat - Math.sin(steerAng) * fwd;
      ws.slip = ws.contact ? Math.abs(wheelLat) : 0;
      // giro visual de la rueda (con patinazo al arrancar)
      let w = fwd / this.R;
      if (thr > 0 && !this.W[i].front && fwd < 6) w += 25 * thr;
      if (this.launch > 0 && !this.W[i].front) w = Math.max(w, fwd / this.R + 60 * this.launch); // ruedas patinando
      if (!ws.contact) w = this.lastW[i] * 0.99 + (thr > 0 && !this.W[i].front ? 0.5 : 0);
      this.lastW[i] = w;
      this.spin[i] += w * dt;
    }
    this.contacts = contacts;

    // --- Ayudas arcade ---
    const m = this.mass;
    if (!this.driftMode && (this.drifting || fx.slide > 0 || fx.wet > 0)) {
      // limitar el giro sobre sí mismo para que el derrape (o el resbalón) sea controlable
      const yr = b.angvel().y, lim = this.drifting && !fx.slide ? 2.6 : 2.0;
      if (Math.abs(yr) > lim) {
        const k = (Math.abs(yr) - lim) * Math.sign(yr) * 5.0 * 0.3;
        b.applyTorqueImpulse({ x: 0, y: -k, z: 0 }, true);
      }
    }
    if (beta > 0.1 && contacts > 1) {
      // FIS-40/41: anti-trompo y el gas endereza: par que gira el morro hacia donde va el coche
      const al = Math.min(beta, 0.9) / 0.9;
      const gain = anti * ANTI_GAIN + (thr > 0 && !this.drifting ? STRAIGHTEN * al : 0);
      if (gain > 0) {
        const want = Math.sign(this.localVel.x) * Math.min(beta, 0.9) * 2.2, yr = b.angvel().y;
        b.applyTorqueImpulse({ x: 0, y: (want - yr) * gain * m * dt, z: 0 }, true);
      }
    }
    this.launch = 0;
    if (this.driftMode && contacts > 0 && this.up.y > 0.3) {
      const powerK = rb * (0.85 + 0.15 * this.health / 100) * (boost ? 1.8 : 1);
      driftForces(this, dt, input, { thr, brk, speed, maxSpeed, powerK });
    }
    if (contacts > 0) {
      // carga aerodinámica
      const down = t.downforce * speed * speed / 10 * m * dt;
      b.applyImpulse({ x: -this.up.x * down, y: -this.up.y * down, z: -this.up.z * down }, true);
    }
    if (contacts > 0 && !this.loopZone) {
      // estabilizador anti-vuelco suave
      _v.crossVectors(this.up, UP).multiplyScalar((this.crawl ? 3 : this.driftMode ? 7 : ANTIROLL) * m * dt * (contacts / 4)); // crawler: antivuelco suave, puede volcar de lado
      b.applyTorqueImpulse({ x: _v.x, y: _v.y, z: _v.z }, true);
    } else {
      // control en el aire: cabeceo con gas/freno, giro con dirección
      const ac = t.airControl * dt * this.massK;
      const right = _v.set(-1, 0, 0).applyQuaternion(_q);
      const pitch = (input.throttle - input.brake) * ac * 0.6;
      const yaw = input.steer * ac * 0.5;
      b.applyTorqueImpulse({
        x: right.x * pitch + this.up.x * yaw,
        y: right.y * pitch + this.up.y * yaw,
        z: right.z * pitch + this.up.z * yaw,
      }, true);
      // auto-nivelado leve
      _v.crossVectors(this.up, UP).multiplyScalar(2.5 * m * dt);
      b.applyTorqueImpulse({ x: _v.x, y: _v.y, z: _v.z }, true);
    }

    // enderezarse solo si se queda apoyado de lado a poca velocidad (como Re-Volt)
    if (this.up.y < 0.85 && this.up.y > -0.2 && speed < 4 && !(this.loopZone && contacts > 0)) {
      _v.crossVectors(this.up, UP).multiplyScalar(22 * m * dt);
      b.applyTorqueImpulse({ x: _v.x, y: _v.y, z: _v.z }, true);
      if (contacts < 2) b.applyImpulse({ x: 0, y: 3 * m * dt, z: 0 }, true);
    }
    // --- Antena con muelle ---
    const acc = _v2.copy(this.velocity).sub(this.lastVel).divideScalar(dt).applyQuaternion(_qi);
    const an = this.antenna;
    an.vp += (-120 * an.pitch - 6 * an.vp - acc.z * 0.12) * dt;
    an.vr += (-120 * an.roll - 6 * an.vr + acc.x * 0.12) * dt;
    an.pitch = THREE.MathUtils.clamp(an.pitch + an.vp * dt, -0.9, 0.9);
    an.roll = THREE.MathUtils.clamp(an.roll + an.vr * dt, -0.9, 0.9);

    this.speed = speed;
    this.fwdSpeed = fwd;
  }

  // Tras world.step(): detectar aterrizajes y golpes
  afterStep(dt) {
    this.snapshot();
    const lv = this.body.linvel();
    _v.set(lv.x, lv.y, lv.z);
    const dv = _v2.copy(_v).sub(this.velocity);
    dv.y += this.world.gravity.y * -dt;

    if (this.contacts === 0) this.airTime += dt;
    else {
      if (this.airTime > 0.25 && !this.loopZone) {
        const ls = Math.min(1, this.airTime * 1.2 + Math.abs(this.velocity.y) / 30);
        this.events.push({ type: 'land', strength: ls, pos: this.currPos.clone() });
        if (ls > 0.85) this.damage((ls - 0.85) * 20, new THREE.Vector3(0, -0.15, 0), 0.3);
      }
      this.airTime = 0;
    }
    const horiz = this.loopZone ? 0 : Math.hypot(dv.x, dv.z); // en el looping no hay golpes
    if (horiz > (this.driftMode ? 2.4 : 5)) { // en drift cuentan hasta los golpes pequeños (el roce no)
      const dir = new THREE.Vector3(-dv.x, 0, -dv.z).normalize();
      const pos = this.currPos.clone().addScaledVector(dir, 1.0); pos.y += 0.2;
      // punto exacto del golpe en coordenadas del coche (para abollar la carrocería)
      let local = null;
      const w = this.world;
      w.contactPairsWith(this.collider, (other) => {
        if (local) return;
        w.contactPair(this.collider, other, (man, flipped) => {
          if (local || man.numContacts() === 0) return;
          const lp = flipped ? man.localContactPoint2(0) : man.localContactPoint1(0);
          if (lp) local = new THREE.Vector3(lp.x, lp.y + 0.12, lp.z);
        });
      });
      if (!local) local = dir.clone().applyQuaternion(_qi.copy(this.currQuat).invert()).multiplyScalar(0.9);
      const strength = Math.min(1, horiz / 25);
      this.events.push({ type: 'hit', strength, pos, dir: dir.negate(), local });
      this.damage(Math.max(0, strength - 0.22) * 22, local, strength);
    }
    this.lastVel.copy(this.velocity);

    // ¿volcado?
    if (this.up.y < 0.5 && this.speed < 3) this.upsideTime += dt; else this.upsideTime = 0;
  }

  // Daño: baja la salud, abolla la carrocería y la ensucia
  damage(amount, local, strength = 0.5) {
    amount *= this.damageK ?? 1; // en Drift y Obstáculos los golpes estropean menos (no hay llave 🔧)
    if (amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    const u = this.model.userData;
    if (local) u.deform(local, Math.min(0.32, 0.08 + strength * 0.24));
    u.wear(this.health / 100);
    u.antennaBase.z = (1 - this.health / 100) * 0.7 * this.pullDir;
  }

  repair(amount) {
    this.health = Math.min(100, this.health + amount);
    const u = this.model.userData;
    u.restore(amount / 100);
    u.wear(this.health / 100);
    u.antennaBase.z = (1 - this.health / 100) * 0.7 * this.pullDir;
  }

  render(alpha) {
    this.model.position.lerpVectors(this.prevPos, this.currPos, alpha);
    this.model.quaternion.slerpQuaternions(this.prevQuat, this.currQuat, alpha);
    const veh = this.vehicle;
    for (let i = 0; i < 4; i++) {
      const wm = this.wheelMeshes[i];
      const len = veh.wheelSuspensionLength(i) ?? this.t.suspRest;
      wm.position.set(this.W[i].x, CONN_Y - len, this.W[i].z);
      this.hubY[i] = CONN_Y - len;
      wm.rotation.y = this.W[i].front ? this.steer : 0;
      wm.children[0].rotation.x = this.spin[i];
    }
    const u = this.model.userData;
    u.updateSuspension(this.hubY);
    // barro en la carrocería (se seca y cae despacio; el agua lo lava)
    if (u.paint) {
      u.paint.userData.dirt.value = this.dirt;
      if (this.dirt > 0) { this.model.updateMatrixWorld(); u.paint.userData.root.value.copy(this.model.matrixWorld).invert(); }
    }
    u.antenna.rotation.set(u.antennaBase.x + this.antenna.pitch, 0, u.antennaBase.z + this.antenna.roll);
    const brakeGlow = this.braking || this.drifting ? 3.2 : this.reversing ? 1.5 : 0.6;
    u.tailMat.emissiveIntensity += (brakeGlow - u.tailMat.emissiveIntensity) * 0.3;
    u.revMat.emissiveIntensity = this.reversing ? 2.5 : 0;
  }
}

