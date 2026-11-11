import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PROP_GROUPS, CAMERA_RAY_GROUPS } from './tracks/common.js';

export const ITEMS = {
  rocket: { icon: '🚀', name: 'Cohete' },
  rockets3: { icon: '🚀', name: 'Cohetes ×3', ammo: 3, base: 'rocket' },
  pulse: { icon: '🔌', name: 'Pulso eléctrico' },
  ball: { icon: '⚫', name: 'Bola de acero' },
  water: { icon: '💧', name: 'Bola de agua' },
  turbo: { icon: '⚡', name: 'Turbo' },
  oil: { icon: '🛢️', name: 'Aceite' },
  bomb: { icon: '💣', name: 'Bomba' },
  repair: { icon: '🔧', name: 'Reparación' },
};

const UP = new THREE.Vector3(0, 1, 0);

// Cajas de objetos, proyectiles, manchas de aceite y bombas
export class Items {
  constructor(race) {
    this.race = race;
    this.scene = race.scene;
    this.pickups = [];
    this.projectiles = [];
    this.slicks = [];
    this.bombs = new Map(); // coche -> { t, mesh, cool }
    this.pulses = [];       // auras eléctricas activas
    this.balls = [];        // bolas de acero rodando
    this.time = 0;

    // geometrías y materiales compartidos
    // caja de energía: cubo translúcido con un rayo, núcleo brillante, anillo y halo en el suelo
    const boltTex = boltTexture();
    this.boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    this.boxMat = new THREE.MeshStandardMaterial({ map: boltTex, emissive: '#ff9d00', emissiveMap: boltTex, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.78, depthWrite: false });
    this.coreGeo = new THREE.IcosahedronGeometry(0.32, 0);
    this.coreMat = new THREE.MeshBasicMaterial({ color: '#fff6c2' });
    this.ringGeo = new THREE.TorusGeometry(1.0, 0.05, 6, 24);
    this.ringMat = new THREE.MeshBasicMaterial({ color: '#ffd23f' });
    this.haloGeo = new THREE.CircleGeometry(1.5, 24).rotateX(-Math.PI / 2);
    this.haloMat = new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.pulseGeo = new THREE.IcosahedronGeometry(3.2, 2);
    this.pulseMat = new THREE.MeshBasicMaterial({ color: '#59c8ff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, wireframe: true });
    this.steelGeo = new THREE.IcosahedronGeometry(0.9, 2);
    this.steelMat = new THREE.MeshStandardMaterial({ color: '#cfd6dc', metalness: 1, roughness: 0.15 });
    this.rocketMesh = makeRocket();
    this.waterGeo = new THREE.IcosahedronGeometry(0.5, 1);
    this.waterMat = new THREE.MeshStandardMaterial({ color: '#4fc3f7', roughness: 0.05, transparent: true, opacity: 0.85, emissive: '#0b5c8a', emissiveIntensity: 0.3 });
    this.oilGeo = new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2);
    this.oilMat = new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.92, polygonOffset: true, polygonOffsetFactor: -2 });
    this.bombMesh = makeBomb();
  }

  // Pone (true) y quita (false) una copia de cada arma en la escena para compilar sus shaders antes de la carrera:
  // si no, el primer disparo de cada arma congelaba el juego un instante.
  warm(on) {
    if (on) {
      this._warm = [this.rocketMesh.clone(), new THREE.Mesh(this.waterGeo, this.waterMat), new THREE.Mesh(this.oilGeo, this.oilMat),
        new THREE.Mesh(this.pulseGeo, this.pulseMat), new THREE.Mesh(this.steelGeo, this.steelMat), this.bombMesh.clone()];
      for (const m of this._warm) { m.position.set(0, -50, 0); m.frustumCulled = false; this.scene.add(m); }
    } else if (this._warm) { for (const m of this._warm) this.scene.remove(m); this._warm = null; }
  }

  // Cajas repartidas en varios puntos de la vuelta (fracciones 0..1)
  createPickups(spots) {
    const c = this.race.circuit;
    for (const f of spots) {
      const s = c.samples[Math.floor(f * c.N) % c.N];
      for (const lane of [-0.45, 0, 0.45]) {
        const g = new THREE.Group();
        const m = new THREE.Mesh(this.boxGeo, this.boxMat);
        const core = new THREE.Mesh(this.coreGeo, this.coreMat);
        const ring = new THREE.Mesh(this.ringGeo, this.ringMat);
        const halo = new THREE.Mesh(this.haloGeo, this.haloMat);
        halo.position.y = -0.94;
        g.add(core, m, ring, halo);
        g.position.copy(s.p).addScaledVector(s.n, lane * c.width / 2);
        g.position.y = s.p.y + 1.0;
        this.scene.add(g);
        this.pickups.push({ g, m, ring, core, halo, base: g.position.clone(), respawn: 0 });
      }
    }
  }

  // cajas sueltas en puntos fijos (arena de batalla)
  createPickupsAt(points) {
    for (const p of points) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(this.boxGeo, this.boxMat), core = new THREE.Mesh(this.coreGeo, this.coreMat);
      const ring = new THREE.Mesh(this.ringGeo, this.ringMat), halo = new THREE.Mesh(this.haloGeo, this.haloMat);
      halo.position.y = -0.94;
      g.add(core, m, ring, halo);
      g.position.copy(p); g.position.y = p.y + 1.0;
      this.scene.add(g);
      this.pickups.push({ g, m, ring, core, halo, base: g.position.clone(), respawn: 0 });
    }
  }

  randomItem(car) {
    const r = this.race.positionRatio(car); // 0 = primero, 1 = último
    const w = {
      rocket: 0.5 + 1.6 * r, rockets3: 0.1 + 1.4 * r, water: 1.2, turbo: 0.7 + 1.8 * r, oil: 1.4 - r, bomb: 0.8,
      pulse: 0.5 + 0.8 * r, ball: 0.8, repair: 0.2 + 3 * (1 - car.health / 100),
    };
    let sum = 0; for (const k in w) sum += w[k];
    let x = Math.random() * sum;
    for (const k in w) { x -= w[k]; if (x <= 0) return k; }
    return 'turbo';
  }

  give(car, item) {
    car.item = item;
    car.ammo = ITEMS[item].ammo || 1;
  }

  fire(car) {
    const it = car.item;
    if (!it) return;
    car.ammo = (car.ammo || 1) - 1;
    if (car.ammo <= 0) car.item = null;
    const item = ITEMS[it].base || it;
    const R = this.race, f = car.forward, p = car.currPos;
    if (item === 'turbo') {
      car.fx.boost = 2.2;
      R.sound('turbo', p);
    } else if (item === 'repair') {
      car.repair(55);
      R.burst(p, [0.5, 1, 0.6], 24);
      R.sound('pickup', p);
    } else if (item === 'rocket') {
      const mesh = this.rocketMesh.clone();
      this.scene.add(mesh);
      const dir = new THREE.Vector3(f.x, 0, f.z).normalize();
      this.projectiles.push({
        type: 'rocket', mesh, owner: car, t: 0, pos: p.clone().addScaledVector(dir, 1.6).setY(p.y + 0.6), dir,
        speed: Math.max(55, car.speed + 25), target: this.rocketTarget(car, dir), idx: R.state(car).idx,
      });
      R.sound('rocket', p);
    } else if (item === 'water') {
      const mesh = new THREE.Mesh(this.waterGeo, this.waterMat);
      mesh.castShadow = true;
      this.scene.add(mesh);
      const v = new THREE.Vector3(f.x, 0, f.z).normalize().multiplyScalar(car.speed + 26);
      v.y = 9;
      this.projectiles.push({ type: 'water', mesh, owner: car, t: 0, pos: p.clone().addScaledVector(f, 1.5).setY(p.y + 0.9), vel: v, bounces: 0 });
      R.sound('throw', p);
    } else if (item === 'oil') {
      const pos = p.clone().addScaledVector(f, -2.2);
      const mesh = new THREE.Mesh(this.oilGeo, this.oilMat);
      mesh.scale.setScalar(2.3);
      mesh.position.set(pos.x, 0.035, pos.z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.slicks.push({ mesh, pos, t: 0, owner: car, life: 20 });
      R.sound('oil', p);
    } else if (item === 'bomb') {
      this.attachBomb(car, 4.5);
      R.sound('fuse', p);
    } else if (item === 'pulse') {
      const mesh = new THREE.Mesh(this.pulseGeo, this.pulseMat);
      mesh.position.y = 0.4;
      car.model.add(mesh);
      this.pulses.push({ car, mesh, t: 3 });
      R.sound('zap', p);
    } else if (item === 'ball') {
      const dir = new THREE.Vector3(f.x, 0, f.z).normalize();
      const pos = p.clone().addScaledVector(dir, 2.4); pos.y += 0.9;
      const body = R.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z)
        .setLinvel(dir.x * (car.speed + 14), 0, dir.z * (car.speed + 14)).setCcdEnabled(true).setLinearDamping(0.05));
      R.world.createCollider(RAPIER.ColliderDesc.ball(0.9).setDensity(6).setRestitution(0.4).setFriction(0.6).setCollisionGroups(PROP_GROUPS), body);
      const mesh = new THREE.Mesh(this.steelGeo, this.steelMat);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.balls.push({ body, mesh, t: 12 });
      R.sound('ballshot', p);
    }
  }

  attachBomb(car, t) {
    const mesh = this.bombMesh.clone();
    mesh.position.set(0, ['truck', 'jeep', 'bigfoot', 'hauler', 'crawler'].includes(car.def.style) ? 1.25 : 0.75, -0.1);
    car.model.add(mesh);
    this.bombs.set(car, { t, mesh, cool: 0.7 });
  }

  update(dt) {
    const R = this.race;
    this.time += dt;
    this.updateExtras(dt);
    // cajas
    for (const pk of this.pickups) {
      if (pk.respawn > 0) {
        pk.respawn -= dt;
        pk.g.visible = pk.respawn <= 0;
        if (pk.respawn <= 0) pk.g.scale.setScalar(0.01);
        continue;
      }
      pk.g.scale.setScalar(Math.min(1, pk.g.scale.x + dt * 3));
      pk.m.rotation.set(this.time * 0.9, this.time * 1.3, 0);
      pk.core.rotation.set(-this.time * 2, this.time * 3, 0);
      pk.ring.rotation.set(Math.PI / 2 + Math.sin(this.time * 2) * 0.3, 0, this.time * 2.5);
      pk.halo.scale.setScalar(0.85 + Math.sin(this.time * 4 + pk.base.x) * 0.15);
      pk.g.position.y = pk.base.y + Math.sin(this.time * 3 + pk.base.x) * 0.15;
      for (const car of R.cars) {
        if (car.item || this.bombs.has(car)) continue;
        if (car.currPos.distanceToSquared(pk.g.position) < 2.6 * 2.6) {
          this.give(car, this.randomItem(car));
          pk.respawn = 4;
          pk.g.visible = false;
          R.burst(pk.g.position, [1, 0.85, 0.3], 14);
          if (car === R.player) R.sound('pickup', car.currPos);
          break;
        }
      }
    }

    // proyectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.t += dt;
      let dead = false;
      if (pr.type === 'rocket') dead = this.updateRocket(pr, dt);
      else dead = this.updateWater(pr, dt);
      if (dead) { this.scene.remove(pr.mesh); this.projectiles.splice(i, 1); }
    }

    // aceite
    for (let i = this.slicks.length - 1; i >= 0; i--) {
      const sl = this.slicks[i];
      sl.t += dt;
      const fade = Math.min(1, (sl.life - sl.t) / 2);
      sl.mesh.scale.setScalar(2.3 * Math.min(1, sl.t * 4) * Math.max(0.01, fade));
      for (const car of R.cars) {
        if (car === sl.owner && sl.t < 1.2) continue;
        if (car.contacts > 0 && Math.hypot(car.currPos.x - sl.pos.x, car.currPos.z - sl.pos.z) < 2.4) {
          if (car.fx.oil < 0.5 && car === R.player) R.sound('slip', car.currPos);
          car.fx.oil = 1.3;
        }
      }
      if (sl.t > sl.life) { this.scene.remove(sl.mesh); this.slicks.splice(i, 1); }
    }

    // bombas (patata caliente)
    for (const [car, b] of [...this.bombs]) {
      b.t -= dt; b.cool -= dt;
      const blink = b.t < 1.5 ? 14 : b.t < 3 ? 7 : 3;
      b.mesh.children[0].material.emissiveIntensity = Math.sin(this.time * blink) > 0 ? 1.2 : 0.05;
      const fuse = b.mesh.children[2];
      R.effects.sparks.emit(...fuse.getWorldPosition(new THREE.Vector3()).toArray(), (Math.random() - 0.5) * 3, 3, (Math.random() - 0.5) * 3,
        { life: 0.25, size: 0.18, size1: 0.02, alpha: 1, color: [1, 0.8, 0.3], grav: 10 });
      if (car === R.player && Math.floor((b.t + dt) * blink / 3) !== Math.floor(b.t * blink / 3)) R.sound('beep', car.currPos);
      if (b.t <= 0) {
        car.model.remove(b.mesh);
        this.bombs.delete(car);
        this.explode(car.currPos.clone(), 5, 1.2);
        continue;
      }
      if (b.cool <= 0) {
        for (const o of R.cars) {
          if (o === car || this.bombs.has(o)) continue;
          if (o.currPos.distanceToSquared(car.currPos) < 2.7 * 2.7) {
            car.model.remove(b.mesh);
            this.bombs.delete(car);
            this.attachBomb(o, Math.max(b.t, 1.5));
            R.sound('pass', o.currPos);
            break;
          }
        }
      }
    }
  }

  updateExtras(dt) {
    const R = this.race;
    // auras de pulso eléctrico
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pu = this.pulses[i];
      pu.t -= dt;
      pu.mesh.rotation.set(this.time * 3, this.time * 2, 0);
      pu.mesh.scale.setScalar(0.9 + Math.sin(this.time * 25) * 0.08);
      for (const o of R.cars) {
        if (o === pu.car) continue;
        if (o.currPos.distanceToSquared(pu.car.currPos) < 6.5 * 6.5) {
          if (o.fx.zap < 0.2) R.sound('zap', o.currPos);
          o.fx.zap = Math.max(o.fx.zap, 1.5);
        }
      }
      if (Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random();
        const c = pu.car.currPos;
        R.effects.sparks.emit(c.x + Math.cos(a) * r, c.y + 0.5 + Math.random() * 1.5, c.z + Math.sin(a) * r, 0, 0, 0,
          { life: 0.15, size: 0.5, size1: 0.1, alpha: 1, color: [0.4, 0.8, 1] });
      }
      if (pu.t <= 0) { pu.car.model.remove(pu.mesh); this.pulses.splice(i, 1); }
    }
    // bolas de acero
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.t -= dt;
      const p = b.body.translation(), r = b.body.rotation();
      b.mesh.position.set(p.x, p.y, p.z);
      b.mesh.quaternion.set(r.x, r.y, r.z, r.w);
      if (b.t < 1) b.mesh.scale.setScalar(Math.max(0.01, b.t));
      if (b.t <= 0 || p.y < -5) {
        this.scene.remove(b.mesh);
        R.world.removeRigidBody(b.body);
        this.balls.splice(i, 1);
      }
    }
  }

  updateRocket(pr, dt) {
    const R = this.race, c = R.circuit;
    pr.idx = c.nearestFrom(pr.idx, pr.pos.x, pr.pos.z, 4, 12);
    const s = c.samples[pr.idx];
    // si el objetivo se queda detrás del cohete, lo suelta (así nunca da la vuelta hacia quien lo lanzó)
    let tg = pr.target;
    if (tg) {
      const dx = tg.currPos.x - pr.pos.x, dz = tg.currPos.z - pr.pos.z, d = Math.hypot(dx, dz) || 1;
      if ((dx * pr.dir.x + dz * pr.dir.z) / d < -0.2) tg = pr.target = null;
    }
    // dirección deseada: hacia el objetivo si está cerca; si no, en carrera sigue la pista y en la arena va recto
    let want;
    if (tg && tg.currPos.distanceTo(pr.pos) < 30) want = tg.currPos.clone().sub(pr.pos).setY(0).normalize();
    else if (!R.battle) {
      const a = c.samples[(pr.idx + Math.ceil(8 / c.spacing)) % c.N];
      want = a.p.clone().sub(pr.pos).setY(0).normalize();
    } else want = pr.dir.clone();
    const turn = 4 * dt;
    const ang = Math.atan2(pr.dir.z * want.x - pr.dir.x * want.z, pr.dir.dot(want));
    pr.dir.applyAxisAngle(UP, THREE.MathUtils.clamp(ang, -turn, turn));
    const step = pr.speed * dt;
    // choque con paredes y decorado (rayo en la dirección de vuelo)
    const ray = (this._ray ||= new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }));
    ray.origin = { x: pr.pos.x, y: pr.pos.y, z: pr.pos.z }; ray.dir = { x: pr.dir.x, y: 0, z: pr.dir.z };
    const hitWall = pr.t > 0.08 && R.world.castRay(ray, step + 0.4, true, undefined, CAMERA_RAY_GROUPS);
    pr.pos.addScaledVector(pr.dir, step);
    const floorY = R.battle ? 0.9 : s.p.y + 0.9;
    pr.pos.y += ((tg ? tg.currPos.y + 0.5 : Math.max(floorY, pr.pos.y - 0.5)) - pr.pos.y) * Math.min(1, dt * 4);
    pr.mesh.position.copy(pr.pos);
    pr.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pr.dir);
    // estela
    const back = pr.pos.clone().addScaledVector(pr.dir, -0.8);
    R.effects.fire.emit(back.x, back.y, back.z, -pr.dir.x * 4, 0.5, -pr.dir.z * 4, { life: 0.25, size: 0.6, size1: 0.1, alpha: 0.9, color: [1, 0.6, 0.2], drag: 3 });
    R.effects.smoke.emit(back.x, back.y, back.z, (Math.random() - 0.5), 0.8, (Math.random() - 0.5), { life: 0.9, size: 0.4, size1: 1.6, alpha: 0.25, color: [0.85, 0.85, 0.85], drag: 2 });
    // impactos (nunca contra quien lo ha lanzado)
    for (const car of R.cars) {
      if (car === pr.owner) continue;
      if (car.currPos.distanceToSquared(pr.pos) < 1.6 * 1.6) { this.explode(pr.pos.clone(), 4.5, 1, pr.owner); return true; }
    }
    if (hitWall) { this.explode(pr.pos.clone(), 4, 0.8, pr.owner); return true; }
    const lat = Math.abs((pr.pos.x - s.p.x) * s.n.x + (pr.pos.z - s.p.z) * s.n.z);
    if ((!R.battle && lat > c.width / 2 + 0.6) || pr.t > 5) { this.explode(pr.pos.clone(), 4, 0.8, pr.owner); return true; }
    return false;
  }

  updateWater(pr, dt) {
    const R = this.race;
    pr.vel.y -= 28 * dt;
    pr.pos.addScaledVector(pr.vel, dt);
    if (pr.pos.y < 0.5) {
      pr.pos.y = 0.5;
      pr.vel.y = Math.abs(pr.vel.y) * 0.45;
      pr.vel.x *= 0.8; pr.vel.z *= 0.8;
      pr.bounces++;
    }
    pr.mesh.position.copy(pr.pos);
    pr.mesh.rotation.x += dt * 8;
    const s = 1 + Math.sin(pr.t * 20) * 0.08;
    pr.mesh.scale.set(s, 1 / s, s);
    for (const car of R.cars) {
      if (car === pr.owner && pr.t < 0.4) continue;
      if (car.currPos.distanceToSquared(pr.pos) < 1.8 * 1.8) { this.splash(pr.pos); return true; }
    }
    if (pr.bounces >= 3 || pr.t > 3) { this.splash(pr.pos); return true; }
    return false;
  }

  splash(pos) {
    const R = this.race;
    for (const car of R.cars) {
      const d = car.currPos.distanceTo(pos);
      if (d < 3.4) {
        car.fx.wet = 2.5; car.fx.stun = Math.max(car.fx.stun, 0.35);
        car.body.applyTorqueImpulse({ x: 0, y: (Math.random() < 0.5 ? -1 : 1) * 14, z: 0 }, true);
        car.body.applyImpulse({ x: 0, y: 25, z: 0 }, true);
        if (car === R.player) R.shake(0.5);
      }
    }
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
      R.effects.smoke.emit(pos.x, pos.y, pos.z, Math.cos(a) * sp, 3 + Math.random() * 8, Math.sin(a) * sp,
        { life: 0.6 + Math.random() * 0.4, size: 0.35, size1: 0.8, alpha: 0.8, color: [0.45, 0.75, 1], grav: 25, drag: 0.5 });
    }
    R.sound('splash', pos);
  }

  // Objetivo del cohete: siempre un rival que esté por delante del que dispara (nunca uno de detrás).
  // En la batalla prefiere al que lleva la estrella; en carrera, al de delante en la clasificación si está a tiro.
  rocketTarget(car, dir) {
    const R = this.race, p = car.currPos;
    const inFront = (o) => { const dx = o.currPos.x - p.x, dz = o.currPos.z - p.z, d = Math.hypot(dx, dz) || 1; return { ok: (dx * dir.x + dz * dir.z) / d > 0.35 && d < 80, d }; };
    const holder = R.battleState?.holder;
    if (holder && holder !== car && inFront(holder).ok) return holder;
    const ahead = R.battle ? null : R.carAhead(car);
    if (ahead && inFront(ahead).ok) return ahead;
    let best = null, bd = Infinity;
    for (const o of R.cars) {
      if (o === car) continue;
      const f = inFront(o);
      if (f.ok && f.d < bd) { bd = f.d; best = o; }
    }
    return best;
  }

  explode(pos, radius, power, owner = null) {
    const R = this.race;
    for (const car of R.cars) {
      if (car === owner) continue; // tu propio cohete no te hace daño
      const d = car.currPos.distanceTo(pos);
      if (d > radius) continue;
      const k = 1 - d / radius;
      const dir = car.currPos.clone().sub(pos).setY(0);
      if (dir.lengthSq() < 0.01) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      dir.normalize();
      const m = 8 * power;
      car.body.applyImpulse({ x: dir.x * m * 6 * k, y: m * (9 + 6 * k), z: dir.z * m * 6 * k }, true);
      car.body.applyTorqueImpulse({ x: (Math.random() - 0.5) * 18 * k, y: (Math.random() - 0.5) * 30 * k, z: (Math.random() - 0.5) * 18 * k }, true);
      car.fx.stun = Math.max(car.fx.stun, 0.9 + 0.6 * k);
      const local = pos.clone().sub(car.currPos).applyQuaternion(car.currQuat.clone().invert()).clampLength(0, 0.9);
      car.damage(20 * k * power, local, k);
    }
    this.explosionFx(pos);
  }

  // Solo lo visual y el sonido (también se usa en la repetición)
  explosionFx(pos) {
    const R = this.race;
    R.replayRec?.event('boom', pos);
    // fuego, humo y chispas
    for (let k = 0; k < 36; k++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 8);
      R.effects.fire.emit(pos.x, pos.y + 0.3, pos.z, v.x, v.y, v.z, { life: 0.35 + Math.random() * 0.3, size: 1.4, size1: 3.5, alpha: 0.9, color: [1, 0.45 + Math.random() * 0.3, 0.12], drag: 4 });
    }
    for (let k = 0; k < 20; k++) {
      R.effects.smoke.emit(pos.x + (Math.random() - 0.5) * 2, pos.y + 0.5, pos.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 5, 2 + Math.random() * 4, (Math.random() - 0.5) * 5,
        { life: 1.2 + Math.random() * 0.8, size: 1.2, size1: 5, alpha: 0.45, color: [0.3, 0.3, 0.32], drag: 2 });
    }
    for (let k = 0; k < 30; k++) {
      R.effects.sparks.emit(pos.x, pos.y + 0.3, pos.z, (Math.random() - 0.5) * 22, 4 + Math.random() * 12, (Math.random() - 0.5) * 22,
        { life: 0.5 + Math.random() * 0.4, size: 0.3, size1: 0.05, alpha: 1, color: [1, 0.75, 0.3], grav: 30 });
    }
    R.flash(pos);
    R.shake(Math.max(0, 1 - R.player.currPos.distanceTo(pos) / 30));
    R.sound('boom', pos);
  }

  dispose() {
    for (const b of this.bombs.values()) b.mesh.parent?.remove(b.mesh);
    for (const pu of this.pulses) pu.car.model.remove(pu.mesh);
  }
}

function makeRocket() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#eeeeee', metalness: 0.4, roughness: 0.3 }));
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e53935' }));
  nose.position.z = 0.75;
  g.add(body, nose);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: '#e53935' }));
    fin.position.set(0, 0, -0.45);
    fin.rotation.z = (i * Math.PI) / 2;
    fin.translateY(0.18);
    g.add(fin);
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

function makeBomb() {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshStandardMaterial({ color: '#1b1b1f', emissive: '#ff2200', emissiveIntensity: 0.1, roughness: 0.4, flatShading: true }));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 8), new THREE.MeshStandardMaterial({ color: '#777', metalness: 0.8 }));
  cap.position.y = 0.43;
  const fuse = new THREE.Object3D();
  fuse.position.set(0.05, 0.62, 0);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 5), new THREE.MeshStandardMaterial({ color: '#c8a46e' }));
  rope.position.set(0.03, 0.52, 0); rope.rotation.z = -0.3;
  g.add(ball, cap, fuse, rope);
  ball.castShadow = true;
  return g;
}

// Icono de rayo para las cajas de energía (dibujado por código)
function boltTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 10, 64, 64, 90);
  grd.addColorStop(0, '#fff3b0'); grd.addColorStop(0.5, '#ffb300'); grd.addColorStop(1, '#e65100');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#fff8'; g.lineWidth = 6; g.strokeRect(5, 5, 118, 118);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(74, 12); g.lineTo(34, 72); g.lineTo(60, 72); g.lineTo(50, 116); g.lineTo(94, 52); g.lineTo(67, 52); g.closePath();
  g.fill();
  g.strokeStyle = '#7a3500'; g.lineWidth = 3; g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function haloTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, '#ffd23fcc'); grd.addColorStop(0.55, '#ff9d0055'); grd.addColorStop(1, '#ff9d0000');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
