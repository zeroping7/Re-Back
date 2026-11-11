import { CARS, carById, UPGRADES, MAX_LEVEL } from './cars.js';
import { TRACKS } from './tracks/index.js';
import { DISCS, discUnlocked, carAllowed, carDiscs, MEDALS, MEDAL_REPEAT } from './disciplines.js';

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
for (const id of ['rayo', 'bolido', 'grillo', 'saeta']) delete profile.owned[id]; // coches retirados
if (!Object.keys(profile.owned).length) profile.owned.pulga = {};
if (!profile.owned[profile.selected]) profile.selected = Object.keys(profile.owned)[0];
profile.cups ??= {}; // mejor puesto final en cada copa
profile.stars ??= {}; // estrellas ocultas cogidas por circuito
profile.sel ??= { race: profile.selected };
for (const k in profile.sel) if (!profile.owned[profile.sel[k]]) profile.sel[k] = profile.selected; // último coche usado en cada disciplina (DIS-03)
profile.medals ??= {}; // mejor medalla por circuito en los modos en solitario (DEC-01)
profile.granted ??= {}; // disciplinas cuyo coche básico ya se regaló (DIS-04)

profile.inst ??= {}; // niveles montados por coche y mejora (si falta, todos los comprados)
if (profile.off) { // migración de la versión anterior (mejora entera quitada)
  for (const id in profile.off) for (const u in profile.off[id]) (profile.inst[id] ??= {})[u] = 0;
  delete profile.off;
}

const listeners = new Set();
export function onProfileChange(fn) { listeners.add(fn); }
export function saveProfile() {
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* nada */ }
  for (const f of listeners) f(profile);
}

export const isOwned = (id) => !!profile.owned[id];
// Mejoras compradas (niveles) y montadas (niveles puestos en el coche, 0..comprados)
export const ownedUpgrades = (id) => profile.owned[id] || {};
export function installedLevel(id, upId) {
  const own = ownedUpgrades(id)[upId] || 0, v = profile.inst?.[id]?.[upId];
  return v === undefined ? own : Math.max(0, Math.min(own, v));
}
export function upgradesOf(id) {
  const out = {};
  for (const k of Object.keys(ownedUpgrades(id))) { const l = installedLevel(id, k); if (l) out[k] = l; }
  return out;
}
function setInstalled(id, upId, lvl) {
  const own = ownedUpgrades(id)[upId] || 0;
  lvl = Math.max(0, Math.min(own, lvl));
  profile.inst ??= {};
  const o = (profile.inst[id] ??= {});
  if (lvl >= own) delete o[upId]; else o[upId] = lvl;
  if (!Object.keys(o).length) delete profile.inst[id];
}
// Quita (-1) o pone (+1) un nivel de una mejora ya comprada, sin perder lo pagado
export function stepUpgrade(id, upId, d) {
  const cur = installedLevel(id, upId), next = cur + d;
  if (next < 0 || next > (ownedUpgrades(id)[upId] || 0)) return false;
  setInstalled(id, upId, next);
  saveProfile();
  return true;
}

export function upgradeCost(id, upId) {
  const lvl = ownedUpgrades(id)[upId] || 0;
  if (lvl >= MAX_LEVEL) return null;
  const base = 150 + carById(id).price * 0.1;
  return Math.round((base * (lvl + 1)) / 50) * 50;
}

function spentOn(id) {
  let total = carById(id).price;
  const up = ownedUpgrades(id);
  for (const u of UPGRADES) {
    for (let l = 0; l < (up[u.id] || 0); l++) total += Math.round(((150 + carById(id).price * 0.1) * (l + 1)) / 50) * 50;
  }
  return total;
}
export const sellValue = (id) => Math.round((spentOn(id) * 0.6) / 50) * 50;

export function buyCar(id, disc) {
  const c = carById(id);
  if (c.secret || isOwned(id) || profile.money < c.price) return false;
  profile.money -= c.price;
  profile.owned[id] = {};
  profile.selected = id;
  profile.sel[disc || carDiscs(c)[0]] = id;
  saveProfile();
  return true;
}

export function sellCar(id) {
  if (!isOwned(id) || Object.keys(profile.owned).length <= 1 || carById(id).starter) return false;
  profile.money += sellValue(id);
  delete profile.owned[id];
  if (profile.inst) delete profile.inst[id];
  if (profile.selected === id) profile.selected = Object.keys(profile.owned)[0];
  saveProfile();
  return true;
}

export function buyUpgrade(id, upId) {
  const cost = upgradeCost(id, upId);
  if (cost === null || !isOwned(id) || profile.money < cost) return false;
  profile.money -= cost;
  const inst = installedLevel(id, upId);
  profile.owned[id][upId] = (profile.owned[id][upId] || 0) + 1;
  setInstalled(id, upId, inst + 1); // el nivel nuevo se monta
  saveProfile();
  return true;
}

export function selectCar(id, disc) {
  if (!isOwned(id)) return;
  profile.selected = id;
  profile.sel[disc || carDiscs(carById(id))[0]] = id;
  saveProfile();
}

// DIS-03: al entrar en una disciplina se usa su último coche (o el primero que valga)
export function useDisc(disc) {
  let id = profile.sel[disc];
  if (!id || !isOwned(id) || !carAllowed(carById(id), disc)) id = CARS.find((c) => isOwned(c.id) && carAllowed(c, disc))?.id;
  if (!id) return null;
  if (profile.selected !== id || profile.sel[disc] !== id) { profile.sel[disc] = id; profile.selected = id; saveProfile(); }
  return id;
}

// DIS-04: regala el coche básico de cada disciplina recién abierta. Devuelve las disciplinas nuevas.
export function grantStarters() {
  const out = [];
  for (const d of DISCS) {
    if (!d.starter || profile.granted[d.id] || !discUnlocked(d.id, profile.cups)) continue;
    profile.granted[d.id] = true;
    profile.owned[d.starter] ??= {};
    out.push(d);
  }
  if (out.length) saveProfile();
  return out;
}

// DEC-01: medalla en solitario. Paga cada medalla nueva; repetir sin mejorar da un premio pequeño.
export function awardMedal(key, level) {
  const prev = profile.medals[key] || 0;
  let reward = 0;
  for (let l = prev; l < level; l++) reward += MEDALS[l].prize;
  if (!reward && level > 0) reward = MEDAL_REPEAT;
  if (level > prev) profile.medals[key] = level;
  if (reward) addMoney(reward); else saveProfile();
  return { reward, isNew: level > prev };
}

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
