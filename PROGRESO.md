# PROGRESO — Re-Back

Juego de carreras de coches RC para Android inspirado en Re-Volt.
Stack: Three.js (low-poly) + Rapier (físicas) + Vite, empaquetado con Capacitor.

- **Jugar en el navegador:** https://zeroping7.github.io/Re-Back/
- **APK (última versión):** https://zeroping7.github.io/Re-Back/re-back.apk
  (alternativa: https://github.com/zeroping7/Re-Back/releases/latest)

## Fase actual: 1 — Un coche y un circuito para afinar la conducción ✅ (pendiente de probar en móvil)

### Hecho
- Proyecto Vite + Three.js + Rapier + Capacitor 8 (Android, horizontal, pantalla completa inmersiva).
- CI (GitHub Actions): publica la web en la rama `gh-pages` y compila el APK en cada push a `main`
  (release `v0.1.N` con `re-back.apk`; firma fija para actualizar sin desinstalar).
- **Coche RC** (`src/car.js`): controlador de vehículo por rayos de Rapier con suspensión real,
  tracción 4x4 con reparto trasero, freno, marcha atrás, derrape con freno+giro, control en el aire,
  estabilizador anti-vuelco, carga aerodinámica, recolocación automática si vuelca.
  Modelo low-poly por código: carrocería en cuña, cabina, alerón, faros, pilotos de freno, antena con muelle.
- **Circuito 1 "El salón"** (`src/track.js`): bordes de bloques de juguete, salida con latas gigantes,
  rampa-libro para saltar, dos lápices como badenes, túnel bajo la mesa de centro, sofá, mueble de TV,
  estantería, planta, lámpara, alfombra, ventana con sol (sombras dinámicas) y reflejos de entorno.
- **Sensaciones** (`src/main.js`, `src/effects.js`): cámara de persecución con anticolisión, FOV según
  velocidad, temblor en golpes y aterrizajes, humo de derrape, polvo al aterrizar, chispas, marcas de
  neumático, vibración del móvil, sonido sintetizado (motor, derrape, golpes).
- **Controles** (`src/controls.js`): botones táctiles (◀ ▶ ▲ ▼), modo inclinación (botón 🎮/📱) y teclado.
- **Panel de ajustes ⚙** (`src/tuning.js`): sliders en vivo para potencia, giro, agarre, suspensión,
  gravedad, cámara… se guardan en el móvil; "Copiar valores" para pegarlos en el chat.
- Calidad adaptativa (baja la resolución si van menos de 42 fps).
- Pruebas: `tests/sim.mjs` (piloto automático sin gráficos: vueltas, vuelcos, trompos),
  `tests/auto.mjs` (capturas en Chrome headless), `tests/driftsim.mjs`, `tests/curv.mjs`.

### Pendiente fase 1
- Probar en el móvil y afinar la conducción con el panel ⚙ (pegar los valores en el chat).
- Comprobar el sentido del modo inclinación.

## Próximas fases
2. IA rival y vueltas cronometradas (checkpoints, contador de vueltas, mejor vuelta).
3. Power-ups: cohete, bola de agua, turbo, mancha de aceite, bomba.
4. Más circuitos (supermercado, jardín), más coches, menús y sonido.
5. APK final (icono, firma de release).

## Notas técnicas
- Escala: 1 unidad ≈ 22 cm. Coche ≈ 2 u de largo. Gravedad de juego 28.
- Los bordes y paredes están en un grupo de colisión que los rayos de las ruedas ignoran
  (evita que el coche salga despedido al rozar un bloque).
- Parámetros de URL para depurar: `?test=1` (empieza sin menú), `&cam=top` (vista cenital), `&cam=side`.
