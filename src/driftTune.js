// DRI-13: ajuste del handling de drift (solo en la disciplina Drift). Los valores se guardan aparte y se
// aplican a globalThis.__DP, que leen car.js (DRIFT) y disciplines.js (agarres). Sin cambios = valores de siempre.
import { DRIFT } from './car.js';

export const DRIFT_DEFS = [
  { g: 'Agarre', key: 'rear',  label: 'Agarre trasero (×)',          min: 0.03, max: 0.6, step: 0.01, def: 0.08 },
  { g: 'Agarre', key: 'front', label: 'Agarre delantero (×)',        min: 0.05, max: 0.8, step: 0.01, def: 0.12 },
  { g: 'Agarre', key: 'hb',    label: 'Agarre trasero con freno de mano', min: 0.1, max: 1.5, step: 0.05, def: 0.15 },
  { g: 'Agarre', key: 'grip',  label: 'Agarre lateral (u/s²)',       min: 4,    max: 30,  step: 0.5,  def: DRIFT.grip },
  { g: 'Ángulo', key: 'bMax',  label: 'Ángulo máximo (rad)',         min: 0.4,  max: 1.5, step: 0.02, def: DRIFT.bMax },
  { g: 'Ángulo', key: 'angK',  label: 'Rapidez al coger ángulo',     min: 1,    max: 8,   step: 0.2,  def: DRIFT.angK },
  { g: 'Ángulo', key: 'gas',   label: 'Cuánto abre el ángulo el gas', min: 0,   max: 1,   step: 0.05, def: DRIFT.gas },
  { g: 'Ángulo', key: 'spinA', label: 'Ángulo del trompo (rad)',     min: 0.8,  max: 1.6, step: 0.02, def: DRIFT.spinA },
  { g: 'Ángulo', key: 'spinK', label: 'Fuerza del trompo',           min: 0,    max: 15,  step: 0.5,  def: DRIFT.spinK },
  { g: 'Dirección', key: 'steer', label: 'Giro de ruedas (×)',       min: 0.6,  max: 1.8, step: 0.05, def: 1.15 },
  { g: 'Dirección', key: 'wMax',  label: 'Giro a poca velocidad',    min: 0.4,  max: 2.5, step: 0.02, def: DRIFT.wMax },
  { g: 'Dirección', key: 'yawGain', label: 'Rapidez de respuesta',   min: 2,    max: 30,  step: 0.5,  def: DRIFT.yawGain },
  { g: 'Dirección', key: 'yawMax', label: 'Giro máximo (rad/s)',     min: 2,    max: 10,  step: 0.1,  def: DRIFT.yawMax },
  { g: 'Empuje', key: 'thrust', label: 'Empuje del gas derrapando',  min: 5,    max: 90,  step: 1,    def: DRIFT.thrust },
  { g: 'Empuje', key: 'vmax',  label: 'Velocidad máx. derrapando',   min: 0.4,  max: 1.2, step: 0.01, def: DRIFT.vmax },
  { g: 'Empuje', key: 'eng',   label: 'Empuje de las traseras de lado', min: 0, max: 1,   step: 0.05, def: DRIFT.eng },
  { g: 'Empuje', key: 'aim',   label: 'Empuje hacia la nariz (curva)', min: 0,  max: 1,   step: 0.05, def: DRIFT.aim },
  { g: 'Salida', key: 'launch',      label: 'Empuje de salida',      min: 0,    max: 40,  step: 1,    def: DRIFT.launch },
  { g: 'Salida', key: 'launchV',     label: 'Velocidad fin de salida', min: 5,  max: 40,  step: 1,    def: DRIFT.launchV },
  { g: 'Salida', key: 'fishtail',    label: 'Baile de la cola',      min: 0,    max: 20,  step: 0.5,  def: DRIFT.fishtail },
  { g: 'Salida', key: 'wobHz',       label: 'Rapidez del baile',     min: 2,    max: 25,  step: 0.5,  def: DRIFT.wobHz },
  { g: 'Donut', key: 'donut',        label: 'Giro del donut',        min: 1,    max: 8,   step: 0.1,  def: DRIFT.donut },
  { g: 'Donut', key: 'donutV',       label: 'Velocidad máx. donut',  min: 2,    max: 15,  step: 0.5,  def: DRIFT.donutV },
];

const KEY = 'reback.drifttune.v3';
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
