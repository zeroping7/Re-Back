// DRI-13: ajuste del handling de drift (solo en la disciplina Drift). Los valores se guardan aparte y se
// aplican a globalThis.__DP, que leen car.js (DRIFT) y disciplines.js (agarres). Sin cambios = valores de siempre.
import { DRIFT } from './car.js';

export const DRIFT_DEFS = [
  { g: 'Neumáticos', key: 'muF', label: 'Agarre delantero', min: 0.6, max: 2.2, step: 0.05, def: DRIFT.muF },
  { g: 'Neumáticos', key: 'muR', label: 'Agarre trasero', min: 0.5, max: 2.2, step: 0.05, def: DRIFT.muR },
  { g: 'Neumáticos', key: 'B', label: 'Rigidez del neumático', min: 3, max: 16, step: 0.5, def: DRIFT.B },
  { g: 'Neumáticos', key: 'C', label: 'Caída tras el pico (↓ cae menos)', min: 1.0, max: 1.6, step: 0.02, def: DRIFT.C },
  { g: 'Neumáticos', key: 'launchK', label: 'Agarre extra en las salidas', min: 0, max: 1, step: 0.05, def: DRIFT.launchK },
  { g: 'Motor y frenos', key: 'power', label: 'Potencia (u/s²)', min: 8, max: 50, step: 1, def: DRIFT.power },
  { g: 'Motor y frenos', key: 'vtop', label: 'Velocidad punta (×)', min: 0.5, max: 1.3, step: 0.02, def: DRIFT.vtop },
  { g: 'Motor y frenos', key: 'brake', label: 'Frenada (u/s²)', min: 8, max: 50, step: 1, def: DRIFT.brake },
  { g: 'Motor y frenos', key: 'slideDrive', label: 'Empuje al patinar (×)', min: 0.6, max: 1.8, step: 0.05, def: DRIFT.slideDrive },
  { g: 'Freno de mano', key: 'hbGrip', label: 'Agarre trasero con freno de mano', min: 0.1, max: 1, step: 0.05, def: DRIFT.hbGrip },
  { g: 'Freno de mano', key: 'hbK', label: 'Frenada del freno de mano', min: 0, max: 1, step: 0.05, def: DRIFT.hbK },
  { g: 'Dirección', key: 'lock0', label: 'Giro de ruedas parado (rad)', min: 0.2, max: 0.9, step: 0.02, def: DRIFT.lock0 },
  { g: 'Dirección', key: 'lockMin', label: 'Giro de ruedas a toda velocidad (rad)', min: 0.1, max: 0.6, step: 0.02, def: DRIFT.lockMin },
  { g: 'Dirección', key: 'lockV', label: 'Velocidad a la que baja el giro', min: 4, max: 30, step: 1, def: DRIFT.lockV },
  { g: 'Dirección', key: 'steerRate', label: 'Rapidez del volante', min: 1, max: 12, step: 0.5, def: DRIFT.steerRate },
  { g: 'Dirección', key: 'assist', label: 'Contravolante automático', min: 0, max: 1, step: 0.05, def: DRIFT.assist },
  { g: 'Dirección', key: 'asFrom', label: 'Deriva donde empieza el contravolante (rad)', min: 0.02, max: 0.6, step: 0.02, def: DRIFT.asFrom },
  { g: 'Dirección', key: 'asTo', label: 'Deriva donde es completo (rad)', min: 0.1, max: 1.2, step: 0.02, def: DRIFT.asTo },
  { g: 'Donut', key: 'donutV', label: 'Velocidad máx. del donut', min: 2, max: 15, step: 0.5, def: DRIFT.donutV },
  { g: 'Donut', key: 'donutGrip', label: 'Agarre trasero en el donut', min: 0.05, max: 1, step: 0.05, def: DRIFT.donutGrip },
  { g: 'Peso y estabilidad', key: 'cgH', label: 'Altura del centro de gravedad', min: 0.1, max: 1, step: 0.05, def: DRIFT.cgH },
  { g: 'Peso y estabilidad', key: 'yawDamp', label: 'Amortiguación del giro', min: 0, max: 3, step: 0.1, def: DRIFT.yawDamp },
  { g: 'Peso y estabilidad', key: 'bLim', label: 'Ángulo máx. antes de enderezar (rad)', min: 0.5, max: 1.5, step: 0.02, def: DRIFT.bLim },
  { g: 'Peso y estabilidad', key: 'esc', label: 'Fuerza del enderezado', min: 0, max: 120, step: 2, def: DRIFT.esc },
];

const KEY = 'reback.drifttune.v4';
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
