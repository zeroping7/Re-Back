import * as THREE from 'three';
import { WHEEL_RAY_GROUPS } from './track.js';

// Coche RC: chasis de Rapier + controlador de vehículo por rayos (suspensión real).
// Ejes locales: +Z adelante, +Y arriba, +X izquierda.
const WHEELS = [
  { x: 0.6, z: 0.74, front: true },
  { x: -0.6, z: 0.74, front: true },
  { x: 0.6, z: -0.72, front: false },
  { x: -0.6, z: -0.72, front: false },
];
const WHEEL_R = 0.37;
const CONN_Y = -0.02;
const MASS = 8;

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _qi = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

export class Car {
  constructor(scene, world, RAPIER, tuning, color = '#e8202a') {
    this.world = world; this.RAPIER = RAPIER; this.t = tuning;
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
      .setFriction(0.15).setRestitution(0.2)
      .setMassProperties(MASS, { x: 0, y: -0.58, z: 0 }, { x: 4.2, y: 5.0, z: 3.0 }, { x: 0, y: 0, z: 0, w: 1 });
    this.collider = world.createCollider(col, body);
    this.body = body;

    const veh = world.createVehicleController(body);
    veh.indexUpAxis = 1;
    veh.setIndexForwardAxis = 2;
    WHEELS.forEach((w) => {
      veh.addWheel({ x: w.x, y: CONN_Y, z: w.z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, tuning.suspRest, WHEEL_R);
    });
    this.vehicle = veh;
    this.applyTuning();

    // ----- Modelo low-poly -----
    this.model = buildModel(color);
    this.wheelMeshes = this.model.userData.wheels;
    scene.add(this.model);
  }

  applyTuning() {
    const t = this.t, v = this.vehicle;
    for (let i = 0; i < 4; i++) {
      const front = WHEELS[i].front;
      v.setWheelSuspensionRestLength(i, t.suspRest);
      v.setWheelMaxSuspensionTravel(i, t.suspRest * 0.95);
      v.setWheelSuspensionStiffness(i, t.suspStiff);
      v.setWheelSuspensionCompression(i, t.suspComp);
      v.setWheelSuspensionRelaxation(i, t.suspRelax);
      v.setWheelMaxSuspensionForce(i, 4000);
      v.setWheelFrictionSlip(i, front ? t.gripFront : t.gripRear);
      v.setWheelSideFrictionStiffness(i, front ? t.sideFront : t.sideRear);
    }
    this.world.gravity = { x: 0, y: -t.gravity, z: 0 };
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
    const target = input.steer * t.steerMax / (1 + Math.abs(fwd) * t.steerFalloff);
    const ds = t.steerSpeed * dt * (Math.sign(target - this.steer) !== Math.sign(this.steer) ? 1.6 : 1);
    this.steer += THREE.MathUtils.clamp(target - this.steer, -ds, ds);
    veh.setWheelSteering(0, this.steer);
    veh.setWheelSteering(1, this.steer);

    // --- Motor / freno / marcha atrás ---
    let engine = 0, brakeF = 0, brakeR = 0;
    this.drifting = false; this.braking = false; this.reversing = false;
    const thr = input.throttle, brk = input.brake;
    if (thr > 0) {
      const lim = THREE.MathUtils.clamp((t.maxSpeed - fwd) / (t.maxSpeed * 0.25), 0, 1);
      engine = t.engine * thr * lim;
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
    if (thr === 0 && brk === 0) brakeF = brakeR = 0.04; // resistencia a rodar
    this.throttle = thr;

    const rear = t.rearBias / 100;
    for (let i = 0; i < 4; i++) {
      const front = WHEELS[i].front;
      veh.setWheelEngineForce(i, (engine * (front ? 1 - rear : rear)) / 2);
      veh.setWheelBrake(i, front ? brakeF : brakeR);
      veh.setWheelSideFrictionStiffness(i, front ? t.sideFront : t.sideRear);
      veh.setWheelFrictionSlip(i, front ? t.gripFront : t.gripRear * (this.drifting ? t.driftRear : 1));
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
      const steerAng = WHEELS[i].front ? this.steer : 0;
      const wheelLat = Math.cos(steerAng) * lat - Math.sin(steerAng) * fwd;
      ws.slip = ws.contact ? Math.abs(wheelLat) : 0;
      // giro visual de la rueda (con patinazo al arrancar)
      let w = fwd / WHEEL_R;
      if (thr > 0 && !WHEELS[i].front && fwd < 6) w += 25 * thr;
      if (!ws.contact) w = this.lastW[i] * 0.99 + (thr > 0 && !WHEELS[i].front ? 0.5 : 0);
      this.lastW[i] = w;
      this.spin[i] += w * dt;
    }
    this.contacts = contacts;

    // --- Ayudas arcade ---
    const m = MASS;
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
      _v.crossVectors(this.up, UP).multiplyScalar(6 * m * dt * (contacts / 4));
      b.applyTorqueImpulse({ x: _v.x, y: _v.y, z: _v.z }, true);
    } else {
      // control en el aire: cabeceo con gas/freno, giro con dirección
      const ac = t.airControl * dt;
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
        this.events.push({ type: 'land', strength: Math.min(1, this.airTime * 1.2 + Math.abs(this.velocity.y) / 30), pos: this.currPos.clone() });
      }
      this.airTime = 0;
    }
    const horiz = Math.hypot(dv.x, dv.z);
    if (horiz > 5) {
      const dir = new THREE.Vector3(-dv.x, 0, -dv.z).normalize();
      const pos = this.currPos.clone().addScaledVector(dir, 1.0); pos.y += 0.2;
      this.events.push({ type: 'hit', strength: Math.min(1, horiz / 25), pos, dir: dir.negate() });
    }
    this.lastVel.copy(this.velocity);

    // ¿volcado?
    if (this.up.y < 0.3 && this.speed < 3) this.upsideTime += dt; else this.upsideTime = 0;
  }

  render(alpha) {
    this.model.position.lerpVectors(this.prevPos, this.currPos, alpha);
    this.model.quaternion.slerpQuaternions(this.prevQuat, this.currQuat, alpha);
    const veh = this.vehicle;
    for (let i = 0; i < 4; i++) {
      const wm = this.wheelMeshes[i];
      const len = veh.wheelSuspensionLength(i) ?? this.t.suspRest;
      wm.position.set(WHEELS[i].x, CONN_Y - len, WHEELS[i].z);
      wm.rotation.y = WHEELS[i].front ? this.steer : 0;
      wm.children[0].rotation.x = this.spin[i];
    }
    const u = this.model.userData;
    u.antenna.rotation.set(u.antennaBase.x + this.antenna.pitch, 0, this.antenna.roll);
    const brakeGlow = this.braking || this.drifting ? 3.2 : this.reversing ? 1.5 : 0.6;
    u.tailMat.emissiveIntensity += (brakeGlow - u.tailMat.emissiveIntensity) * 0.3;
    u.revMat.emissiveIntensity = this.reversing ? 2.5 : 0;
  }
}

// ---------------------------------------------------------------------------
function buildModel(color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.15, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: '#232326', roughness: 0.7, flatShading: true });
  const glass = new THREE.MeshStandardMaterial({ color: '#16243a', roughness: 0.05, metalness: 0.6, flatShading: true });
  const white = new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.5, flatShading: true });
  const add = (geo, m, x, y, z) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };

  // chasis inferior
  add(new THREE.BoxGeometry(0.86, 0.14, 2.05), dark, 0, -0.04, 0);
  // carrocería en cuña
  const shell = new THREE.BoxGeometry(1.02, 0.32, 1.78, 1, 1, 2);
  shapeVerts(shell, (v) => {
    if (v.y > 0 && v.z > 0.3) v.y -= 0.17 * (v.z / 0.89);   // morro bajo
    if (v.y > 0) v.x *= 0.88;
    if (v.z > 0.8) v.x *= 0.85;
  });
  add(shell, paint, 0, 0.17, 0.02);
  // cabina
  const cab = new THREE.BoxGeometry(0.72, 0.3, 0.8);
  shapeVerts(cab, (v) => {
    if (v.y > 0) { v.x *= 0.78; if (v.z > 0) v.z -= 0.26; if (v.z < 0) v.z += 0.1; }
  });
  add(cab, glass, 0, 0.46, -0.12);
  // franja
  add(new THREE.BoxGeometry(0.2, 0.02, 0.5), white, 0, 0.62, -0.18);
  // parachoques
  add(new THREE.BoxGeometry(1.08, 0.13, 0.16), dark, 0, -0.02, 1.06);
  add(new THREE.BoxGeometry(1.0, 0.12, 0.14), dark, 0, 0.0, -1.02);
  // alerón
  add(new THREE.BoxGeometry(1.2, 0.05, 0.36), paint, 0, 0.72, -0.86);
  add(new THREE.BoxGeometry(0.05, 0.16, 0.38), dark, 0.6, 0.7, -0.86);
  add(new THREE.BoxGeometry(0.05, 0.16, 0.38), dark, -0.6, 0.7, -0.86);
  for (const x of [0.32, -0.32]) add(new THREE.BoxGeometry(0.05, 0.36, 0.12), dark, x, 0.5, -0.86);
  // faros
  const headMat = new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: '#fff2b0', emissiveIntensity: 1.2 });
  for (const x of [0.32, -0.32]) add(new THREE.BoxGeometry(0.2, 0.07, 0.04), headMat, x, 0.12, 0.92);
  const tailMat = new THREE.MeshStandardMaterial({ color: '#550000', emissive: '#ff1a1a', emissiveIntensity: 0.6 });
  for (const x of [0.33, -0.33]) add(new THREE.BoxGeometry(0.22, 0.08, 0.04), tailMat, x, 0.2, -0.88);
  const revMat = new THREE.MeshStandardMaterial({ color: '#888', emissive: '#ffffff', emissiveIntensity: 0 });
  add(new THREE.BoxGeometry(0.1, 0.06, 0.04), revMat, 0, 0.2, -0.88);
  // número lateral
  for (const s of [1, -1]) {
    const disc = add(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 10), white, s * 0.47, 0.2, -0.05);
    disc.rotation.z = Math.PI / 2;
  }

  // antena de radio (muelle)
  const antenna = new THREE.Group();
  antenna.position.set(-0.32, 0.3, -0.62);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 1.3, 5), dark);
  rod.position.y = 0.65; rod.castShadow = true;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshStandardMaterial({ color: '#ff3b30', emissive: '#ff3b30', emissiveIntensity: 0.4 }));
  tip.position.y = 1.32;
  antenna.add(rod, tip);
  g.add(antenna);

  // ruedas
  const tire = new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.9, flatShading: true });
  const rim = new THREE.MeshStandardMaterial({ color: '#f5c518', roughness: 0.35, metalness: 0.5, flatShading: true });
  const wheels = [];
  for (const w of WHEELS) {
    const pivot = new THREE.Group();
    const spin = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.32, 12), tire);
    t.rotation.z = Math.PI / 2; t.castShadow = true;
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 6), rim);
    h.rotation.z = Math.PI / 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.36), dark);
    spin.add(t, h, spoke);
    pivot.add(spin);
    pivot.position.set(w.x, CONN_Y - 0.3, w.z);
    g.add(pivot);
    wheels.push(pivot);
  }

  g.userData = { wheels, antenna, antennaBase: new THREE.Vector3(-0.12, 0, 0), tailMat, revMat };
  return g;
}

function shapeVerts(geo, fn) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); fn(v); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
}
