// Disciplinas (specs/11-disciplinas.md): Carrera, Drift y Obstáculos.
export const DISCS = [
  { id: 'race', name: 'Carrera', icon: '🏁', color: '#ff6a00', needs: null, desc: 'Llega el primero. Con armas.' },
  { id: 'drift', name: 'Drift', icon: '💨', color: '#b44dff', needs: 'bronce', needsName: 'Copa Bronce', starter: 'patin', desc: 'Gana puntos yendo de lado.' },
  { id: 'obst', name: 'Obstáculos', icon: '🧗', color: '#19b89a', needs: 'plata', needsName: 'Copa Plata', starter: 'cabra', desc: 'Recorridos llenos de trampas.' },
];
export const discById = (id) => DISCS.find((d) => d.id === id) || DISCS[0];
// DIS-01: Drift se abre con la Copa Bronce y Obstáculos con la Plata (entre los 3 primeros)
export const discUnlocked = (id, cups = {}) => { const d = discById(id); return !d.needs || (cups[d.needs] ?? 99) <= 3; };

// DCO-01: disciplinas en las que corre un coche
export const carDiscs = (def) => def.disc || ['race'];
export const carAllowed = (def, disc) => carDiscs(def).includes(disc);

// Modos de cada disciplina (DIS-01). go = modo interno de main.js
export const MODES = {
  race: [
    { go: 'race', icon: '🏁', name: 'Carrera rápida' },
    { go: 'cups', icon: '🏆', name: 'Campeonato' },
    { go: 'practice', icon: '⏱', name: 'Contrarreloj' },
  ],
  drift: [
    { go: 'solo', icon: '🎯', name: 'Puntuación' },
    { go: 'race', icon: '⚔️', name: 'Duelo' },
    { go: 'cups', icon: '🏆', name: 'Copa Derrape' },
  ],
  obst: [
    { go: 'solo', icon: '⏱', name: 'Contrarreloj' },
    { go: 'race', icon: '🏁', name: 'Carrera' },
    { go: 'cups', icon: '🏆', name: 'Copa Obstáculos' },
  ],
};

// DRI-04: conducción de drift (se aplica a cualquier coche en esa disciplina)
export function discTuning(t, disc) {
  if (disc === 'obst') return crawlTuning(t);
  if (disc !== 'drift') return t;
  return { ...t, rearBias: 100, downforce: t.downforce * 0.5 }; // DRI-15: el agarre lo pone driftPhysics.js
}

// CRW-01: física de crawler. Poca velocidad, mucho par y agarre, suspensión larga y blanda, dirección lenta y precisa
export function crawlTuning(t) {
  return {
    ...t,
    maxSpeed: t.maxSpeed * 0.5,
    engine: t.engine * 1.15,
    rearBias: 50,
    gripFront: t.gripFront * 1.7, gripRear: t.gripRear * 1.7,
    sideFront: 1.4, sideRear: 1.4,
    steerMax: t.steerMax * 1.45, steerSpeed: 4.2, steerFalloff: 0.012, steerLow: 0.15,
    suspRest: Math.max(t.suspRest * 1.5, 0.55), suspStiff: t.suspStiff * 0.8, suspComp: 2.6, suspRelax: 3.4,
    brake: 7, downforce: 0, airControl: 5,
  };
}

// DEC-01: medallas de los modos en solitario
export const MEDALS = [
  { id: 'bronce', icon: '🥉', name: 'Bronce', prize: 300 },
  { id: 'plata', icon: '🥈', name: 'Plata', prize: 600 },
  { id: 'oro', icon: '🥇', name: 'Oro', prize: 1000 },
];
export const MEDAL_REPEAT = [60, 150, 250]; // DEC-01: repetir paga según la medalla lograda en ese intento
// nivel 0..3 para un valor (puntos en drift: más es mejor; segundos en obstáculos: menos es mejor)
export function medalLevel(trackDef, value) {
  const m = trackDef.medals;
  if (!m || !value) return 0;
  let lvl = 0;
  for (let i = 0; i < 3; i++) if (trackDef.disc === 'drift' ? value >= m[i] : value <= m[i]) lvl = i + 1;
  return lvl;
}
export const fmtPts = (n) => Math.round(n).toLocaleString('es-ES');
