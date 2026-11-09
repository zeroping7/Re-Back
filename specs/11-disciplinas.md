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
| DRI-03 | El combo **se cobra** al acabar el derrape (1 s recto). **Se pierde** si se toca un muro u otro coche con fuerza, se hace un trompo (ir marcha atrás) o hay que recolocar el coche | ✅ |
| DRI-04 | **Conducción de drift arcade** para todos los coches en esta disciplina (`src/car.js`, bloque DRIFT): tracción trasera, ruedas con muy poco agarre lateral (trasero ×0,13, delantero ×0,2), el **volante manda sobre el giro del coche** (hasta 1,16 rad/s × giro del coche), el **gas sostiene la velocidad** aunque patine (empuje ∝ potencia del coche), al soltar el volante **se endereza solo**, anti-trompo a partir de 54º y ayuda de frenado. Medido con `tests/driftprobe.mjs`: volante a tope + gas → derrape estable de ~43º a 14 u/s; medio volante → ~13º; volante suelto → recto en < 1 s | ✅ |
| DRI-05 | Modos: **Puntuación** (solo, 2 vueltas, medallas 🥉🥈🥇 por puntos) y **Duelo** (1-3 rivales, gana quien más puntos tenga al acabar las vueltas el jugador; a los rivales que no han acabado se les proyecta la puntuación) | ✅ |
| DRI-06 | Marcador: puntos totales, combo en curso con su multiplicador (parpadea al cobrarse o perderse) y, en Duelo, puesto por puntos | ✅ |
| DRI-07 | La IA derrapa: no levanta el gas en las curvas (el gas sostiene el derrape) y entra más rápido; no usa objetos. En simulación hace 2.400–8.700 puntos en 2 vueltas según el coche | ✅ |
| DRI-08 | Circuitos de drift **compactos y estrechos** (ancho 5,5 u, la mitad que antes; trazado encogido ×0,7 para que las curvas vayan seguidas), sin rampas, armas ni turbos: **La cocina encerada** y **El garaje** | ✅ |
| DRI-09 | **Pista de drift RC real**: suelo de losetas de plástico, pista pintada con líneas blancas y goma, bordes bajos blancos, **zonas de clip** numeradas en el exterior de las curvas (derrapar pegado al exterior da +150 + 50×multiplicador, una vez por paso), conos que se pueden tirar en el vértice, pilas de neumáticos, **tarima con pilotos gigantes** que siguen tu coche con la mirada, boxes con coches y cargadores, calle en miniatura (farolas, tiendas, máquinas) y pancartas/LED. Circuitos: **El club de drift** (de día) y **El garaje nocturno** (neones) | ✅ |
| DRI-10 | **Salida de RC de drift**: mucho par (0→20 u/s en 0,7-1,0 s, antes 1,5-1,7 s), las ruedas traseras patinan con humo y marcas, y la cola baila a un lado al azar (~12º) hasta coger velocidad. Medido con `tests/driftprobe.mjs <circuito> <coche> launch` | ✅ |

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
