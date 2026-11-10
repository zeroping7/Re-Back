// Coches disponibles. Los multiplicadores se aplican sobre el ajuste base (panel ⚙).
export const CARS = [
  {
    id: 'chispa', price: 1500, name: 'Chispa', desc: 'Ligero y nervioso', color: '#1e88e5', style: 'buggy', number: '3',
    clase: 'Aficionado', motor: 'Eléctrico', mass: 7,
    wheelR: 0.35, wheelX: 0.58, wheelZf: 0.72, wheelZr: -0.7,
    mods: { engine: 1.22, maxSpeed: 0.94, grip: 0.97, steer: 1.12, susp: 1 },
    stats: { vel: 2, acel: 5, manejo: 4 },
  },
  {
    id: 'flecha', disc: ['race', 'drift'], price: 7500, name: 'Flecha', desc: 'Turismo bajo y rapidísimo', color: '#f5c518', style: 'touring', number: '1',
    clase: 'Semi-pro', motor: 'Eléctrico', mass: 8, rearBias: 70,
    wheelR: 0.32, wheelX: 0.62, wheelZf: 0.78, wheelZr: -0.76,
    mods: { engine: 1.06, maxSpeed: 1.12, grip: 1.1, steer: 0.95, susp: 1.35 },
    stats: { vel: 5, acel: 3, manejo: 3 },
  },
  {
    id: 'tanque', disc: ['race', 'obst'], price: 3000, name: 'Tanque', desc: 'Monster truck: salta y aguanta', color: '#2e9e44', style: 'truck', number: '9', pattern: 'flames',
    clase: 'Avanzado', motor: 'Nitro', mass: 11, rearBias: 50,
    wheelR: 0.46, wheelX: 0.66, wheelZf: 0.74, wheelZr: -0.74,
    mods: { engine: 1.1, maxSpeed: 0.92, grip: 1.05, steer: 0.95, susp: 0.75 },
    stats: { vel: 2, acel: 4, manejo: 3 },
  },
  {
    id: 'formula', price: 10000, name: 'Fórmula', desc: 'Monoplaza: se pega en curva', color: '#d50000', style: 'f1', number: '1', rimColor: '#ffd400',
    clase: 'Pro', motor: 'Nitro', mass: 7.5, rearBias: 100,
    wheelR: 0.34, wheelX: 0.64, wheelZf: 0.9, wheelZr: -0.68,
    mods: { engine: 1.05, maxSpeed: 1.1, grip: 1.22, steer: 1.0, susp: 1.5 },
    stats: { vel: 5, acel: 3, manejo: 5 },
  },
  {
    id: 'rally', disc: ['race', 'obst'], price: 4000, name: 'Rally', desc: 'Compacto, ágil en tierra', color: '#0d47a1', style: 'rally', number: '4', pattern: 'rally', rimColor: '#ffffff',
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
  // COC-04: coches nuevos
  {
    id: 'morsa', disc: ['race', 'obst'], price: 3500, name: 'Morsa', desc: 'Camión pesado: empuja a todos', color: '#6d4c41', style: 'hauler', number: '12', pattern: 'stripes', rimColor: '#ffcc80',
    clase: 'Avanzado', motor: 'Eléctrico', mass: 12.5, rearBias: 50,
    wheelR: 0.45, wheelX: 0.66, wheelZf: 0.76, wheelZr: -0.76,
    mods: { engine: 1.04, maxSpeed: 0.96, grip: 1.08, steer: 0.9, susp: 0.72 },
    stats: { vel: 2, acel: 3, manejo: 3 },
  },
  {
    id: 'saeta', disc: ['race', 'drift'], price: 12500, name: 'Saeta', desc: 'Turismo de nitro: el más rápido en recta', color: '#00b8d4', style: 'touring', number: '11', pattern: 'rally', rimColor: '#212121',
    clase: 'Pro', motor: 'Nitro', mass: 8, rearBias: 80,
    wheelR: 0.33, wheelX: 0.62, wheelZf: 0.78, wheelZr: -0.76,
    mods: { engine: 1.1, maxSpeed: 1.16, grip: 1.12, steer: 1.0, susp: 1.35 },
    stats: { vel: 5, acel: 4, manejo: 4 },
  },
  // COC-05: coche secreto, se regala al conseguir todas las estrellas ocultas
  {
    id: 'cometa', price: 20000, secret: true, name: 'Cometa', desc: 'Cohete secreto: se gana con todas las estrellas', color: '#3d5afe', style: 'rocket', number: '0', pattern: 'flames', rimColor: '#ffd400',
    clase: 'Pro', motor: 'Nitro', mass: 7.5, rearBias: 85,
    wheelR: 0.35, wheelX: 0.6, wheelZf: 0.76, wheelZr: -0.72,
    mods: { engine: 1.18, maxSpeed: 1.18, grip: 1.15, steer: 1.08, susp: 1.2 },
    stats: { vel: 5, acel: 5, manejo: 5 },
  },
  // DCO-02: coches de Drift: turismos RC 1:10 de tracción trasera, kit ancho, caída negativa y ruedas duras
  {
    id: 'patin', disc: ['drift'], starter: true, price: 1200, name: 'Patín', desc: 'Descapotable ligero: tu primer coche de drift', color: '#9aa4ae', style: 'roadster', number: '13', pattern: 'carbon', rimColor: '#1b1b1b', spokes: 12, camber: 0.07,
    clase: 'Drift', motor: 'Eléctrico', mass: 7, rearBias: 100,
    wheelR: 0.31, wheelX: 0.6, wheelZf: 0.66, wheelZr: -0.64,
    mods: { engine: 1.18, maxSpeed: 0.92, grip: 1.0, steer: 1.12, susp: 1.3, rest: 0.7 },
    stats: { vel: 2, acel: 4, manejo: 3 },
  },
  {
    id: 'humo', disc: ['drift'], price: 3500, name: 'Humo', desc: 'Berlina cuadrada de los 80 con aletas anchas', color: '#1f3b73', style: 'sedan', number: '21', pattern: 'livery', rimColor: '#d7dde2', spokes: 14, camber: 0.08,
    clase: 'Drift', motor: 'Eléctrico', mass: 8, rearBias: 100,
    wheelR: 0.32, wheelX: 0.66, wheelZf: 0.76, wheelZr: -0.74,
    mods: { engine: 1.28, maxSpeed: 0.98, grip: 1.0, steer: 1.2, susp: 1.3, rest: 0.7 },
    stats: { vel: 3, acel: 4, manejo: 4 },
  },
  {
    id: 'trompo', disc: ['drift'], price: 6000, name: 'Trompo', desc: 'Compacto de portón bicolor: cambia de lado en un parpadeo', color: '#f2f2f2', style: 'hatch', number: '86', pattern: 'twotone', rimColor: '#2b2b2b', spokes: 6, camber: 0.07,
    clase: 'Drift', motor: 'Eléctrico', mass: 7.5, rearBias: 100,
    wheelR: 0.31, wheelX: 0.61, wheelZf: 0.72, wheelZr: -0.7,
    mods: { engine: 1.34, maxSpeed: 1.0, grip: 0.96, steer: 1.32, susp: 1.1, rest: 0.7 },
    stats: { vel: 3, acel: 5, manejo: 5 },
  },
  {
    id: 'bisonte', disc: ['drift'], price: 8500, name: 'Bisonte', desc: 'Deportivo americano con compresor: potencia bruta', color: '#26282c', style: 'muscle', number: '8', pattern: 'yellow', rimColor: '#141414', spokes: 10, camber: 0.06,
    clase: 'Drift', motor: 'Nitro', mass: 8.5, rearBias: 100,
    wheelR: 0.33, wheelX: 0.65, wheelZf: 0.78, wheelZr: -0.76,
    mods: { engine: 1.45, maxSpeed: 1.06, grip: 1.0, steer: 1.18, susp: 1.3, rest: 0.7 },
    stats: { vel: 4, acel: 5, manejo: 3 },
  },
  {
    id: 'katana', disc: ['drift'], price: 11000, name: 'Katana', desc: 'Cupé de los 90 con alerón: el rey del derrape', color: '#1e4fd8', style: 'coupe', number: '34', pattern: 'carbon', rimColor: '#e6e6e6', spokes: 5, camber: 0.08,
    clase: 'Drift', motor: 'Nitro', mass: 8, rearBias: 100,
    wheelR: 0.33, wheelX: 0.65, wheelZf: 0.8, wheelZr: -0.77,
    mods: { engine: 1.42, maxSpeed: 1.08, grip: 1.05, steer: 1.36, susp: 1.35, rest: 0.7 },
    stats: { vel: 5, acel: 5, manejo: 5 },
  },
  // DCO-03: coches de Obstáculos (camiones lentos, ruedas grandes, mucha suspensión y agarre)
  {
    id: 'cabra', disc: ['obst'], starter: true, price: 1500, name: 'Cabra', desc: 'Tu primer trepador: sube por donde sea', color: '#c9a45c', style: 'jeep', number: '14', pattern: 'stripes', rimColor: '#3e2723',
    clase: 'Trepador', motor: 'Eléctrico', mass: 10, rearBias: 50,
    wheelR: 0.48, wheelX: 0.67, wheelZf: 0.76, wheelZr: -0.76,
    mods: { engine: 1.05, maxSpeed: 0.8, grip: 1.25, steer: 1.12, susp: 0.72, rest: 1.15 },
    stats: { vel: 1, acel: 3, manejo: 4 },
  },
  {
    id: 'oruga', disc: ['obst'], price: 4500, name: 'Oruga', desc: 'Pesado y pegado al suelo: nada lo mueve', color: '#7cb342', style: 'crawler', number: '40', pattern: 'dots', rimColor: '#fdd835',
    clase: 'Trepador', motor: 'Eléctrico', mass: 12.5, rearBias: 50,
    wheelR: 0.51, wheelX: 0.68, wheelZf: 0.78, wheelZr: -0.78,
    mods: { engine: 1.2, maxSpeed: 0.84, grip: 1.36, steer: 1.08, susp: 0.68, rest: 1.2 },
    stats: { vel: 2, acel: 4, manejo: 4 },
  },
  {
    id: 'yeti', disc: ['obst'], price: 9000, name: 'Yeti', desc: 'Monstruo blanco: salta, aterriza y sigue', color: '#e1f5fe', style: 'bigfoot', number: '88', pattern: 'flames', rimColor: '#0288d1',
    clase: 'Trepador', motor: 'Nitro', mass: 11, rearBias: 50,
    wheelR: 0.54, wheelX: 0.69, wheelZf: 0.78, wheelZr: -0.78,
    mods: { engine: 1.36, maxSpeed: 0.9, grip: 1.45, steer: 1.18, susp: 0.64, rest: 1.25 },
    stats: { vel: 3, acel: 5, manejo: 5 },
  },
];

// ordenados de más barato a más caro
CARS.sort((a, b) => a.price - b.price);

export const carById = (id) => CARS.find((c) => c.id === id) || CARS[0];

// Clases (como en las ligas de coches RC) y rivales según la dificultad
export const CLASSES = ['Novato', 'Aficionado', 'Avanzado', 'Semi-pro', 'Pro'];
export function rivalPool(diff) {
  const lo = diff < 0.9 ? 0 : diff < 1 ? 1 : 2, hi = lo === 2 ? 4 : lo + 1;
  return CARS.filter((c) => { if (!(c.disc || ['race']).includes('race')) return false; const k = CLASSES.indexOf(c.clase); return !c.secret && k >= lo && k <= hi; });
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
    suspRest: base.suspRest * (m.rest || 1),
    // tracción propia del modelo, relativa al ajuste base (90 % por defecto)
    rearBias: def.rearBias === undefined ? base.rearBias : Math.max(0, Math.min(100, base.rearBias + def.rearBias - 90)),
  };
}
