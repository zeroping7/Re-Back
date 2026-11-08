import * as THREE from 'three';

// Piloto de la IA: sigue la pista con un carril propio, frena antes de las curvas,
// esquiva coches, sale de atascos y usa objetos.
export class AIDriver {
  constructor(car, circuit, { skill = 1, seed = 1 } = {}) {
    this.car = car; this.c = circuit; this.skill = skill;
    this.rand = mulberry(seed * 9973);
    this.lane = (this.rand() - 0.5) * 0.6;
    this.laneTarget = this.lane;
    this.laneTimer = 0;
    this.stuck = 0; this.reverse = 0;
    this.itemDelay = 0;
    this.input = { steer: 0, throttle: 0, brake: 0 };
  }

  update(dt, race, state) {
    const car = this.car, S = this.c.samples, N = this.c.N, W = this.c.width;
    const idx = state.idx;
    const p = car.currPos, f = car.forward;
    const speed = car.speed;

    // carril: cambia de vez en cuando
    this.laneTimer -= dt;
    if (this.laneTimer <= 0) {
      this.laneTimer = 2 + this.rand() * 4;
      this.laneTarget = (this.rand() - 0.5) * 0.7;
    }
    // esquivar coches que tengo delante
    for (const o of race.cars) {
      if (o === car) continue;
      const dx = o.currPos.x - p.x, dz = o.currPos.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 9 || dist < 0.1) continue;
      const ahead = (dx * f.x + dz * f.z) / dist;
      if (ahead < 0.6) continue;
      const s = S[idx];
      const lat = (dx * s.n.x + dz * s.n.z) / (W / 2); // posición lateral relativa del otro
      const mine = this.lane;
      this.laneTarget = THREE.MathUtils.clamp(mine + (lat > mine ? -0.5 : 0.5), -0.75, 0.75);
      this.laneTimer = 1.2;
    }
    // aceite en la pista: apartarse
    for (const sl of race.items.slicks) {
      const d = Math.hypot(sl.pos.x - p.x, sl.pos.z - p.z);
      if (d < 10) {
        const s = S[idx];
        const lat = ((sl.pos.x - p.x) * s.n.x + (sl.pos.z - p.z) * s.n.z) / (W / 2);
        if (Math.abs(lat - this.lane) < 0.5) this.laneTarget = THREE.MathUtils.clamp(this.lane + (lat > this.lane ? -0.6 : 0.6), -0.75, 0.75);
      }
    }
    this.lane += THREE.MathUtils.clamp(this.laneTarget - this.lane, -dt * 0.8, dt * 0.8);

    // punto objetivo
    const sp = this.c.spacing;
    const look = Math.max(2, Math.round((5 + speed * 0.35) / sp));
    const ts = S[(idx + look) % N];
    // en curvas, tirar hacia el interior
    const inner = ts.radius < 25 ? -ts.turn * 0.25 : 0;
    const lane = THREE.MathUtils.clamp(this.lane + inner, -0.8, 0.8);
    const tx = ts.p.x + ts.n.x * lane * W / 2, tz = ts.p.z + ts.n.z * lane * W / 2;
    const dx = tx - p.x, dz = tz - p.z;
    const ang = Math.atan2(f.z * dx - f.x * dz, f.x * dx + f.z * dz);
    let steer = THREE.MathUtils.clamp(ang * 2.6, -1, 1);

    // velocidad: no pasarse en las curvas que vienen
    const aLat = 62 * this.skill, decel = 30;
    let vAllowed = Infinity;
    const nAhead = Math.ceil(42 / sp);
    for (let j = 1; j < nAhead; j += 1) {
      const s = S[(idx + j) % N];
      const vRec = Math.sqrt(aLat * s.radius);
      const v = Math.sqrt(vRec * vRec + 2 * decel * j * sp);
      if (v < vAllowed) vAllowed = v;
    }
    let throttle = 1, brake = 0;
    if (speed > vAllowed + 5 && Math.abs(steer) < 0.3) { throttle = 0; brake = 1; }
    else if (speed > vAllowed) throttle = 0;

    // atascos: marcha atrás
    if (race.started && speed < 1.5 && !car.fx.stun) this.stuck += dt; else this.stuck = 0;
    if (this.stuck > 1.2) { this.reverse = 0.9; this.stuck = 0; }
    if (this.reverse > 0) {
      this.reverse -= dt;
      steer = -steer; throttle = 0; brake = 1;
    }

    // objetos
    this.itemDelay -= dt;
    if (car.item && this.itemDelay <= 0) {
      if (this.shouldUse(car.item, race, state)) { race.items.fire(car); this.itemDelay = 1 + this.rand() * 2; }
    }

    this.input.steer = steer; this.input.throttle = throttle; this.input.brake = brake;
    return this.input;
  }

  shouldUse(item, race, state) {
    const car = this.car, S = this.c.samples, N = this.c.N;
    if (item === 'turbo') {
      // en recta
      for (let j = 0; j < Math.ceil(32 / this.c.spacing); j++) if (S[(state.idx + j) % N].radius < 30) return false;
      return true;
    }
    if (item === 'rocket' || item === 'water') {
      for (const o of race.cars) {
        if (o === car) continue;
        const dx = o.currPos.x - car.currPos.x, dz = o.currPos.z - car.currPos.z;
        const d = Math.hypot(dx, dz);
        if (d < (item === 'rocket' ? 40 : 18) && (dx * car.forward.x + dz * car.forward.z) / d > 0.7) return true;
      }
      return this.rand() < 0.002;
    }
    if (item === 'oil') {
      for (const o of race.cars) {
        if (o === car) continue;
        const dx = o.currPos.x - car.currPos.x, dz = o.currPos.z - car.currPos.z;
        const d = Math.hypot(dx, dz);
        if (d < 16 && (dx * car.forward.x + dz * car.forward.z) / d < -0.6) return true;
      }
      return this.rand() < 0.003;
    }
    return true; // bomba: enseguida
  }
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
