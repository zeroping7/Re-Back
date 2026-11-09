# PROGRESO — Re-Back

Juego de carreras de coches RC para Android inspirado en Re-Volt.
Stack: Three.js (low-poly) + Rapier (físicas) + Vite, empaquetado con Capacitor 8.

- **Jugar en el navegador:** https://zeroping7.github.io/Re-Back/
- **APK (última versión):** https://zeroping7.github.io/Re-Back/re-back.apk
  (alternativa: https://github.com/zeroping7/Re-Back/releases/latest)

## Estado: fases 1-5 hechas ✅ — ahora puliendo para parecerse lo máximo a Re-Volt (ver `specs/`)

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

### Diversión extra (v1.0.12+)
- Listas de tarjetas (coches/circuitos) deslizables con el dedo.
- Cuestas arriba y abajo en los tres circuitos (`hills` en `buildCircuit`: malla con colisión y bordes que suben).
- Zonas de derrape controlable (`trackPatch` + `fx.slide`): suelo encerado (salón), fregado (súper), barro (jardín).
- Flechas de turbo en el suelo.
- Objetos sueltos para tirar: bolos, bloques, balones, latas, cajas, rollos de papel, macetas (`B.dynBox/dynCyl/dynBall`).
- Coches algo más rápidos (vel. máx. 29, potencia 145) y con menos agarre (3,0 / 2,6). Ajustes guardados reiniciados (v3).
- Recolocación con rayo hacia abajo (no aparece dentro de rampas).

### Físicas tipo Re-Volt, daños y circuitos largos (v1.0.13+)
- Rampas y cuestas sin escalones: superficies de malla continua con colisión `trimesh` + `FIX_INTERNAL_EDGES`,
  subdivididas y con el mismo suelo que el circuito (parqué/baldosas/tierra). Las rampas ocupan todo el ancho.
- Turbos colocados solos en las rectas más largas (`autoBoosts`), lejos de curvas, rampas y salida.
- Físicas más Re-Volt: motor eléctrico (mucho par al salir), suspensión blanda y saltarina, gravedad 22,
  rebotes contra muros, se endereza solo si queda apoyado de lado. Ajustes guardados reiniciados (v4).
- Daños: cada golpe fuerte abolla la carrocería justo donde choca (punto de contacto de Rapier), baja la salud,
  el coche corre menos y tira hacia un lado, la pintura se ensucia, la antena se dobla, echa humo (y fuego si está fatal).
  Barra 🔧 en el marcador. Nuevo objeto 🔧 Reparación (más probable cuanto más roto vas).
- Circuitos mucho más largos y con más curvas (salón 927 u, súper 882 u, jardín 1328 u; vueltas de 40-60 s).
- Texturas con relieve (mapas de normales): parqué, baldosas, césped, tierra con piedras y roderas, barro,
  suelo encerado, suelo fregado, agua con ondas animadas, cartón y tablones.

### Ambientación y modos estilo Re-Volt (v1.0.14+) — con Spec Driven Development
- **Specs** en `specs/` (fuente de verdad, objetivo: parecerse lo máximo a Re-Volt con contenido original) y `CLAUDE.md`.
- **Decorado despejado**: menos objetos con los que chocar; bordes bajos con muro invisible; **carteles de flechas** en curvas cerradas.
- **Cajas de energía** brillantes con rayo; armas nuevas: 🚀×3 cohetes, 🔌 pulso eléctrico, ⚫ bola de acero (munición en el botón).
- **Campeonato**: Copas Bronce, Plata y Oro (3 carreras, puntos 10·6·4·3·2·1, clasificación entre carreras,
  **podio 3D** con confeti y premio final). Plata y Oro se abren quedando entre los 3 primeros de la anterior.
- **Estrella oculta** en el salto de cada circuito (Contrarreloj): 500 🪙 la primera vez; ⭐/☆ en la tarjeta del circuito.
- **Coches con ficha**: clase (Novato → Pro), motor eléctrico o nitro (suena distinto), tracción y peso propios.
  Los rivales usan coches de la clase de la dificultad/copa.
- **3 cámaras** (Normal, Lejos, Parachoques; botón 🎥 o tecla C) y opción **acelerar solo**.
- **Menús en un taller 3D**: el coche gira en una peana sobre un banco de trabajo gigante con herramientas, lámpara y cartel;
  tipografía arcade (Russo One), botones con brillo y entrada animada.
- **Pantalla de carga** con modo, circuito, descripción y consejo (y shaders compilados antes de empezar).
- **Sonido**: ambiente por circuito (reloj en el salón, neveras y megafonía en el súper, viento y pájaros en el jardín)
  y motores de los 2 rivales más cercanos con panorama.
- Marcador con tiempo de la **última vuelta**.

## Pendiente / ideas
- Probar en el móvil: rendimiento (Opciones → Calidad si va lento) y sentido del modo inclinación.
- Contrarreloj contra fantasma de tu mejor vuelta (REF-17), editor de circuitos, multijugador (opcional).
- Más circuitos y coches; logros.

## Notas técnicas
- Escala: 1 unidad ≈ 22 cm (coches). Los circuitos se diseñan en unidades "pequeñas" y se amplían ×2
  (`createBuilder(…, S)` escala colisiones; un grupo con `scale` escala lo visual; `scaleTrack` pasa el trazado al mundo).
- Gravedad de juego 28.
- Grupos de colisión (`tracks/common.js`): los rayos de las ruedas ignoran bordes y coches; la cámara ignora coches.
- Las mallas estáticas del circuito se fusionan por material (`mergeStatic`) para reducir llamadas de dibujo.
- Depuración: `?test=1&track=super&rivals=3&auto=1&cam=top` (auto = el jugador conduce solo).
- Pruebas: ver `specs/10-plataforma.md` (`racesim`, `ui.mjs`, `star.mjs`, `spots.mjs`…).

### Previews y mando (noviembre 2026)
- Tarjetas de coche y circuito con **foto**: render 3D de cada coche y vista aérea de cada circuito
  (`public/previews/`, se regeneran con `node tests/previews.mjs` al añadir coches o circuitos).
- **Mando** Bluetooth/USB: stick/cruceta para girar, RT/A acelerar, LT/B frenar, X/RB disparar, Y cámara,
  Select recolocar, Start pausa. Menús con foco: cruceta, A elegir, B atrás, Start = ¡A correr!. Vibración del mando en golpes.
  Los botones táctiles se ocultan al usar el mando. Prueba: `node tests/gamepad.mjs`.

### Superficies realistas (noviembre 2026)
- Barro, suelo fregado, cera y agua con texturas nuevas (brillo, relieve, bordes irregulares) y orilla de barro en charco y estanque.
- Efectos: grumos de barro, salpicaduras y ondas en el agua, estelas, huellas de barro/mojadas al salir;
  el coche se ensucia con el barro y el agua lo lava. Capturas: `node tests/surfaces.mjs`.
