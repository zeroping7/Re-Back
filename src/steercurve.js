// FIS-45: dirección relativa a la velocidad (Carrera, Batalla y Drift; jugador e IA).
// f = velocidad / velocidad punta del coche. Devuelve el multiplicador de giro (k) y de rapidez del volante (r).
// 1 = el giro de antes a media velocidad. La Sensibilidad (UX-29) multiplica todo; en lento el total se limita a LOW_CAP.
export const STEER_CURVE = {
  race: { low: 1.3, top: 0.5, rateTop: 0.5 },
  drift: { low: 1.0, top: 0.75, rateTop: 0.75 },
  LOW_CAP: 1.6,
};
const lerp = (a, b, x) => a + (b - a) * Math.max(0, Math.min(1, x));
const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export function steerCurve(f, drift = false) {
  const c = drift ? STEER_CURVE.drift : STEER_CURVE.race;
  f = Math.abs(f);
  const k = f < 0.5 ? lerp(c.low, 1, sm((f - 0.25) / 0.25)) : lerp(1, c.top, sm((f - 0.5) / 0.5));
  const r = f < 0.5 ? 1 : lerp(1, c.rateTop, sm((f - 0.5) / 0.5));
  return { k, r };
}
// k·sens con el tope en lento (por encima de media velocidad no hay tope)
export const steerGain = (k, sens, f) => (Math.abs(f) < 0.5 ? Math.min(k * sens, Math.max(sens, STEER_CURVE.LOW_CAP)) : k * sens);
