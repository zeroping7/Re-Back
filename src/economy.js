// Economía (specs/09-economia.md): fórmulas puras, sin DOM ni guardado, para poder simularlas (tests/economy.mjs).
// ⚠ Al añadir coches o circuitos, repasa la lista de «Revisión al añadir contenido» de la spec y pasa la simulación.

// ECO-02: premio por carrera
export const RACE_TABLE = [600, 400, 280, 200, 140, 100];
export const DIFF_MUL = [0.7, 1, 1.5]; // fácil / normal / difícil
export const diffTier = (diff) => (diff < 0.9 ? 0 : diff > 1 ? 2 : 1);
export const REF_LAPS = { race: 3, drift: 3, obst: 1 }; // vueltas que pagan el 100 % (las de Obstáculos son mucho más largas)
export function raceReward(place, total, laps, diff, disc = 'race') {
  const base = RACE_TABLE[Math.min(place - 1, RACE_TABLE.length - 1)];
  const field = 0.7 + 0.1 * Math.min(total, 6);
  return Math.round((base * field * DIFF_MUL[diffTier(diff)] * (laps / (REF_LAPS[disc] || 3))) / 10) * 10;
}

// ECO-04: precio de un nivel de mejora (lvl = niveles ya comprados)
export const UPGRADE_PRICE_CAP = 18000;
export const upgradeLevelCost = (price, lvl) => Math.round(((120 + Math.min(price, UPGRADE_PRICE_CAP) * 0.027) * (lvl + 1)) / 50) * 50;

// ECO-10: premio de copa. Entero la primera vez; al mejorar puesto, la diferencia; al repetir, el 25 %
export const CUP_SHARE = [1, 0.5, 0.25];
export const CUP_REPEAT = 0.25;
const r10 = (n) => Math.round(n / 10) * 10;
export const cupPrize = (cup, place) => r10(cup.prize * (CUP_SHARE[place - 1] || 0));
export function cupPayout(cup, place, prev) {
  const full = cupPrize(cup, place);
  if (!full) return 0;
  if (!(prev <= 3)) return full;
  const rep = r10(full * CUP_REPEAT);
  return place < prev ? Math.max(full - cupPrize(cup, prev), rep) : rep;
}

// ECO-13: primera victoria en cada circuito y dificultad (con 4 coches o más)
export const FIRST_WIN = [300, 400, 500];
export const FIRST_WIN_MIN_CARS = 4;

// ECO-08
export const STAR_PRIZE = 500;
