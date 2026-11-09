import * as THREE from 'three';
import { WHEEL_RAY_GROUPS, CAR_GROUPS } from './tracks/common.js';
import { buildCarModel } from './carModel.js';

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
    this.fx = { boost: 0, oil: 0, stun: 0, wet: 0, slide: 0, zap: 0 };
    this.item = null;
    this.health = 100;
    this.pullDir = Math.random() < 0.5 ? -1 : 1;
    this.steer = 0;
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
    this.steer = 0; this.airTime = 0; this.upsideTime = 0;
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
    const target = THREE.MathUtils.clamp(input.steer + (Math.abs(fwd) > 3 ? pull : 0), -1, 1) * t.steerMax / (1 + Math.abs(fwd) * t.steerFalloff);
    const ds = t.steerSpeed * dt * (Math.sign(target - this.steer) !== Math.sign(this.steer) ? 1.6 : 1);
    this.steer += THREE.MathUtils.clamp(target - this.steer, -ds, ds);
    veh.setWheelSteering(0, this.steer);
    veh.setWheelSteering(1, this.steer);

    // --- Motor / freno / marcha atrás ---
    let engine = 0, brakeF = 0, brakeR = 0;
    this.drifting = false; this.braking = false; this.reversing = false;
    const fx = this.fx;
    for (const k in fx) fx[k] = Math.max(0, fx[k] - dt);
    const stunned = fx.stun > 0;
    const zapped = fx.zap > 0;
    const thr = stunned || zapped ? 0 : input.throttle, brk = stunned ? 0 : input.brake;
    const boost = fx.boost > 0;
    const rb = (this.rubber ?? 1) * (0.72 + 0.28 * this.health / 100);
    const maxSpeed = t.maxSpeed * rb * (boost ? 1.35 : 1) * (fx.wet > 0 ? 0.7 : 1);
    const power = t.engine * rb * (0.85 + 0.15 * this.health / 100) * (boost ? 1.8 : 1);
    if (thr > 0) {
      // motor eléctrico de RC (como Re-Volt): mucho par al arrancar que cae con la velocidad
      const k = Math.max(0, fwd) / maxSpeed;
      engine = power * thr * 1.25 * Math.max(0, 1 - Math.pow(k, 1.6));
      if (fwd < -1) { brakeF = brakeR = t.brake / 4; engine *= 0.3; }
    }
    if (brk > 0) {
      if (fwd > 2) {
        if (Math.abs(input.steer) > 0.3 && fwd > 8) {
          // Freno + giro = derrape (como freno de mano)
          this.drifting = true;
          engine = t.engine * 0.55;
        } else {
          brakeF = brakeR = (t.brake / 4) * brk;
          this.braking = true;
        }
      } else if (thr === 0) {
        const lim = THREE.MathUtils.clamp((12 + fwd) / 3, 0, 1);
        engine = -t.engine * 0.55 * brk * lim;
        this.reversing = true;
      }
    }
    if (boost && thr === 0 && brk === 0) engine = power * THREE.MathUtils.clamp((maxSpeed - fwd) / (maxSpeed * 0.25), 0, 1);
    if (thr === 0 && brk === 0 && !boost) brakeF = brakeR = 0.04; // resistencia a rodar
    if (input.hold) { engine = 0; brakeF = brakeR = t.brake / 4; this.reversing = false; }
    if (fx.wet > 0 && fwd > maxSpeed) brakeF = brakeR = 0.3;
    this.throttle = thr;

    const rear = t.rearBias / 100;
    for (let i = 0; i < 4; i++) {
      const front = this.W[i].front;
      veh.setWheelEngineForce(i, ((engine * (front ? 1 - rear : rear)) / 2) * this.massK);
      veh.setWheelBrake(i, (front ? brakeF : brakeR) * this.massK);
      veh.setWheelSideFrictionStiffness(i, front ? t.sideFront : t.sideRear);
      // aceite: casi sin agarre · zona de derrape: agarre reducido pero controlable
      const oil = fx.oil > 0 ? 0.22 : fx.slide > 0 ? (front ? 0.72 : 0.5) : 1;
      veh.setWheelFrictionSlip(i, (front ? t.gripFront : t.gripRear * (this.drifting ? t.driftRear : 1)) * oil);
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
      if (!ws.contact) w = this.lastW[i] * 0.99 + (thr > 0 && !this.W[i].front ? 0.5 : 0);
      this.lastW[i] = w;
      this.spin[i] += w * dt;
    }
    this.contacts = contacts;

    // --- Ayudas arcade ---
    const m = this.mass;
    if (this.drifting) {
      // limitar el giro sobre sí mismo para que el derrape sea controlable
      const yr = b.angvel().y, lim = 2.6;
      if (Math.abs(yr) > lim) {
        const k = (Math.abs(yr) - lim) * Math.sign(yr) * 5.0 * 0.3;
        b.applyTorqueImpulse({ x: 0, y: -k, z: 0 }, true);
      }
    }
    if (contacts > 0) {
      // carga aerodinámica
      const down = t.downforce * speed * speed / 10 * m * dt;
      b.applyImpulse({ x: -this.up.x * down, y: -this.up.y * down, z: -this.up.z * down }, true);
      // estabilizador anti-vuelco suave
      _v.crossVectors(this.up, UP).multiplyScalar(7 * m * dt * (contacts / 4));
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
    if (this.up.y < 0.85 && this.up.y > -0.2 && speed < 4) {
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
      if (this.airTime > 0.25) {
        const ls = Math.min(1, this.airTime * 1.2 + Math.abs(this.velocity.y) / 30);
        this.events.push({ type: 'land', strength: ls, pos: this.currPos.clone() });
        if (ls > 0.85) this.damage((ls - 0.85) * 20, new THREE.Vector3(0, -0.15, 0), 0.3);
      }
      this.airTime = 0;
    }
    const horiz = Math.hypot(dv.x, dv.z);
    if (horiz > 5) {
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
    u.antenna.rotation.set(u.antennaBase.x + this.antenna.pitch, 0, u.antennaBase.z + this.antenna.roll);
    const brakeGlow = this.braking || this.drifting ? 3.2 : this.reversing ? 1.5 : 0.6;
    u.tailMat.emissiveIntensity += (brakeGlow - u.tailMat.emissiveIntensity) * 0.3;
    u.revMat.emissiveIntensity = this.reversing ? 2.5 : 0;
  }
}

