import * as THREE from 'three';

// COC-23: humo de escape de los coches de nitro según las revoluciones del motor.
//  · ralentí: sale algo de humo, suave
//  · al subir las vueltas: sale menos humo pero con más fuerza (más velocidad de salida)
//  · a partir de 1/3 de las vueltas: nada de humo
//  · al volver a bajar de 1/3: empieza el ciclo otra vez
// Sale por la boca de cada escape del modelo (`model.userData.exhausts`, ver carModel.js).

export const RPM_IDLE = 0.04;   // vueltas de ralentí (el sonido nitro nunca baja de aquí)
export const RPM_CUT = 1 / 3;   // por encima no sale humo
const PUFFS_IDLE = 24;          // bocanadas por segundo y escape a ralentí
const SMOKE = [0.84, 0.86, 0.9]; // gris azulado claro del aceite quemado

// Vueltas del motor: 0 ralentí … 1 tope (hasta 1,2). Misma fórmula que el sonido nitro del jugador (audio.js)
// para que el humo y el motor vayan a la vez: siguen a la velocidad, suben rápido y bajan despacio,
// y se disparan en el aire o con las ruedas patinando. `slip` = mismo valor que recibe el sonido.
export function engineRpm(car, dt, slip = 0) {
  const thr = Math.min(1, Math.abs(car.throttle || 0));
  const spd = Math.min(1.15, (car.speed || 0) / Math.max(5, car.t.maxSpeed));
  let target = spd * 0.88 + thr * 0.14;
  if ((car.contacts === 0 || slip > 6) && thr > 0.3) target = Math.max(target, 0.75 + thr * 0.3);
  target = Math.max(target, RPM_IDLE);
  if (car.fx.zap > 0) target = 0; // sin motor (pulso)
  car.rpm += (target - car.rpm) * Math.min(1, (target > car.rpm ? 5 : 2.6) * dt);
  return Math.min(1.2, car.rpm);
}

// Curva del humo: k 0 (ralentí) … 1 (vueltas de corte). Devuelve null si no sale humo.
//  amount: cantidad (1 → 0)    force: velocidad de salida (u/s)
export function smokeAt(rpm) {
  if (!(rpm < RPM_CUT)) return null;
  const k = Math.min(1, Math.max(0, (rpm - RPM_IDLE) / (RPM_CUT - RPM_IDLE)));
  return { k, amount: Math.pow(1 - k, 1.4), force: 1.0 + 5.0 * k };
}

const _p = new THREE.Vector3(), _d = new THREE.Vector3();
const rnd = (a) => (Math.random() * 2 - 1) * a;

// Un paso fijo: actualiza las vueltas y echa las bocanadas por todos los escapes del coche.
// near: el coche está cerca del jugador (si no, solo se siguen las vueltas) · hidden: no emitir (cámara pegada al escape)
export function updateExhaust(car, particles, dt, { slip = 0, near = true, hidden = false } = {}) {
  if (car.def.motor !== 'Nitro') return 0;
  const rpm = engineRpm(car, dt, slip);
  const list = car.model.userData.exhausts;
  if (!near || hidden || !list?.length) return 0;
  const s = smokeAt(rpm);
  if (!s) return 0;
  const q = car.currQuat, v = car.velocity;
  let n = 0;
  for (const e of list) {
    if (Math.random() >= s.amount * PUFFS_IDLE * dt) continue;
    _p.copy(e.pos).applyQuaternion(q).add(car.currPos);
    _d.copy(e.dir).applyQuaternion(q);
    const f = s.force * (0.85 + Math.random() * 0.3), j = 0.2 + 0.3 * s.k;
    particles.emit(_p.x + rnd(0.02), _p.y, _p.z + rnd(0.02),
      v.x * 0.4 + _d.x * f + rnd(j), v.y * 0.4 + _d.y * f + rnd(j * 0.5), v.z * 0.4 + _d.z * f + rnd(j),
      {
        life: 1.25 - 0.55 * s.k + Math.random() * 0.3,
        size: 0.12 + 0.05 * s.k, size1: (1.7 - 0.7 * s.k) * (0.8 + Math.random() * 0.4),
        alpha: 0.5 - 0.15 * s.k, color: SMOKE, grav: -0.9, drag: 1.6 + 1.2 * s.k,
      });
    n++;
  }
  return n;
}
