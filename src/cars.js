// Coches disponibles. Los multiplicadores se aplican sobre el ajuste base (panel ⚙).
export const CARS = [
  {
    id: 'rayo', name: 'Rayo', desc: 'Buggy equilibrado', color: '#e8202a', style: 'buggy', number: '7',
    wheelR: 0.37, wheelX: 0.6, wheelZf: 0.74, wheelZr: -0.72,
    mods: { engine: 1, maxSpeed: 1, grip: 1, steer: 1, susp: 1 },
    stats: { vel: 3, acel: 3, manejo: 4 },
  },
  {
    id: 'chispa', name: 'Chispa', desc: 'Ligero y nervioso', color: '#1e88e5', style: 'buggy', number: '3',
    wheelR: 0.35, wheelX: 0.58, wheelZf: 0.72, wheelZr: -0.7,
    mods: { engine: 1.22, maxSpeed: 0.94, grip: 0.97, steer: 1.12, susp: 1 },
    stats: { vel: 2, acel: 5, manejo: 4 },
  },
  {
    id: 'flecha', name: 'Flecha', desc: 'Turismo bajo y rapidísimo', color: '#f5c518', style: 'touring', number: '1',
    wheelR: 0.32, wheelX: 0.62, wheelZf: 0.78, wheelZr: -0.76,
    mods: { engine: 1.06, maxSpeed: 1.12, grip: 1.1, steer: 0.95, susp: 1.35 },
    stats: { vel: 5, acel: 3, manejo: 3 },
  },
  {
    id: 'tanque', name: 'Tanque', desc: 'Monster truck: salta y aguanta', color: '#2e9e44', style: 'truck', number: '9',
    wheelR: 0.46, wheelX: 0.66, wheelZf: 0.74, wheelZr: -0.74,
    mods: { engine: 1.1, maxSpeed: 0.92, grip: 1.05, steer: 0.95, susp: 0.75 },
    stats: { vel: 2, acel: 4, manejo: 3 },
  },
  {
    id: 'bolido', name: 'Bólido', desc: 'Punta alta, cola suelta', color: '#8e44ad', style: 'buggy', number: '5',
    wheelR: 0.37, wheelX: 0.6, wheelZf: 0.76, wheelZr: -0.72,
    mods: { engine: 1.0, maxSpeed: 1.08, grip: 0.9, steer: 1.05, susp: 1 },
    stats: { vel: 4, acel: 3, manejo: 2 },
  },
];

export const carById = (id) => CARS.find((c) => c.id === id) || CARS[0];

// Ajuste final de un coche: base × multiplicadores (× habilidad para la IA)
export function carTuning(base, def, skill = 1) {
  const m = def.mods;
  return {
    ...base,
    engine: base.engine * m.engine * skill,
    maxSpeed: base.maxSpeed * m.maxSpeed * (0.92 + 0.08 * skill),
    gripFront: base.gripFront * m.grip,
    gripRear: base.gripRear * m.grip,
    steerMax: base.steerMax * m.steer,
    suspStiff: base.suspStiff * m.susp,
  };
}
