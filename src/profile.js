import { CARS, carById, UPGRADES, MAX_LEVEL } from './cars.js';
import { TRACKS } from './tracks/index.js';

// Partida guardada: dinero, coches comprados y sus mejoras
const KEY = 'reback.profile.v1';
const START = { money: 500, owned: { furgo: {}, pulga: {} }, selected: 'pulga', earned: 0, cups: {}, stars: {} };

function load() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (p && p.owned && Object.keys(p.owned).length) return p;
  } catch { /* nada */ }
  return JSON.parse(JSON.stringify(START));
}
export const profile = load();
if (!profile.owned[profile.selected]) profile.selected = Object.keys(profile.owned)[0];
profile.cups ??= {}; // mejor puesto final en cada copa
profile.stars ??= {}; // estrellas ocultas cogidas por circuito

const listeners = new Set();
export function onProfileChange(fn) { listeners.add(fn); }
export function saveProfile() {
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* nada */ }
  for (const f of listeners) f(profile);
}

export const isOwned = (id) => !!profile.owned[id];
export const upgradesOf = (id) => profile.owned[id] || {};

export function upgradeCost(id, upId) {
  const lvl = upgradesOf(id)[upId] || 0;
  if (lvl >= MAX_LEVEL) return null;
  const base = 150 + carById(id).price * 0.1;
  return Math.round((base * (lvl + 1)) / 50) * 50;
}

function spentOn(id) {
  let total = carById(id).price;
  const up = upgradesOf(id);
  for (const u of UPGRADES) {
    for (let l = 0; l < (up[u.id] || 0); l++) total += Math.round(((150 + carById(id).price * 0.1) * (l + 1)) / 50) * 50;
  }
  return total;
}
export const sellValue = (id) => Math.round((spentOn(id) * 0.6) / 50) * 50;

export function buyCar(id) {
  const c = carById(id);
  if (c.secret || isOwned(id) || profile.money < c.price) return false;
  profile.money -= c.price;
  profile.owned[id] = {};
  profile.selected = id;
  saveProfile();
  return true;
}

export function sellCar(id) {
  if (!isOwned(id) || Object.keys(profile.owned).length <= 1) return false;
  profile.money += sellValue(id);
  delete profile.owned[id];
  if (profile.selected === id) profile.selected = Object.keys(profile.owned)[0];
  saveProfile();
  return true;
}

export function buyUpgrade(id, upId) {
  const cost = upgradeCost(id, upId);
  if (cost === null || !isOwned(id) || profile.money < cost) return false;
  profile.money -= cost;
  profile.owned[id][upId] = (profile.owned[id][upId] || 0) + 1;
  saveProfile();
  return true;
}

export function selectCar(id) { if (isOwned(id)) { profile.selected = id; saveProfile(); } }

// Premio por carrera: según puesto, nº de coches, vueltas y dificultad
export function raceReward(place, total, laps, diff) {
  const table = [1000, 650, 450, 300, 200, 150];
  const base = table[Math.min(place - 1, table.length - 1)];
  const field = 0.7 + 0.1 * total;
  const diffMul = diff < 0.9 ? 0.7 : diff > 1 ? 1.5 : 1;
  return Math.round((base * field * diffMul * (0.6 + 0.4 * (laps / 3))) / 10) * 10;
}

// Guarda el mejor puesto conseguido en una copa
export function setCupResult(id, place) {
  if (!(profile.cups[id] <= place)) { profile.cups[id] = place; saveProfile(); }
}

// Estrella oculta: premio solo la primera vez
export const STAR_PRIZE = 500;
export function takeStar(trackId) {
  if (profile.stars[trackId]) return false;
  profile.stars[trackId] = true;
  addMoney(STAR_PRIZE);
  return true;
}
// COC-05: todas las estrellas → coche secreto (devuelve true si se acaba de ganar)
export const starsGot = () => TRACKS.filter((t) => profile.stars[t.id]).length;
export function checkSecret() {
  if (profile.owned.cometa || starsGot() < TRACKS.length) return false;
  profile.owned.cometa = {};
  saveProfile();
  return true;
}

export function addMoney(n) { profile.money += n; profile.earned = (profile.earned || 0) + n; saveProfile(); }

export { CARS };
