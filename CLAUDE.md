# Re-Back — instrucciones para Claude

Juego de carreras de coches RC para Android. **Objetivo principal: parecerse lo máximo posible a Re-Volt**
(sensación, ambientación, modos, armas, presentación) con **contenido 100 % original**: no usar nombres,
logotipos, música, sonidos, texturas ni modelos de Re-Volt, y no mencionarlo dentro del juego.

## Spec Driven Development (obligatorio)

1. Lee `specs/README.md` y la spec del área que vayas a tocar.
2. Antes de programar: añade/actualiza el requisito (ID, descripción, criterio de aceptación, estado 🚧)
   y apunta la petición en `specs/historial.md`.
3. Implementa cambios pequeños que cumplan la spec.
4. Verifica: `node tests/racesim.mjs <circuito> 3 2` (todos terminan) y capturas con `tests/*.mjs`.
5. Marca ✅ en la spec, actualiza `PROGRESO.md`, haz commit y push a `main` (CI publica web + APK).

## Sobre el usuario

- Trabaja **solo desde el móvil**: Claude escribe todo el código, lo sube y le dice qué probar.
- Respuestas **breves y en español**.
- **Cada vez que publiques una versión nueva, dile siempre el número de versión** (`v1.0.N`, el mismo que sale en la pantalla de inicio y en el APK)
  junto con los links de la web y del APK. `N` = número de ejecución del workflow *Build*: tras el push, `gh run list -R zeroping7/re-back -L 1 --json number,headSha`
  (comprueba que `headSha` es tu commit). La compilación tarda ~2 min; avísale de que hasta entonces verá la versión anterior.

## ⚠ Economía: revísala al añadir coches, circuitos, copas o modos

Siempre que añadas o quites un coche, circuito, copa o modo, sigue la lista **«Revisión al añadir contenido»** de
`specs/09-economia.md` (precio en la escalera, con qué copa se abre, premios únicos) y pasa `node tests/economy.mjs`
(tiene que acabar en ✓). Ritmo decidido por el usuario: coche nuevo cada 6–8 carreras al principio y 15–20 al final;
todos los de Carrera en 4–5 h. Las carreras online darán monedas (ECO-15) cuando exista NET-08.

## Notas técnicas rápidas

- `npm run build`; servir `dist/` con `npx vite preview --port 4173` para las pruebas en Chrome headless.
- Los circuitos se diseñan en unidades pequeñas y se amplían ×2 (ver `specs/02-fisicas.md`).
- Si cambian los valores por defecto del panel ⚙ (`src/tuning.js`), sube la clave de guardado.
- Disciplinas (Carrera / Drift / Obstáculos): `specs/11-disciplinas.md`, `src/disciplines.js`, obstáculos en `src/tracks/kit.js`.
  Pruebas: `node tests/racesim.mjs cocina 3 2 patin`, `... senda 3 1 cabra` (Obstáculos = La maqueta: `senda` y `senda:rev`; El escritorio y El fregadero ya no existen y un id desconocido carga El salón), `tests/overlap.mjs`, `tests/driftprobe.mjs`, `tests/disc.mjs`.
  En el navegador, `?test&unlock` abre todas las disciplinas y `&fast=6` acelera la carrera.
- Web: https://zeroping7.github.io/Re-Back/ · APK: https://zeroping7.github.io/Re-Back/re-back.apk
