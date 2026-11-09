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

## Notas técnicas rápidas

- `npm run build`; servir `dist/` con `npx vite preview --port 4173` para las pruebas en Chrome headless.
- Los circuitos se diseñan en unidades pequeñas y se amplían ×2 (ver `specs/02-fisicas.md`).
- Si cambian los valores por defecto del panel ⚙ (`src/tuning.js`), sube la clave de guardado.
- Web: https://zeroping7.github.io/Re-Back/ · APK: https://zeroping7.github.io/Re-Back/re-back.apk
