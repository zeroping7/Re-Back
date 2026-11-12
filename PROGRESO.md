# PROGRESO — Re-Back

Juego de carreras de coches RC para Android inspirado en Re-Volt.
Stack: Three.js (low-poly) + Rapier (físicas) + Vite, empaquetado con Capacitor 8.

- **Jugar en el navegador:** https://zeroping7.github.io/Re-Back/
- **APK (última versión):** https://zeroping7.github.io/Re-Back/re-back.apk
  (alternativa: https://github.com/zeroping7/Re-Back/releases/latest)

## Estado: fases 1-5 hechas ✅ + disciplinas Drift y Obstáculos — ahora puliendo (ver `specs/`)

### Batalla: la IA sube a lo alto ✅ (UX-26)
- Rutas de subida a la caja, la silla y la mesa; la estrella sale a veces arriba. Prueba: `node tests/climb.mjs`. **Pendiente:** probar en el móvil; quedan paredes (UX-27) y 8 coches (UX-28).

### Batalla: looping con física ✅ (UX-25)
- Ya no se recorre solo: la gravedad frena al subir, el gas empuja y, si arriba vas lento, el coche se despega y cae. Con el turbo de la entrada y a fondo se da entero. **Pendiente:** probarlo en el móvil (si cuesta demasiado: turbo de entrada `1.4` o radio `R: 4.5` en `src/battle.js`).

### Batalla: rampas macizas ✅ (UX-24)
- Las rampas de la arena son cuñas cerradas hasta el suelo: ya no hay hueco debajo. **Pendiente (uno a uno):** IA que sube a lo alto (UX-26), paredes (UX-27), 8 coches (UX-28).

### La maqueta · bajada en el menú ✅ (CRW-26)
- Sale como pista propia en Obstáculos (carrera, contrarreloj…), con su propio récord, fantasma y medalla.

### Copa Obstáculos: 2ª carrera = La maqueta · bajada ✅ (CRW-25)
- `senda:rev` ya no es un trozo del bucle oculto: sale de B (arriba) y baja hasta A con los mismos 9 obstáculos en orden inverso. Misma montaña; montículos de arena en el mismo sitio que en la subida. IA ≈ 172 s.

### Salón: rampa, turbos y cuestas retocados ✅
- Rampa con el mismo parqué que el suelo, turbos fijos en [42,-36] y [6,14] (sin el de debajo de la mesa) y tres cuestas grandes (h 3) en el tramo central. Ajustado con el visor de circuitos.

### Minimapa de tramos A→B ✅ (CRW-24)
- Solo salida→meta.

### La maqueta: trayecto más realista ✅ (CRW-23)
- Camino, rocas, guijarros, hierba, ladera y bruma. Solo visual. **Pendiente:** rendimiento en el móvil.

### La maqueta: aspecto de maqueta ✅ (CRW-22)
- Montaña pintada, árboles de espuma, base con marco y placa, fondo pintado, mesa de taller con objetos gigantes, habitación. Solo visual. **Pendiente:** ver rendimiento en el móvil.

### La maqueta: suelo sin parpadeo ✅ (CRW-21)
- El prado estaba en el mismo plano que la base de la montaña. **Pendiente:** verlo en el móvil.

### La maqueta: subida de 15° ✅ (CRW-20)
- Pendiente 15° (antes 20°), par de crawlers como antes. **Pendiente:** probarlo en el móvil.

### La maqueta: subida de 30° de A a B ✅ (CRW-18)
- Montaña en zigzag, meta arriba, una sola pasada, obstáculos inclinados con la cuesta; crawlers con más par. IA: 180-220 s. **Pendiente:** probarlo en el móvil.

### La maqueta sin nombres ni carteles ✅ (CRW-17)
- Sin aviso «Obstáculo n/N» ni postes/carteles; checkpoints internos intactos. **Pendiente:** verlo en el móvil.

### Rally sin guardabarros ✅ (COC-24)
- `noArches` en el Rally. **Pendiente:** verlo en el móvil.

### Humo de escape en los coches nitro ✅ (COC-23)
- Sale por la boca de cada escape (Tanque y Yeti 2 chimeneas, Fórmula 2 tubos, Rally, Bisonte, Katana y Cometa 1). Según las vueltas del motor (misma fórmula que el sonido): a ralentí algo de humo; al subir, menos humo pero con más fuerza; desde 1/3 de vueltas nada; al bajar de 1/3 vuelve a empezar. Los eléctricos no sacan.
- Código en `src/exhaust.js` (curva y emisión), bocas en `userData.exhausts` de `carModel.js`, sistema de partículas propio `effects.exhaust`. Pruebas: `node tests/exhaust.mjs`; capturas: `node tests/exhaustshot.mjs http://localhost:4173/ tests/shots rally,tanque`.
- **Pendiente:** probarlo en el móvil (cantidad de humo a ralentí y alcance con vueltas altas; se ajusta en `src/exhaust.js`: `PUFFS_IDLE`, `smokeAt`).

### Saeta retirada del juego ✅ (COC-22)
- Quitada de `cars.js`, `carperf.js` y de los perfiles guardados. Quedan 17 coches.

### Más retoques de coches desde el visor 3D ✅ (COC-20, COC-21)
- Saeta, Katana, Patín y Trompo sin aletas; aletines del Yeti curvados y más bajos; alerón delantero de la Fórmula adelantado.
- Escape solo en los coches nitro (Rally, Saeta y Yeti nuevos; se quita en Patín, Humo, Trompo y Morsa).
- **Pendiente:** revisarlos en el móvil.

### Retoques de coches desde el visor 3D ✅ (COC-18, COC-19)
- Rally: aletas planas. Flecha y Bisonte: sin aletas. Bisonte: alerón más alto. Yeti: barra de focos en el techo.
- Neumáticos: talón y flanco proporcionales a la rueda (sin hueco con la llanta ni centro hundido); cambia el aspecto de casi todos los coches.
- **Pendiente:** revisarlos en el móvil.

### Furgo: sin aletas, con parabrisas y sin parpadeo ✅ (COC-17)
- Retocada primero en el visor 3D (artefacto de Claude) y subida después. Quitados los arcos negros de las ruedas, parabrisas visible en la pendiente del capó, cristal lateral sin parpadeo (`polygonOffset`) y dorsal más bajo.
- **Pendiente:** verlo en el móvil.

### Espejo sin fallos de textura ✅ (CIR-28)
- Causa: la escala X negativa del espejo + `mergeStatic` dejaba las caras al revés (suelo, paredes y carteles desaparecían). Ahora se gira el sentido de las caras al fusionar; el texto de carteles, latas, cajas y libros sale legible. Revisados los 8 circuitos con `tests/mirror.mjs`.
- **Pendiente:** probar en el móvil (sobre todo Copa Platino, que usa espejo).

### Garaje desde las tarjetas + quitar/poner mejoras ✅ (UX-22, UX-23)
- Cada coche de preparar carrera/campeonato tiene un botón 🔧 que abre el garaje en ese coche; «←» vuelve al menú.
- En el Taller, cada mejora comprada se puede quitar o poner **nivel a nivel** con «−»/«+» (guardado en `profile.inst`); solo cuentan los niveles montados en medidores y en carrera. Prueba: `node tests/garagebtn.mjs http://localhost:4173/?test`.
- **Pendiente:** probar en el móvil el tamaño del botón 🔧 y la fila del Taller.

### Rendimiento coherente con los medidores ✅ (COC-06, COC-07, DRI-17)
- Carrera: Pulga arranca más fuerte; Flecha y Fórmula más rápidas. Drift: cada coche tiene su potencia y giro (`dk`). Obstáculos intacto.
- Medidores (tarjetas y garaje) calculados de medidas reales (`src/carperf.js`, `node tests/carprobe.mjs <race|drift> --check`), con decimales y mejoras incluidas.
- **Volver atrás**: rama `backup-v1.0.56-antes-rendimiento` (y release/APK v1.0.56).

### Motores RC realistas, uno por coche ✅ (AUD-13)
- 8 sonidos base (4 eléctricos, 4 nitro) en bucles por régimen de vueltas y gas/sin gas (`src/assets/engines.bin`, 2,9 MB; generador en `tools/engines/make_engines.py`). Cada coche tiene `sound: [base, tono]` en `cars.js` y los 18 son distintos (tabla en `specs/08-audio.md`); los rivales cercanos suenan con el suyo. Si las muestras no cargan, vuelve el motor sintetizado de antes.
- Pruebas: `node tests/sounds.mjs`, `tests/engine.mjs` (nivel y clics) y `tests/engine-game.mjs`. **Pendiente:** oído en el móvil (nivel del motor, tonos entre coches parecidos como Patín/Flecha/Trompo).

### Drift: los golpes anulan el combo ✅ (DRI-16)
- Cualquier golpe (también pequeño; el roce no) pone el combo a 0 y la puntuación pendiente se rompe en rojo en el marcador. Medallas Cocina/Garaje 2000/4000/6500 (la IA pierde combos al tocar bordes). **Pendiente:** probar en el móvil si el umbral de golpe (2,4 u/s) es el justo.

### Drift: física de coche realista pero fácil ✅ (DRI-15)
- Nuevo `src/driftPhysics.js`: neumáticos por rueda, transferencia de peso, tracción trasera, contravolante automático, freno de mano y donut. El modelo por ángulo (DRI-14) se descartó.
- Panel «Ajustar derrape» con parámetros nuevos (clave de guardado v4). **Pendiente:** probar en el móvil y ajustar con el panel; recalibrar medallas con partidas reales.

### Drift: valores de fábrica anteriores ✅ (DRI-13)
- Agarre trasero 0.08, delantero 0.12, derrapando 0.15, lateral 0.01; gas 0.65; giroscopio 0.2; ángulo antes de trompo 1.85; anti-trompo 0; baile 4 Hz. Clave de guardado v2.

### Jardín: puerta de la casa quitada ✅
- Parpadeaba al solaparse con una ventana en la fachada; eliminada.

### Drift más ancho, sonidos de tierra/agua, parque ✅ (DRI-08, AUD-12)
- Drift: pista 6,6 (antes 5,5); Cocina y Garaje siguen terminando sin atascos. **Pendiente:** recalibrar medallas con pruebas reales (más ancho = más puntos fáciles).
- Agua/barro/arena: sonidos de entrada con ataque suave (sin chasquido), burbujas y capa continua al rodar. **Pendiente:** oído en el móvil.
- Parque: la rampa vuelve a verse con el caucho (sin textura del tobogán).
- Regla en `CLAUDE.md`: decir siempre el número de versión al publicar.

### Rampas, cuestas y bordes sin parpadeo ni escalones ✅ (CIR-26, CIR-27, OBJ-TIRON)
- Sin `polygonOffset` fuerte en rampas (tapaba la tierra del jardín: rampa de madera); realce de 1,5 cm solo en los extremos; las mallas no proyectan sombra; el sol se ajusta a la rejilla de sombras.
- Bordes partidos en trozos de ≤ 5° en curvas cerradas (sin escalones por el interior). Jardín: rampa de tierra como antes.
- Armas: shaders precompilados antes de la carrera; agua sin `transmission`.
- **Pendiente:** probar en el móvil salón (rampa de salida y S), súper (primer salto), jardín (primera rampa y cuestas) y disparar todas las armas.

### El salón: rampa y segunda curva ✅ (CIR-25)
- Rampa de salida: sin parpadeo azul (desplazamiento de profundidad + dibujo 1,2 cm sobre el suelo, en todos los circuitos).
- Segunda curva: la S era casi una horquilla (radio ≈ 3,5) con la cuesta encima; trazado más abierto, cuesta movida a la recta anterior y bordes inclinados con la pendiente.
- **Pendiente:** probar en el móvil la S y la rampa de salida.

### Menús: coche siempre visible ✅ (UX-19)
- Preparar carrera, campeonato y garaje: paneles a la izquierda (58 %) y coche entero en la zona libre de la derecha; cada coche arranca la peana de frente en 3/4.
- **Pendiente:** probar en el móvil el encuadre (`src/showroom.js`: `off` de la vista `car`, `FRONT_34`; `src/style.css`: bloque UX-19).

### Clips en todas las curvas + ajuste del derrape ✅ (DRI-12, DRI-13)
Clips en todas las curvas de Club y Garaje nocturno. Botón 🎛 en la pausa y en la preparación de Drift para probar valores en vivo y copiarlos.

### «Más coches» vuelve al menú de origen ✅ (UX-21)
Desde el garaje abierto por «Más coches», «Usar este» y «←» devuelven a la carrera/campeonato.

### Versión en pantalla de inicio y menú principal ✅ (UX-20)
- Abajo a la derecha (`v1.0.N`, igual que el APK); se actualiza sola en cada compilación del CI.

### Disciplinas: Drift y Obstáculos ✅ (specs/11-disciplinas.md)
- Menú: **Jugar** abre el selector de disciplina (Carrera · Drift · Obstáculos), cada una con sus modos, circuitos, coches y copa.
  Drift se abre con la Copa Bronce y Obstáculos con la Plata (entre los 3 primeros); al abrirse regalan su coche básico.
- **Drift** (por puntos): conducción arcade propia (el volante cruza el coche y el gas lo sostiene), combo con multiplicador ×1-×5
  que se pierde al tocar un muro o hacer un trompo. Modos Puntuación (solo, medallas), Duelo y Copa Derrape.
  Circuitos (pistas de drift RC reales, compactas y estrechas, con zonas de clip, conos, tarima de pilotos y boxes):
  El club de drift y El garaje nocturno. Coches (turismos de drift rebajados, salida patinando): Patín, Humo, Trompo,
  Bisonte y Katana (+ Bólido, Flecha y Saeta).
- **Obstáculos**: rampas-libro, puentes sin bordes, eslalon, barreras que van y vienen, barras giratorias, ventilador, cascadas,
  badenes y jabón. Modos Contrarreloj (solo, medallas y fantasma), Carrera y Copa Obstáculos.
  Circuitos: El escritorio y El fregadero. Coches: Cabra, Oruga, Yeti (+ Tanque, Morsa y Rally).
- Garaje con pestañas por disciplina; cada disciplina recuerda su coche.
- **Pendiente de ajustar con pruebas reales**: tacto del derrape, puntos y tiempos de las medallas (salen de simulaciones con la IA).

### Fase 1 — Conducción ✅
- Coche con controlador de vehículo por rayos de Rapier: suspensión real, 4x4 con reparto trasero,
  freno, marcha atrás, derrape (freno + giro), control en el aire, antivuelco, carga aerodinámica.
- Ajuste por defecto elegido por el usuario: tracción trasera 90 %, freno 10, giro máx. 0,3.
- Dirección más progresiva (menos brusca) y giro extra a baja velocidad para maniobrar en parado (FIS-24, FIS-25).
- Valores de conducción fijos (el panel ⚙ de ajustes se quitó para evitar trampas; los ajustes guardados se borran).

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
- Icono propio (adaptativo; desde nov. 2026 el buggy rojo saltando sobre rayos naranjas, PLA-05), pantalla de carga, nombre "Re-Back", versión 1.0.N, horizontal, pantalla completa.
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
- **Motores nuevos**: eléctrico con zumbido, piñones y escobillas; nitro con explosiones, escape rasposo y petardeos; rivales con efecto Doppler.
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

### Gran ampliación (petición 15, noviembre 2026)
- **Cámara**: 👀 mirar atrás (botón, Q, LB o stick derecho pulsado) y stick derecho para girar la cámara.
- **Variantes**: cada circuito **Al revés** (se abre con la Copa Plata) y en **Espejo** (con la Copa Oro), con físicas reflejadas.
- **Copa Platino** 💎 (se abre con Oro): circuitos al revés y en espejo, premio 10.000. Plata y Oro ahora con 4 carreras.
- **Fantasma** 👻 en Contrarreloj (tu mejor vuelta por circuito y variante) y **Repetición** 🎬 con cámaras de TV.
- **Música** con estrofa/estribillo y canción propia por circuito y para la batalla.
- **Coches**: Morsa, Grillo, Saeta y el secreto **Cometa** (todas las estrellas ⭐).
- **Circuitos**: Museo de noche, El muelle y Parque infantil (arena que derrapa), con ambiente sonoro propio.
- **Batalla de la Estrella** ⭐ en el Cuarto de juegos: relojes de 60 s, robar tocando o disparando.
- Pendiente para más adelante: **editor de circuitos** y **multijugador** (pantalla partida con dos mandos y luego online).
- Pruebas nuevas: `tests/camera.mjs`, `tests/variants.mjs`, `tests/replay.mjs`, `tests/battleui.mjs`; `node tests/racesim.mjs arena 3` simula una batalla.

### Arreglos (petición 16)
- Barro, agua, arena, cera y fregado: resbalan menos y el coche no se va de trompo; el charco frena sin bloquear ruedas.
- Rampas de salto con rampa de aterrizaje y plataforma (sirven al revés); estrella oculta sobre la plataforma.
- Arena de batalla rehecha con pasillos libres para las rampas.
- Parado, freno + giro ya no hace arrancar el coche (la marcha atrás se mete con el freno solo).

### Arena nueva y cohetes (petición 18)
- Arena de batalla: looping de juguete, subida suelo → silla → mesa → bajada, caja central sin plataformas sueltas.
- Ya no se recoloca el coche al chocar con esquinas.
- Cohetes: siempre a un rival de delante, explotan en paredes y no dañan a quien los lanza.

### Online hasta 10 jugadores (en curso) 🚧
- Servidor propio en Oracle Cloud Always Free (Madrid): `server/` (Node + `ws`) con salas por código de 4 letras,
  máx. 10, anfitrión, salida sincronizada, eventos e instantáneas binarias a 20 Hz.
- Cliente `src/net.js`: reloj sincronizado, envío de estado (52 B) e interpolación a 100 ms con extrapolación.
- Prueba de carga `node server/test/load.mjs`: 10 jugadores, 19,8 instantáneas/s, 10,5 KB/s por jugador.
- Despliegue automático (`.github/workflows/server.yml`) con Caddy y HTTPS (`wss://<ip>.sslip.io`).
- Pendiente: crear la máquina en Oracle y los secrets `ORACLE_HOST` / `ORACLE_SSH_KEY`; menú Online (NET-07)
  y carrera online (NET-08).

## Obstáculos 2.0 (crawler park) — en curso
- Hecho: física de crawler (`crawlTuning`, `Car.crawl`), circuito 1 **La maqueta** (`senda`: diorama sobre mesa, camino único de 2,6 u, 9 obstáculos obligatorios en `crawlkit.js`, decorado en `diorama.js`), puertas numeradas con reaparición en la puerta del obstáculo, sin choques entre coches. Retoques de dificultad (CRW-13): óvalo más corto con obstáculos casi seguidos, escalones ×4, arena que frena con montículos, troncos y rocas aleatorios mucho más densos, puente tibetano alto y estrecho. Segunda subida (CRW-14): escalones ×2 con 24 peldaños, +50 troncos, rampa ×2, montículos ×2 y rocas ×2 en vado/cuesta/jardín. IA: vuelta ≈ 150–190 s (Rally ≈ 170–230 s). Herramienta `tests/shot.mjs` (capturas por obstáculo).
- Pendiente: validar tacto con el usuario (dificultad, medallas 270/220/180); selector de rivales (CRW-04); circuitos 2 (naturaleza volcánica con arroyo) y 3 (jardín/garaje gigante); coches crawler (CRW-06).
