// Campeonato: copas de 3 carreras con puntos (ver specs/09-economia.md)
export const CUPS = [
  { id: 'bronce', name: 'Copa Bronce', icon: '🥉', color: '#cd7f32', diff: 0.86, diffName: 'Fácil', laps: 2, rivals: 3, tracks: ['salon', 'super', 'jardin'], prize: 1500, needs: null },
  { id: 'plata', name: 'Copa Plata', icon: '🥈', color: '#c0c7d0', diff: 0.94, diffName: 'Normal', laps: 3, rivals: 3, tracks: ['super', 'jardin', 'salon'], prize: 3000, needs: 'bronce' },
  { id: 'oro', name: 'Copa Oro', icon: '🥇', color: '#ffd23f', diff: 1.02, diffName: 'Difícil', laps: 3, rivals: 5, tracks: ['jardin', 'salon', 'super'], prize: 6000, needs: 'plata' },
];
export const POINTS = [10, 6, 4, 3, 2, 1];
export const cupById = (id) => CUPS.find((c) => c.id === id) || CUPS[0];

// Plata se abre quedando entre los 3 primeros en Bronce; Oro, en Plata
export const cupUnlocked = (cup, cups = {}) => !cup.needs || (cups[cup.needs] ?? 99) <= 3;

// Premio final: 1º 100 %, 2º 50 %, 3º 25 %
export const cupPrize = (cup, place) => Math.round((cup.prize * ([1, 0.5, 0.25][place - 1] || 0)) / 10) * 10;

// Suma los puntos de una carrera. results: [{ name, place, color, player }]
export function addPoints(state, results) {
  for (const r of results) {
    const e = (state.table[r.name] ??= { name: r.name, color: r.color, player: r.player, def: r.def, pts: 0, wins: 0 });
    const p = POINTS[r.place - 1] || 0;
    e.pts += p; e.last = p;
    if (r.place === 1) e.wins++;
  }
}

// Clasificación ordenada (desempate: más victorias, luego mejor puesto en la última carrera)
export function standings(state) {
  return Object.values(state.table).sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.last - a.last);
}
