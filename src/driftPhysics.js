// DRI-15: física de coche de drift "de verdad pero fácil". Modelo de neumáticos por rueda (curva de agarre tipo Pacejka con
// pico y caída suave), transferencia de peso, tracción trasera con elipse de fricción (el gas le quita agarre lateral a las traseras:
// sobreviraje de potencia), freno de mano y contravolante asistido. Ejes locales: +Z adelante, +X izquierda, giro + = izquierda.
// Todo en aceleraciones (fuerza por unidad de masa); se aplica con impulsos sobre el chasis y el torque solo en vertical.
import * as THREE from 'three';

export const DRIFT = {
  // neumáticos
  muF: 1.3,       // agarre máx. delantero (veces la gravedad)
  muR: 0.95,       // agarre máx. trasero
  B: 8,           // rigidez del neumático (más = pico a menos ángulo)
  C: 1.1,         // forma: más bajo = cae menos tras el pico
  slideK: 0.9,    // agarre al patinar del todo (rueda bloqueada)
  slideDrive: 1.2, // empuje de una rueda motriz que patina (× agarre): el gas sostiene el derrape
  launchK: 0.3,   // agarre extra de las traseras a poca velocidad (salidas)
  bLim: 1.0,     // ángulo de deriva (rad) a partir del cual el coche se endereza solo
  esc: 40,        // fuerza de ese enderezado
  // motor y frenos
  power: 26,      // aceleración máx. (u/s²)
  vtop: 1.0,      // velocidad punta (× la del coche)
  brake: 24,      // frenada máx. (u/s²)
  bias: 0.62,     // reparto de freno delantero
  hbGrip: 0.45,    // agarre lateral que conservan las traseras con el freno de mano
  hbK: 0.25,      // frenada del freno de mano (× agarre trasero)
  // dirección
  lock0: 0.62,    // ángulo máx. de las ruedas parado (rad)
  lockMin: 0.3,   // ... a mucha velocidad
  lockV: 14,      // velocidad a la que el ángulo baja a la mitad
  steerRate: 5,   // rapidez del volante (rad/s)
  assist: 0.9,    // contravolante automático (0-1)
  asFrom: 0.1,    // deriva (rad) a partir de la cual empieza el contravolante
  asTo: 0.3,      // ... y a la que ya es completo
  // peso y estabilidad
  cgH: 0.45,      // altura del centro de gravedad (más = más transferencia de peso)
  yawDamp: 0.5,   // amortiguación del giro
  drag1: 0.08, drag2: 0.004, // resistencia del aire y rodadura
  donutV: 7,      // velocidad máx. del donut (u/s)
  donutGrip: 0.35, // agarre lateral trasero en el donut
  slow: 1.2,      // velocidad (u/s) por debajo de la cual el ángulo de deriva se suaviza
};

const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const sm = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Curva de agarre (0..1) según el ángulo de deriva del neumático
function pac(a, B, C) { const x = B * a; return Math.sin(C * Math.atan(x)); }

export function driftForces(car, dt, input, c) {
  const D = globalThis.__DP || DRIFT;
  const b = car.body, m = car.mass, W = car.W, lv = car.localVel, fx = car.fx;
  const g = -car.world.gravity.y;
  const st = THREE.MathUtils.clamp(input.steer, -1, 1);
  const thr = c.thr, brk = c.brk, fwd = lv.z, speed = c.speed;
  const av = b.angvel(), w = av.x * car.up.x + av.y * car.up.y + av.z * car.up.z; // giro sobre el eje vertical del coche

  // --- Volante: ángulo de las ruedas delanteras, con contravolante automático ---
  const lock = D.lockMin + (D.lock0 - D.lockMin) / (1 + (speed / D.lockV) * (speed / D.lockV));
  const target = st * lock;
  car._din = (car._din || 0);
  car._din += THREE.MathUtils.clamp(target - car._din, -D.steerRate * dt, D.steerRate * dt);
  const zf = W[0].z, zr = W[2].z, L = zf - zr, T = 2 * Math.abs(W[0].x);
  let dAl = 0;
  if (fwd > 3) dAl = Math.atan2(lv.x + w * zf, fwd); // hacia dónde va realmente el eje delantero
  const wa = D.assist * sm(D.asFrom, D.asTo, Math.abs(dAl));
  const dF = THREE.MathUtils.clamp(car._din + wa * dAl, -0.95, 0.95);
  car.steer = dF; // las ruedas se ven en contravolante

  // --- Reparto de peso (estático + transferencia por la aceleración del paso anterior) ---
  const ax = car._ax || 0, ay = car._ay || 0; // aceleraciones locales (z longitudinal, x lateral)
  const fF = THREE.MathUtils.clamp(-zr / L - (ax / g) * (D.cgH / L), 0.12, 0.88);
  const latShift = THREE.MathUtils.clamp((ay / g) * (D.cgH / T), -0.3, 0.3);
  const gm = (fx.oil > 0 ? 0.2 : 1) * (fx.slide > 0 ? 0.7 : 1) * (fx.sand > 0 ? 0.75 : 1) * (fx.wet > 0 ? 0.85 : 1);

  // --- Mandos: motor, freno, marcha atrás, freno de mano ---
  const hold = !!input.hold;
  const hb = brk > 0.3 && Math.abs(st) > 0.3 && fwd > 1 && !hold; // freno + giro = freno de mano
  const braking = brk > 0 && fwd > 1.5 && !hb;
  const reversing = brk > 0 && thr === 0 && fwd <= 1.5 && !hold;
  car.braking = braking; car.reversing = reversing;
  // donut: parado (o muy despacio) con gas y volante a tope las traseras patinan y el coche gira sobre sí mismo
  const donut = thr > 0.5 && Math.abs(st) > 0.6 && !hb && speed < D.donutV ? 1 : 0;
  const vTop = c.maxSpeed * D.vtop;
  let drive = 0;
  if (thr > 0 && !hold) {
    const k = THREE.MathUtils.clamp(Math.max(fwd, 0) / vTop, 0, 1);
    drive = D.power * c.powerK * thr * (1 - Math.pow(k, 1.6)) * (donut ? 0.45 : 1);
  } else if (reversing) {
    drive = -D.power * 0.45 * brk * THREE.MathUtils.clamp((8 + fwd) / 3, 0, 1);
  }
  const brakeTot = hold ? D.brake : braking ? D.brake * brk : 0;

  let Fxl = 0, Fzl = 0, tau = 0, slipR = 0, spin = 0;
  for (let i = 0; i < 4; i++) {
    const ws = car.wheelState[i], wh = W[i];
    if (!ws.contact) { ws.slip = 0; continue; }
    const front = wh.front, left = wh.x > 0;
    const N = g * (front ? fF : 1 - fF) * (left ? 0.5 - latShift : 0.5 + latShift);
    const cap = Math.max(0.01, (front ? D.muF : D.muR * (1 + D.launchK * THREE.MathUtils.clamp(1 - speed / 12, 0, 1) * (1 - sm(0.3, 0.7, Math.abs(st))))) * N * gm);
    const d = front ? dF : 0, sn = Math.sin(d), cs = Math.cos(d);
    const vxp = lv.x + w * wh.z, vzp = lv.z - w * wh.x; // velocidad del punto de contacto
    const vl = vxp * sn + vzp * cs, vt = vxp * cs - vzp * sn; // en ejes de la rueda: longitudinal y lateral
    // fuerza longitudinal pedida
    let req = 0, braked = false;
    if (!front) req += drive / 2;
    let latK = donut && !front ? D.donutGrip : 1;
    if (hb && !front && thr > 0.5) latK = D.hbGrip; // freno de mano + gas: las traseras patinan y siguen empujando (donut / trompo)
    else if (hb && !front) { req = -Math.sign(vl || 1) * cap * D.hbK; braked = true; latK = 1 - (1 - D.hbGrip) * (1 - sm(0.45, 0.8, Math.abs(Math.atan2(lv.x, Math.max(fwd, 1))))); }
    else if (brakeTot > 0) { req -= Math.sign(vl) * brakeTot * (front ? D.bias : 1 - D.bias) / 2; braked = true; }
    else if (hold) req = 0;
    // límite de agarre: si se pide más, la rueda patina (gira en el sitio o se bloquea)
    let Fx = req, ratio = Math.abs(req) / cap;
    if (ratio > 1) { const kk = req * vl < 0 || braked ? D.slideK : D.slideDrive; Fx = Math.sign(req) * cap * kk; ratio = 0.93; }
    // no pasarse al frenar (no invertir la marcha en un solo paso)
    if (braked && Fx * vl < 0) { const mx = Math.abs(vl) * 0.35 / dt; if (Math.abs(Fx) > mx) Fx = Math.sign(Fx) * mx; }
    // fuerza lateral: curva de agarre × lo que queda del círculo de fricción
    const al = Math.atan2(vt, Math.abs(vl) + D.slow);
    let Fy = -cap * latK * pac(al, D.B, D.C) * Math.sqrt(Math.max(0, 1 - ratio * ratio));
    const my = Math.abs(vt) * 0.3 / dt; if (Math.abs(Fy) > my) Fy = Math.sign(Fy) * my;
    const fxl = Fx * sn + Fy * cs, fzl = Fx * cs - Fy * sn;
    Fxl += fxl; Fzl += fzl; tau += wh.z * fxl - wh.x * fzl;
    ws.slip = Math.abs(vt) + (!front && ratio >= 0.93 ? 6 : 0);
    if (!front) { slipR = Math.max(slipR, Math.abs(al)); if (thr > 0 && ratio > 0.8) spin = Math.max(spin, THREE.MathUtils.clamp((ratio - 0.8) / 0.2, 0, 1)); }
  }
  // resistencia del aire y rodadura
  const dr = D.drag1 + D.drag2 * speed;
  const ex = -dr * lv.x, ez = -dr * lv.z;
  car._ax += (Fzl - car._ax) * 0.3; car._ay += (Fxl - car._ay) * 0.3;
  car.launch = speed < 14 ? spin : 0;
  car.drifting = slipR > 0.22 && speed > 3;

  // --- Aplicar ---
  const r = b.rotation(); _q.set(r.x, r.y, r.z, r.w);
  _v.set(Fxl + ex, 0, Fzl + ez).applyQuaternion(_q);
  b.applyImpulse({ x: _v.x * m * dt, y: _v.y * m * dt, z: _v.z * m * dt }, true);
  const Iy = 5.0 * car.massK;
  let ang = m * tau * dt - D.yawDamp * w * Iy * dt;
  // estabilidad: pasado cierto ángulo de deriva el coche se endereza solo (no hay trompos ni espirales por mantener el volante)
  if ((thr > 0 || fwd > 3) && fwd > -2) { const be = Math.atan2(lv.x, Math.max(fwd, 0.01)), ex2 = Math.abs(be) - D.bLim; if (ex2 > 0) ang += Math.sign(be) * ex2 * D.esc * Iy * dt * sm(2, 6, speed); }
  b.applyTorqueImpulse({ x: car.up.x * ang, y: car.up.y * ang, z: car.up.z * ang }, true);
}
