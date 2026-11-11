// COC-07: medidores de los coches calculados de lo que mide la física (tests/carprobe.mjs → src/carperf.js).
// Cada medida pasa a una escala fija 1-5 con decimales, igual en tarjetas y garaje. Las mejoras mueven la medida con su fórmula.
import PERF from './carperf.js';

// [valor que da 1, valor que da 5] por disciplina
export const SCALES = {
  race: { vel: [24, 33], acel: [0.90, 0.62], man: [33, 58] },   // punta (u/s) · 0→15 u/s (s) · aceleración lateral a medio volante (u/s²)
  drift: { vel: [22, 28], acel: [0.92, 0.60], man: [1.8, 2.8] }, // punta · 0→15 u/s · guiñada 0,4 s tras girar el volante a 14 u/s (rad/s)
};
const lin = (x, [a, b]) => Math.max(1, Math.min(5, 1 + (4 * (x - a)) / (b - a)));

// Medidas con las mejoras aplicadas (up = niveles 0..3 de 'motor', 'punta', 'ruedas', 'direccion')
export function carMeasures(def, disc, up = {}) {
  const P = PERF[disc]?.[def.id];
  if (!P) return null;
  const L = (k) => up[k] || 0;
  return {
    vel: P.vmax * (1 + 0.045 * L('punta')),
    acel: P.t15 * Math.pow(1 + 0.07 * L('motor'), -1.2),
    man: disc === 'drift' ? P.yaw * (1 + 0.05 * L('direccion')) : P.a50 * (1 + 0.05 * L('ruedas')) * (1 + 0.05 * L('direccion')),
  };
}

// { vel, acel, manejo } de 1 a 5 (decimales). Sin medidas (Obstáculos) se usa la ficha `stats` de siempre.
export function carStats(def, disc = 'race', up = {}) {
  const m = carMeasures(def, disc, up);
  if (!m) return { ...def.stats, measured: false };
  const S = SCALES[disc];
  return { vel: lin(m.vel, S.vel), acel: lin(m.acel, S.acel), manejo: lin(m.man, S.man), measured: true };
}
