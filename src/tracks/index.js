import salon from './salon.js';
import superm from './super.js';
import jardin from './jardin.js';
import museo from './museo.js';
import muelle from './muelle.js';
import parque from './parque.js';

import cocina from './cocina.js';
import garaje from './garaje.js';
import senda from './senda.js';

// TRACKS = circuitos de Carrera (estrellas, coche secreto…). Los de Drift y Obstáculos llevan `disc` (DIS-02).
export const TRACKS = [salon, superm, jardin, museo, muelle, parque];
export const ALL_TRACKS = [...TRACKS, cocina, garaje, senda];
export const tracksFor = (disc) => ALL_TRACKS.filter((t) => (t.disc || 'race') === disc);
export const trackById = (id) => ALL_TRACKS.find((t) => t.id === id) || TRACKS[0];

// Variantes (CIR-23 / UX-13): mismo circuito al revés o en espejo. Clave: 'salon', 'salon:rev', 'salon:mirror'
export const VARIANTS = [
  { id: 'normal', name: 'Normal', short: '', icon: '' },
  { id: 'rev', name: 'Al revés', short: ' ⟲', icon: '⟲', needs: 'plata' },
  { id: 'mirror', name: 'Espejo', short: ' ⇋', icon: '⇋', needs: 'oro' },
];
export const variantUnlocked = (v, cups = {}) => { const d = VARIANTS.find((x) => x.id === v); return !d?.needs || (cups[d.needs] ?? 99) <= 3; };

// Definición del circuito para una clave con variante
export function trackFromKey(key = 'salon') {
  const [id, v = 'normal'] = String(key).split(':');
  const base = trackById(id);
  if (v === 'normal') return base;
  const V = VARIANTS.find((x) => x.id === v) || VARIANTS[0];
  return { ...base, key: `${base.id}:${V.id}`, variant: V.id, reverse: V.id === 'rev', mirror: V.id === 'mirror', name: `${base.name}${V.short}`, short: `${base.short}${V.short}` };
}
