# 10 · Plataforma, compilación y pruebas

## Tecnología

- **Three.js** (render low-poly, sombras, mapas de entorno) + **Rapier** (`@dimforge/rapier3d-compat`) + **Vite**.
- **Capacitor 8** para el APK Android (horizontal, pantalla completa inmersiva, pantalla siempre encendida).
- Repo: `zeroping7/Re-Back`. Rama `main`.

## Estructura

| Ruta | Contenido |
|---|---|
| `src/main.js` | Arranque, menús, flujo de pantallas, campeonato |
| `src/showroom.js` | Taller 3D de los menús (peana, vistas, podio, confeti) |
| `src/cups.js` | Copas, puntos y clasificación |
| `src/race.js` | Una carrera: escena, física, coches, IA, objetos, vueltas, cámara |
| `src/car.js`, `src/carModel.js`, `src/cars.js` | Física del coche, modelos 3D, catálogo |
| `src/ai.js`, `src/items.js` | Rivales y armas |
| `src/tracks/` | `common.js` (constructor de circuitos, cuestas, rampas, parches) y un archivo por circuito |
| `src/hud.js`, `src/controls.js`, `src/audio.js`, `src/profile.js`, `src/tuning.js`, `src/textures.js` | Marcador, controles, sonido, partida, ajustes, texturas |
| `specs/` | Especificaciones (fuente de verdad) |
| `tests/` | Simulación sin gráficos y capturas en Chrome headless |
| `server/` | Servidor online (Node + ws), despliegue en Oracle Cloud (`deploy/`) y prueba de carga (`test/load.mjs`) |
| `src/net.js` | Cliente online: salas, envío de estado, reloj sincronizado e interpolación |

## Publicación

| ID | Requisito | Estado |
|---|---|---|
| PLA-01 | Cada push a `main`: compila web y APK (GitHub Actions) | ✅ |
| PLA-02 | Web en GitHub Pages (fuente "GitHub Actions"): https://zeroping7.github.io/Re-Back/ | ✅ |
| PLA-03 | APK: https://zeroping7.github.io/Re-Back/re-back.apk y en Releases (`v1.0.N`) | ✅ |
| PLA-04 | Firma fija para actualizar sin desinstalar | ✅ |

## Rendimiento

| ID | Requisito | Estado |
|---|---|---|
| REN-01 | Objetivo 60 fps en móvil medio; calidad Alta/Media/Baja y bajada automática de resolución si < 40 fps | ✅ |
| REN-02 | Mallas estáticas del circuito y del coche fusionadas por material | ✅ |
| REN-03 | Detalle de suspensión oculto en coches lejanos | ✅ |

## Pruebas (criterios de aceptación generales)

- `node tests/racesim.mjs <salon|super|jardin> <rivales> <vueltas> [coche]`: carrera completa sin gráficos;
  todos terminan.
- `node tests/race.mjs "<url>?test=1&auto=1&track=…"`: capturas de una carrera con el jugador en automático.
- `STAR=1 node tests/racesim.mjs <circuito> 0 2 [coche]`: Contrarreloj; comprueba que la estrella se puede coger.
  `DIFF=1.02 node tests/racesim.mjs …`: otra dificultad (rivales de otra clase).
- `node tests/ui.mjs http://localhost:4173/`: capturas de toda la interfaz (taller, copas, garaje, opciones, carga, carrera, resultados de copa y podio).
- `tests/star.mjs <circuito> <normal|far|bumper>`, `tests/spots.mjs <circuito>`: estrella, cámaras, carteles de flechas y cajas.
- `tests/menu.mjs`, `tests/garage.mjs`, `tests/shop.mjs`, `tests/damage.mjs`: menús, garaje, compra, daños.
- `node tests/layout.mjs '<puntos>' 7 <nombre> '[x,z]'`: radios y separación de un trazado.
- Parámetros de depuración: `?test=1&track=…&car=…&rivals=…&laps=…&diff=…&auto=1&practice=1&cam=top|close&camMode=normal|far|bumper&cup=bronce&cupIdx=0&screen=m-cups`.

## Multijugador online (hasta 10 jugadores)

Decisión: servidor propio gratis en **Oracle Cloud Always Free** (región Madrid, Ampere A1 2 OCPU / 12 GB,
10 TB/mes de salida). Node + `ws` (WebSocket) detrás de **Caddy** con HTTPS automático (`wss://<ip>.sslip.io`).
Cada móvil simula su propio coche y envía su estado; el servidor reparte instantáneas y decide lo que
afecta a varios (salida, objetos, meta). Los coches remotos se pintan **interpolados ~100 ms** por detrás.

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| NET-01 | Servidor `server/` con salas por código de 4 letras, máx. 10 jugadores, anfitrión = primero (pasa al siguiente si se va) | `node server/test/load.mjs` crea una sala de 10 | ✅ |
| NET-02 | Estado del coche binario (≈50 B) a 20 Hz; el servidor envía instantáneas a 20 Hz con todos los coches | En la prueba de carga: ≥18 instantáneas/s por cliente y < 15 KB/s de bajada por jugador | ✅ |
| NET-03 | Reloj sincronizado (ping/pong) y salida simultánea (`start` con hora del servidor + 3 s) | Desfase de reloj medido < 5 ms en local | ✅ |
| NET-04 | Eventos (objetos, impactos, meta) reenviados al resto con autor | La prueba de carga recibe los eventos de otros | ✅ |
| NET-05 | Cliente `src/net.js` (conexión, salas, envío de estado, búfer de interpolación) usable en navegador y Node | La prueba de carga usa `src/net.js` | ✅ |
| NET-06 | Despliegue automático: push en `server/**` → GitHub Actions copia y reinicia el servidor por SSH (secrets `ORACLE_HOST`, `ORACLE_SSH_KEY`) | Workflow `server.yml` en verde | 🚧 |
| NET-07 | Menú "Online": crear/unirse con código, lista de jugadores, el anfitrión elige circuito y vueltas | — | 📝 |
| NET-08 | Carrera online: coches remotos interpolados, objetos y posiciones sincronizados | — | 📝 |
