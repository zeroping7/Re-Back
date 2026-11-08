# PROGRESO — Re-Back

Juego de carreras de coches RC para Android inspirado en Re-Volt.
Stack: Three.js (low-poly) + Rapier (físicas) + Vite, empaquetado con Capacitor 8.

- **Jugar en el navegador:** https://zeroping7.github.io/Re-Back/
- **APK (última versión):** https://zeroping7.github.io/Re-Back/re-back.apk
  (alternativa: https://github.com/zeroping7/Re-Back/releases/latest)

## Estado: fases 1-5 hechas ✅ — pendiente de probar en el móvil y pulir

### Fase 1 — Conducción ✅
- Coche con controlador de vehículo por rayos de Rapier: suspensión real, 4x4 con reparto trasero,
  freno, marcha atrás, derrape (freno + giro), control en el aire, antivuelco, carga aerodinámica.
- Ajuste por defecto elegido por el usuario: tracción trasera 90 %, freno 10, giro máx. 0,3.
- Panel ⚙ con sliders en vivo (se guardan en el móvil; "Copiar valores" para pegarlos en el chat).

### Fase 2 — Rivales y vueltas ✅
- `src/race.js`: cuenta atrás con cámara de presentación, vueltas, posiciones, mejor vuelta,
  aviso de sentido contrario, recolocación automática (vuelco, fuera de pista, atasco), resultados.
- `src/ai.js`: IA con carril propio, frena antes de las curvas según el radio, esquiva coches y aceite,
  sale de atascos marcha atrás, "goma elástica" suave y uso de objetos.
- Récords por circuito (vuelta, carrera, victorias) guardados en el móvil.
- Marcador: posición, vuelta, tiempo, récord, minimapa, velocímetro.

### Fase 3 — Power-ups ✅ (`src/items.js`)
- Cajas "?" en 3 puntos de cada circuito; el objeto depende de la posición (los últimos reciben mejores).
- 🚀 Cohete teledirigido al coche de delante · 💧 Bola de agua que rebota y empapa (frena)
- ⚡ Turbo · 🛢️ Mancha de aceite (pierdes agarre) · 💣 Bomba "patata caliente" (se pasa al tocar a otro).
- Explosiones con fuego, humo, chispas, destello de luz y temblor de cámara.

### Fase 4 — Contenido ✅
- Circuitos (`src/tracks/`): **El salón** (rampa-libro, lápices, túnel bajo la mesa), **Supermercado**
  (estantería gigante, caja-rampa, túnel de cajas de cereales, naranjas, carritos) y **El jardín**
  (camino de tierra, tabla-rampa, charco que frena, raíces, gnomo, estanque, árboles, cielo).
- Coches (`src/cars.js`): Rayo (buggy), Chispa (ligero), Flecha (turismo), Tanque (monster truck), Bólido.
  Modelos por código con suspensión animada (`src/carModel.js`).
- Menús: principal (con el coche girando en una plataforma), carrera / contrarreloj, opciones
  (sonido, música, dirección, calidad), pausa y resultados.
- Sonido y música sintetizados por código (`src/audio.js`).

### Fase 5 — APK final ✅
- Icono propio (adaptativo), pantalla de carga, nombre "Re-Back", versión 1.0.N, horizontal, pantalla completa.
- Firma fija (debug) para actualizar sin desinstalar. Cada push publica web + APK.

### Cambios tras probar en el móvil
- Coches más lentos: velocidad máx. 25 (antes 33), potencia 130 (antes 150). Ajustes guardados reiniciados (clave v2).
- Circuitos el doble de anchos (~17) y el doble de largos: el mundo de cada circuito se escala ×2
  (`trackDef.scale`), los coches mantienen su tamaño. Vueltas de ~17-28 s.

### Más curvas, detalles y coches (v1.0.9+)
- Trazados nuevos con muchas más curvas (salón 547 u, súper 609 u, jardín 808 u; vueltas de ~20-34 s).
- Pista algo más estrecha: ~14 de ancho (antes ~17).
- Menos objetos: 2 puntos de cajas con 3 cajas cada uno. Sin baches (lápices, naranjas, raíces).
- Detalles animados (`update` de cada circuito):
  - Salón: tren de juguete dando vueltas, gato dormido moviendo la cola, globos, robot que saluda, tele con dibujos, pato de goma.
  - Súper: carteles de oferta girando, cintas de las cajas con productos, globos en la salida.
  - Jardín: mariposas, aspersor girando con chorros, molinillo de viento, rana saltando.
- Los decorados se colocan solos fuera de la pista (`circuit.spot`).
- Coches nuevos: Fórmula (monoplaza con piloto), Rally (con focos y faldillas), Furgo (furgoneta de pizzas)
  y Pulga (cochecito redondo con ojos). Todos con dorsal en los laterales, faros, neumáticos lisos o de tacos
  y decoraciones (franjas, rally, llamas, lunares, pizza).

### Economía, garaje y modelos más realistas (v1.0.10+)
- `src/profile.js`: partida guardada con monedas 🪙, coches comprados y mejoras.
- Al empezar: 500 🪙 y solo Furgo y Pulga. El resto se compra en el **Garaje** (de 1.500 a 10.000 🪙).
- Premio por carrera según puesto, nº de coches, vueltas y dificultad (ganar con 4 coches a 3 vueltas en Normal ≈ 1.100 🪙).
- Mejoras por coche (3 niveles): Motor, Velocidad punta, Neumáticos, Dirección. Precio según el coche.
- Vender un coche devuelve el 60 % de lo gastado (coche + mejoras). Siempre te queda al menos uno.
- Modelos: perfiles suavizados (Chaikin) con normales suaves, pasos de rueda, matrículas, retrovisores,
  líneas de puertas, faros y pilotos con cristal, discos y pinzas de freno, llantas a escala con buje.

## Pendiente / ideas
- Probar en el móvil: rendimiento (Opciones → Calidad si va lento) y sentido del modo inclinación.
- Multijugador online (opcional, futuro).
- Más circuitos y coches; logros.

## Notas técnicas
- Escala: 1 unidad ≈ 22 cm (coches). Los circuitos se diseñan en unidades "pequeñas" y se amplían ×2
  (`createBuilder(…, S)` escala colisiones; un grupo con `scale` escala lo visual; `scaleTrack` pasa el trazado al mundo).
- Gravedad de juego 28.
- Grupos de colisión (`tracks/common.js`): los rayos de las ruedas ignoran bordes y coches; la cámara ignora coches.
- Las mallas estáticas del circuito se fusionan por material (`mergeStatic`) para reducir llamadas de dibujo.
- Depuración: `?test=1&track=super&rivals=3&auto=1&cam=top` (auto = el jugador conduce solo).
- Pruebas: `node tests/racesim.mjs <circuito> <rivales> <vueltas>` (carrera completa sin gráficos),
  `tests/race.mjs` y `tests/menu.mjs` (capturas en Chrome headless), `tests/curv.mjs` (radios de curva).
