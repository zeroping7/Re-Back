# 11 · Disciplinas: Carrera, Drift y Obstáculos

El juego se organiza en **3 disciplinas**. Cada una tiene sus circuitos, sus coches, sus modos y su copa.
Las monedas y el garaje son comunes. Código: `src/disciplines.js`.

| Disciplina | Se abre con | Cómo se gana | Armas |
|---|---|---|---|
| 🏁 Carrera | Desde el principio | Llegar primero | Sí |
| 💨 Drift | Copa Bronce (entre los 3 primeros) | Más **puntos** de derrape | No |
| 🧗 Obstáculos | Copa Plata (entre los 3 primeros) | Mejor tiempo / llegar primero | No |

## Menús

| ID | Requisito | Estado |
|---|---|---|
| DIS-01 | Menú principal: **Jugar**, Batalla, Garaje, Opciones. "Jugar" abre el selector de disciplina: 3 columnas, cada una con sus modos. Las bloqueadas enseñan el candado y qué copa las abre | ✅ |
| DIS-02 | Dentro de una disciplina el flujo es el de siempre (circuito → coche → opciones). Las listas de circuitos, coches y copas salen **filtradas** por disciplina | ✅ |
| DIS-03 | **Garaje con pestañas** por disciplina. Cada disciplina recuerda su último coche usado | ✅ |
| DIS-04 | Al abrirse una disciplina se **regala su coche básico** (Drift: Patín · Obstáculos: Cabra) y se avisa en el podio | ✅ |
| DIS-05 | Pantalla de carga, pausa y resultados adaptados (puntos en Drift, medallas en los modos en solitario) | ✅ |

## Drift

| ID | Requisito | Estado |
|---|---|---|
| DRI-01 | **Puntos**: mientras el coche va de lado (ángulo > 12º, a más de 7 u/s, con ruedas en el suelo) suma `velocidad · ángulo · 6` por segundo en un **combo** | ✅ |
| DRI-02 | **Multiplicador** ×1 → ×5: sube uno cada 1,6 s de derrape seguido; se mantiene si se enlaza otro derrape antes de 1 s | ✅ |
| DRI-03 | El combo **se cobra** al acabar el derrape (1 s sin ir de lado). **Se pierde** con un golpe fuerte o al recolocar el coche. Solo suma puntos **avanzando por la pista** (no vale dar vueltas en un sitio). Girar de culo o en trompo no corta el combo | ✅ |
| DRI-04 | **Física de RC de drift con giroscopio** (`DRIFT` en `src/car.js`): tracción trasera y ruedas duras (agarre trasero ×0,13, delantero ×0,2); el volante gira el coche; **el gas lo cruza más** (sobreviraje, más cuanto más cruzado y con más volante): con gas y volante a tope sin contravolante se va a ~55º y bailando; **contravolante + gas** lo sujeta (~30º); soltar volante lo endereza (giroscopio 0,55 en el jugador, 1 en la IA); el gas sostiene la velocidad aunque patine. Anti-trompo suave a partir de 66º salvo que se busque el trompo. Medido con `tests/driftprobe.mjs` (scripts gas, counter, half, straight, spin, donut, launch) | ✅ |
| DRI-05 | Modos: **Puntuación** (solo, 2 vueltas, medallas 🥉🥈🥇 por puntos) y **Duelo** (1-3 rivales, gana quien más puntos tenga al acabar las vueltas el jugador; a los rivales que no han acabado se les proyecta la puntuación) | ✅ |
| DRI-06 | Marcador: puntos totales, combo en curso con su multiplicador (parpadea al cobrarse o perderse) y, en Duelo, puesto por puntos | ✅ |
| DRI-07 | La IA derrapa: no levanta el gas en las curvas (el gas sostiene el derrape) y entra más rápido; no usa objetos. En simulación hace 2.400–8.700 puntos en 2 vueltas según el coche | ✅ |
| DRI-08 | Circuitos de drift **compactos y estrechos** (ancho 5,5 u, la mitad que antes; trazado encogido ×0,7 para que las curvas vayan seguidas), sin rampas, armas ni turbos: **La cocina encerada** y **El garaje** | ✅ |
| DRI-09 | **Pista de drift RC real**: suelo de losetas de plástico, pista pintada con líneas blancas y goma, bordes bajos blancos, **zonas de clip** numeradas en el exterior de las curvas (derrapar pegado al exterior da +150 + 50×multiplicador, una vez por paso), conos que se pueden tirar en el vértice, pilas de neumáticos, **tarima con pilotos gigantes** que siguen tu coche con la mirada, boxes con coches y cargadores, calle en miniatura (farolas, tiendas, máquinas) y pancartas/LED. Circuitos: **El club de drift** (de día) y **El garaje nocturno** (neones) | ✅ |
| DRI-10 | **Salida de RC de drift**: mucho par (0→20 u/s en 0,67-1,0 s), las traseras patinan con humo y marcas, y la cola sale ~40-45º hacia un lado al azar y vuelve (sin dar la vuelta si no giras) | ✅ |
| DRI-11 | **Donuts y trompos**: parado (o despacio), gas + volante a tope = **donut** girando en el sitio (~3 vueltas en 6 s); en marcha, gas + freno + volante = **trompo** de 360º. Un 360º en marcha da +300 × multiplicador; un donut parado, +40 (máx. 3 por vuelta) | ✅ |

## Obstáculos

| ID | Requisito | Estado |
|---|---|---|
| OBS-01 | Recorridos estrechos con obstáculos: **rampas-libro**, **puente de reglas** sin bordes, **eslalon** de lápices/botes, **barreras que van y vienen**, **barras giratorias**, **ventilador** y **cascada** que empujan de lado | ✅ |
| OBS-02 | Si te caes o te sales, el coche vuelve a la pista en el último punto (más rápido que en Carrera: 0,9 s fuera) | ✅ |
| OBS-03 | Modos: **Contrarreloj** (solo, 1 vuelta = recorrido completo, medallas por tiempo, fantasma de tu mejor vuelta) y **Carrera** (rivales a la vez, 2 vueltas) | ✅ |
| OBS-04 | La IA esquiva los obstáculos (fijos y móviles) cambiando de carril y frena antes de los estrechos | ✅ |
| OBS-05 | Los obstáculos móviles son deterministas (dependen del tiempo de carrera) para que el fantasma y la repetición coincidan | ✅ |
| OBS-06 | Circuitos: **El escritorio** (libros, reglas, lápices, ventilador) y **El fregadero** (cascada del grifo, esponjas, pastillas de jabón resbaladizas, patitos) | ✅ |

Nota de diseño: los recorridos son **circuitos cerrados** (salida y meta en el mismo sitio), no de A a B,
para reutilizar vueltas, minimapa, IA, recolocación y variantes al revés/espejo.

## Obstáculos 2.0: crawler park (aprobado, 📝 pendiente)

Lo de arriba (OBS-01..06: escritorio y fregadero con barreras móviles) **se sustituye** por un *crawler park*
como en las fotos de referencia del usuario: todoterrenos lentos y precisos superando obstáculos de madera,
troncos y roca. Decidido el 10-11-2026.

| ID | Requisito | Estado |
|---|---|---|
| CRW-01 | **Física de crawler** (`discTuning` y `Car.crawl`, solo en Obstáculos): velocidad máx. ~50 %, mucho par a baja velocidad, mucho agarre, suspensión de más recorrido y blanda, dirección lenta y precisa, **freno motor fuerte** (no se desliza hacia atrás en las cuestas), antivuelco más suave (puede volcar de lado) | ✅ |
| CRW-02 | **Obstáculos** (piezas reutilizables): puente tibetano de tablillas que se balancea, puente de troncos/rampa de dos raíles, escalones de madera, pila de troncos sueltos, cuesta de roca con escalones, obstáculo lateral (coche muy inclinado), pasarela elevada estrecha sin barandilla, banco de arena, túnel | 📝 |
| CRW-03 | **Trial**: recorrido por tramos con **puertas** (pares de postes) en orden. Resultado = tiempo + penalizaciones: puerta fallada, caerse de un obstáculo, salirse del recorrido, tocar un poste. Al caerse se vuelve al inicio del obstáculo | 📝 |
| CRW-04 | **Rivales a elegir** antes de empezar: fantasmas a la vez (no chocan), por turnos (cada uno su recorrido, se comparan resultados) o todos juntos chocando | 🚧 Por ahora: fantasmas (los coches no chocan entre sí en Obstáculos; falta el selector) |
| CRW-05 | **Escenarios**: tapete de tierra y césped en interior (piezas de madera), jardín exterior (tierra, arena, troncos, rocas, musgo) y montaje de feria en centro comercial (montaña de roca, puentes, pista alrededor) | 📝 |
| CRW-06 | Coches de Obstáculos rehechos como **crawlers** estrechos y altos (todoterrenos de escala con baca, faros, rueda de repuesto) | 📝 |
| CRW-07 | Se quitan los circuitos El escritorio y El fregadero (hecho; `kit.js` aún conserva sus piezas sin uso) | ✅ |
| CRW-09 | **Circuito 1 · La maqueta** (`senda`): diorama sobre mesa (cortinas azules con luna al fondo, tapete de césped, montaña de roca en el centro, pinos y cinta de balizar). **Un solo camino estrecho** (2,6 u, ~4 coches de ancho) con muros de roca a los dos lados: no hay forma de esquivar los obstáculos, todos ocupan el ancho completo | ✅ |
| CRW-10 | **Obstáculos de La maqueta**, en este orden: 1 escalones de madera · 2 pila de troncos sueltos · 3 rampa doble de troncos · 4 puente de troncos cubierto (dos raíles) · 5 banco de arena · 6 vado de agua con rocas · 7 cuesta de roca · 8 jardín de rocas · 9 puente tibetano de tablillas sin barandilla. Orden y números vigentes tras CRW-13 (vuelta de IA ≈ 145 s; medallas 220/180/150 s) | ✅ |
| CRW-11 | **Puertas numeradas**: cada obstáculo empieza con una puerta (dos postes con bandera y número). Al cruzarla el marcador avisa «Obstáculo n/N». Si vuelcas, te caes o te sales **reapareces en la puerta del obstáculo en el que estabas** (no donde caíste) | ✅ |
| CRW-12 | Es un recorrido de **A a B con checkpoints**: 1 vuelta = el recorrido entero y la meta está donde la salida (el circuito se cierra para reutilizar IA, fantasma y minimapa) | ✅ |
| CRW-13 | **Retoques de dificultad de La maqueta** (petición #31): circuito más corto con obstáculos casi seguidos (1,3-4,5 u entre ellos) · 1 escalones ×4 de alto (12 peldaños, más empinados) · 2 troncos ×5+ aleatorios · 3 rampa de troncos más alta con troncos sueltos aleatorios · 5 arena blanda que frena (`fx.sand`) con montículos aleatorios de distinta altura · 6 vado lleno de rocas de formas y tamaños aleatorios · 7 cuesta de roca densa · 8 jardín de rocas mucho más denso y aleatorio · 9 puente más alto, rampas más largas y empinadas y calzada casi justa para el coche. Criterio: la IA sigue terminando sin atascos (`racesim senda`), vuelta de la IA ≈ 140-150 s sin reapariciones (coches de Obstáculos); medallas 220/180/150 s. Detalles: arena `fx.sand` (frena y resta agarre), raíles del puente con viga de colisión plana, puente tibetano 1,2 u de ancho con barranco bajo los lados | ✅ |
| CRW-14 | **Segunda subida de dificultad** (petición #32): 1 escalones al doble de alto con 24 peldaños · 2 +50 troncos · 3 rampa de troncos al doble de alta y más troncos encima · 5 arena con el doble de montículos y alturas muy dispares · 6 vado con el doble de rocas · 7 cuesta de roca +32 rocas · 8 jardín de rocas +50 rocas, unas mucho más grandes que otras. Criterio: la IA sigue terminando (`racesim senda` y `senda:rev` con cabra/oruga/yeti/tanque/rally); medallas recalibradas (270/220/180 s). Ajustes: suspensión mínima 0,48 en crawler (coches bajos como el Rally), troncos y rocas planas algo más bajos | ✅ |
| CRW-08 | Orden: primero el circuito 1 hasta dejarlo fino con el usuario; después los escenarios 2 (naturaleza volcánica con arroyo) y 3 (jardín/garaje gigante). Cada circuito tiene una sola ambientación coherente | 🚧 |

## Coches

| ID | Requisito | Estado |
|---|---|---|
| DCO-01 | Cada coche indica en qué disciplinas corre (`disc`). Los de siempre son de Carrera | ✅ |
| DCO-02 | Coches de **Drift** con aspecto de turismo RC de drift real (carrocerías bajas, kit ancho, caída negativa, llantas de radios, sin antena, sin marcas reales): **Patín** (descapotable, gratis al abrir), **Humo** (berlina cuadrada de los 80 con aletas anchas), **Trompo** (compacto bicolor de portón), **Bisonte** (deportivo americano con compresor) y **Katana** (cupé de los 90 con alerón) | ✅ |
| DCO-03 | Coches de **Obstáculos**: Cabra (gratis al abrir), Oruga, Yeti. Camiones lentos con ruedas grandes, suspensión larga y mucho agarre | ✅ |
| DCO-04 | Coches de Carrera que también valen: **Bólido, Flecha y Saeta** en Drift; **Tanque, Morsa y Rally** en Obstáculos | ✅ |
| DCO-05 | Los rivales de Drift y Obstáculos salen de los coches de esa disciplina | ✅ |

## Economía

| ID | Requisito | Estado |
|---|---|---|
| DEC-01 | **Medallas** en los modos en solitario: bronce 300 🪙, plata 600, oro 1.000 la primera vez que se consigue cada una; repetir sin mejorar da 100 | ✅ |
| DEC-02 | Duelo de Drift y Carrera de Obstáculos pagan como una carrera normal (ECO-02) | ✅ |
| DEC-03 | **Copa Derrape** (cocina → garaje → cocina al revés) y **Copa Obstáculos** (escritorio → fregadero → escritorio al revés): 3 pruebas con puntos, premio 4.000 | ✅ |

## Medallas (valores actuales)

| Circuito | 🥉 | 🥈 | 🥇 | Referencia (IA con el coche básico, en solitario) |
|---|---|---|---|---|
| El club de drift | 2.000 pts | 4.500 | 8.000 | ~3.000 pts |
| El garaje nocturno | 2.000 pts | 4.500 | 8.000 | ~3.600 pts |
| El escritorio | 1:22 | 1:10 | 1:01 | 1:00 |
| El fregadero | 1:22 | 1:10 | 1:01 | 1:00 |

**Calibración pendiente**: estos umbrales y el tacto del derrape salen de simulaciones con la IA
(`node tests/racesim.mjs`, `tests/driftprobe.mjs`), no de partidas reales: hay que ajustarlos con lo que
cuente el usuario al probar en el móvil.

## Pruebas

- `node tests/racesim.mjs <cocina|garaje> 3 2 patin` y `<escritorio|fregadero> 3 2 cabra` (también `:rev` y `:mirror`): todos terminan.
- `node tests/overlap.mjs <circuito>`: el trazado no se pisa y lista las curvas más cerradas.
- `node tests/driftprobe.mjs cocina patin <gas|half|straight>`: ángulo, velocidad y radio del derrape.
- `node tests/disc.mjs` (Chrome headless): selector, preparación, garaje por pestañas, carreras y resultados. `?fast=N` acelera la carrera en modo prueba.
