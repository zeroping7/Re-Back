// Coches disponibles. Los multiplicadores se aplican sobre el ajuste base (panel ⚙).
export const CARS = [
  {
    id: 'rayo', price: 2500, name: 'Rayo', desc: 'Buggy equilibrado', color: '#e8202a', style: 'buggy', number: '7',
    clase: 'Aficionado', motor: 'Eléctrico', mass: 8,
    wheelR: 0.37, wheelX: 0.6, wheelZf: 0.74, wheelZr: -0.72,
    mods: { engine: 1, maxSpeed: 1, grip: 1, steer: 1, susp: 1 },
    stats: { vel: 3, acel: 3, manejo: 4 },
  },
  {
    id: 'chispa', price: 1500, name: 'Chispa', desc: 'Ligero y nervioso', color: '#1e88e5', style: 'buggy', number: '3',
    clase: 'Aficionado', motor: 'Eléctrico', mass: 7,
    wheelR: 0.35, wheelX: 0.58, wheelZf: 0.72, wheelZr: -0.7,
    mods: { engine: 1.22, maxSpeed: 0.94, grip: 0.97, steer: 1.12, susp: 1 },
    stats: { vel: 2, acel: 5, manejo: 4 },
  },
  {
    id: 'flecha', price: 7500, name: 'Flecha', desc: 'Turismo bajo y rapidísimo', color: '#f5c518', style: 'touring', number: '1',
    clase: 'Semi-pro', motor: 'Eléctrico', mass: 8, rearBias: 70,
    wheelR: 0.32, wheelX: 0.62, wheelZf: 0.78, wheelZr: -0.76,
    mods: { engine: 1.06, maxSpeed: 1.12, grip: 1.1, steer: 0.95, susp: 1.35 },
    stats: { vel: 5, acel: 3, manejo: 3 },
  },
  {
    id: 'tanque', price: 3000, name: 'Tanque', desc: 'Monster truck: salta y aguanta', color: '#2e9e44', style: 'truck', number: '9', pattern: 'flames',
    clase: 'Avanzado', motor: 'Nitro', mass: 11, rearBias: 50,
    wheelR: 0.46, wheelX: 0.66, wheelZf: 0.74, wheelZr: -0.74,
    mods: { engine: 1.1, maxSpeed: 0.92, grip: 1.05, steer: 0.95, susp: 0.75 },
    stats: { vel: 2, acel: 4, manejo: 3 },
  },
  {
    id: 'bolido', price: 5500, name: 'Bólido', desc: 'Punta alta, cola suelta', color: '#8e44ad', style: 'buggy', number: '5',
    clase: 'Semi-pro', motor: 'Nitro', mass: 8,
    wheelR: 0.37, wheelX: 0.6, wheelZf: 0.76, wheelZr: -0.72,
    mods: { engine: 1.0, maxSpeed: 1.08, grip: 0.9, steer: 1.05, susp: 1 },
    stats: { vel: 4, acel: 3, manejo: 2 },
  },
  {
    id: 'formula', price: 10000, name: 'Fórmula', desc: 'Monoplaza: se pega en curva', color: '#d50000', style: 'f1', number: '1', rimColor: '#ffd400',
    clase: 'Pro', motor: 'Nitro', mass: 7.5, rearBias: 100,
    wheelR: 0.34, wheelX: 0.64, wheelZf: 0.9, wheelZr: -0.68,
    mods: { engine: 1.05, maxSpeed: 1.1, grip: 1.22, steer: 1.0, susp: 1.5 },
    stats: { vel: 5, acel: 3, manejo: 5 },
  },
  {
    id: 'rally', price: 4000, name: 'Rally', desc: 'Compacto, ágil en tierra', color: '#0d47a1', style: 'rally', number: '4', pattern: 'rally', rimColor: '#ffffff',
    clase: 'Avanzado', motor: 'Nitro', mass: 8.5, rearBias: 60,
    wheelR: 0.35, wheelX: 0.6, wheelZf: 0.74, wheelZr: -0.72,
    mods: { engine: 1.1, maxSpeed: 1.0, grip: 1.0, steer: 1.1, susp: 0.9 },
    stats: { vel: 3, acel: 4, manejo: 4 },
  },
  {
    id: 'furgo', price: 600, name: 'Furgo', desc: 'Furgoneta de pizzas: tranquila pero dura', color: '#fafafa', style: 'van', number: '8', pattern: 'pizza', rimColor: '#9e9e9e',
    clase: 'Novato', motor: 'Eléctrico', mass: 10,
    wheelR: 0.35, wheelX: 0.6, wheelZf: 0.7, wheelZr: -0.72,
    mods: { engine: 0.95, maxSpeed: 0.92, grip: 1.0, steer: 0.92, susp: 0.85 },
    stats: { vel: 2, acel: 2, manejo: 2 },
  },
  {
    id: 'pulga', price: 600, name: 'Pulga', desc: 'Bichito redondo, acelera como un rayo', color: '#ff4081', style: 'bubble', number: '2', pattern: 'dots', rimColor: '#ffffff',
    clase: 'Novato', motor: 'Eléctrico', mass: 6.5,
    wheelR: 0.3, wheelX: 0.52, wheelZf: 0.56, wheelZr: -0.56,
    mods: { engine: 1.1, maxSpeed: 0.88, grip: 1.0, steer: 1.1, susp: 1 },
    stats: { vel: 1, acel: 4, manejo: 4 },
  },
];

// ordenados de más barato a más caro
CARS.sort((a, b) => a.price - b.price);

export const carById = (id) => CARS.find((c) => c.id === id) || CARS[0];

// Clases (como en las ligas de coches RC) y rivales según la dificultad
export const CLASSES = ['Novato', 'Aficionado', 'Avanzado', 'Semi-pro', 'Pro'];
export function rivalPool(diff) {
  const lo = diff < 0.9 ? 0 : diff < 1 ? 1 : 2, hi = lo === 2 ? 4 : lo + 1;
  return CARS.filter((c) => { const k = CLASSES.indexOf(c.clase); return k >= lo && k <= hi; });
}
// Texto de la tracción para la ficha
export function tractionName(def, base = 90) {
  const r = def.rearBias ?? base;
  return r >= 100 ? 'Trasera' : r <= 0 ? 'Delantera' : `4x4 · ${Math.round(r)} % detrás`;
}

// Ajuste final de un coche: base × multiplicadores (× habilidad para la IA)
// Mejoras compradas en el garaje: niveles 0..3 por categoría
export const UPGRADES = [
  { id: 'motor', name: 'Motor', icon: '⚙️', desc: '+7 % aceleración por nivel' },
  { id: 'punta', name: 'Velocidad punta', icon: '💨', desc: '+4,5 % velocidad máx. por nivel' },
  { id: 'ruedas', name: 'Neumáticos', icon: '🛞', desc: '+5 % agarre por nivel' },
  { id: 'direccion', name: 'Dirección', icon: '🎯', desc: '+5 % giro y respuesta por nivel' },
];
export const MAX_LEVEL = 3;

export function carTuning(base, def, skill = 1, up = {}) {
  const m = def.mods, L = (k) => up[k] || 0;
  return {
    ...base,
    engine: base.engine * m.engine * skill * (1 + 0.07 * L('motor')),
    maxSpeed: base.maxSpeed * m.maxSpeed * (0.92 + 0.08 * skill) * (1 + 0.045 * L('punta')),
    gripFront: base.gripFront * m.grip * (1 + 0.05 * L('ruedas')),
    gripRear: base.gripRear * m.grip * (1 + 0.05 * L('ruedas')),
    steerMax: base.steerMax * m.steer * (1 + 0.05 * L('direccion')),
    steerSpeed: base.steerSpeed * (1 + 0.05 * L('direccion')),
    suspStiff: base.suspStiff * m.susp,
    // tracción propia del modelo, relativa al ajuste base (90 % por defecto)
    rearBias: def.rearBias === undefined ? base.rearBias : Math.max(0, Math.min(100, base.rearBias + def.rearBias - 90)),
  };
}
