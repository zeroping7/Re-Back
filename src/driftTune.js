// DRI-13: ajuste del handling de drift (solo en la disciplina Drift). Los valores se guardan aparte y se
// aplican a globalThis.__DP, que leen car.js (DRIFT) y disciplines.js (agarres). Sin cambios = valores de siempre.
import { DRIFT } from './car.js';

export const DRIFT_DEFS = [
  { g: 'Agarre', key: 'rear',  label: 'Agarre trasero (×)',          min: 0.03, max: 0.6, step: 0.01, def: 0.08 },
  { g: 'Agarre', key: 'front', label: 'Agarre delantero (×)',        min: 0.05, max: 0.8, step: 0.01, def: 0.12 },
  { g: 'Agarre', key: 'hb',    label: 'Agarre trasero derrapando',   min: 0.1,  max: 1.5, step: 0.05, def: 0.15 },
  { g: 'Agarre', key: 'latGrip', label: 'Agarre lateral propio',     min: 0,    max: 0.6, step: 0.01, def: DRIFT.latGrip },
  { g: 'Dirección', key: 'steer', label: 'Giro de ruedas (×)',       min: 0.6,  max: 1.8, step: 0.05, def: 1.15 },
  { g: 'Dirección', key: 'wMax',  label: 'Giro del coche con volante', min: 0.4, max: 2.5, step: 0.02, def: DRIFT.wMax },
  { g: 'Dirección', key: 'yawGain', label: 'Rapidez de respuesta',   min: 2,    max: 30,  step: 0.5,  def: DRIFT.yawGain },
  { g: 'Dirección', key: 'yawMax', label: 'Giro máximo (rad/s)',     min: 2,    max: 10,  step: 0.1,  def: DRIFT.yawMax },
  { g: 'Gas y ángulo', key: 'power', label: 'Gas cruza el coche',    min: 0,    max: 2.5, step: 0.05, def: DRIFT.power },
  { g: 'Gas y ángulo', key: 'thrust', label: 'Empuje del gas derrapando', min: 5, max: 90, step: 1,    def: DRIFT.thrust },
  { g: 'Gas y ángulo', key: 'vmax',  label: 'Velocidad máx. derrapando', min: 0.4, max: 1.2, step: 0.01, def: DRIFT.vmax },
  { g: 'Giroscopio', key: 'gyro',    label: 'Giroscopio (endereza)', min: 0,    max: 1,   step: 0.05, def: DRIFT.gyro },
  { g: 'Giroscopio', key: 'align',   label: 'Fuerza de alineado',    min: 0,    max: 8,   step: 0.1,  def: DRIFT.align },
  { g: 'Giroscopio', key: 'spinP',   label: 'Ángulo máx. antes de trompo', min: 0.5, max: 2.2, step: 0.05, def: DRIFT.spinP },
  { g: 'Giroscopio', key: 'spinK',   label: 'Fuerza anti-trompo',    min: 0,    max: 15,  step: 0.5,  def: DRIFT.spinK },
  { g: 'Salida', key: 'launch',      label: 'Empuje de salida',      min: 0,    max: 40,  step: 1,    def: DRIFT.launch },
  { g: 'Salida', key: 'launchV',     label: 'Velocidad fin de salida', min: 5,  max: 40,  step: 1,    def: DRIFT.launchV },
  { g: 'Salida', key: 'fishtail',    label: 'Baile de la cola',      min: 0,    max: 20,  step: 0.5,  def: DRIFT.fishtail },
  { g: 'Salida', key: 'wobHz',       label: 'Rapidez del baile',     min: 2,    max: 25,  step: 0.5,  def: DRIFT.wobHz },
  { g: 'Donut', key: 'donut',        label: 'Giro del donut',        min: 1,    max: 8,   step: 0.1,  def: DRIFT.donut },
  { g: 'Donut', key: 'donutV',       label: 'Velocidad máx. donut',  min: 2,    max: 15,  step: 0.5,  def: DRIFT.donutV },
];

const KEY = 'reback.drifttune.v2';
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
export const driftVals = {};
for (const d of DRIFT_DEFS) driftVals[d.key] = saved[d.key] ?? d.def;

export function applyDriftTune() {
  globalThis.__DP = { ...DRIFT, ...driftVals };
  const diff = {}; for (const d of DRIFT_DEFS) if (driftVals[d.key] !== d.def) diff[d.key] = driftVals[d.key];
  try { localStorage.setItem(KEY, JSON.stringify(diff)); } catch { /* sin almacenamiento */ }
  return diff;
}
export function resetDriftTune() { for (const d of DRIFT_DEFS) driftVals[d.key] = d.def; return applyDriftTune(); }
export const driftText = () => DRIFT_DEFS.map((d) => `${d.key}=${+driftVals[d.key].toFixed(3)}${driftVals[d.key] !== d.def ? '*' : ''}`).join(' ');
