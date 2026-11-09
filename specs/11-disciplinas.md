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
| DIS-01 | Menú principal: **Jugar**, Batalla, Garaje, Opciones. "Jugar" abre el selector de disciplina: 3 columnas, cada una con sus modos. Las bloqueadas enseñan el candado y qué copa las abre | 🚧 |
| DIS-02 | Dentro de una disciplina el flujo es el de siempre (circuito → coche → opciones). Las listas de circuitos, coches y copas salen **filtradas** por disciplina | 🚧 |
| DIS-03 | **Garaje con pestañas** por disciplina. Cada disciplina recuerda su último coche usado | 🚧 |
| DIS-04 | Al abrirse una disciplina se **regala su coche básico** (Drift: Patín · Obstáculos: Cabra) y se avisa en el podio | 🚧 |
| DIS-05 | Pantalla de carga, pausa y resultados adaptados (puntos en Drift, medallas en los modos en solitario) | 🚧 |

## Drift

| ID | Requisito | Estado |
|---|---|---|
| DRI-01 | **Puntos**: mientras el coche va de lado (ángulo > 12º, a más de 7 u/s, con ruedas en el suelo) suma `velocidad · ángulo · 6` por segundo en un **combo** | 🚧 |
| DRI-02 | **Multiplicador** ×1 → ×5: sube uno cada 1,6 s de derrape seguido; se mantiene si se enlaza otro derrape antes de 1 s | 🚧 |
| DRI-03 | El combo **se cobra** al acabar el derrape (1 s recto). **Se pierde** si se toca un muro u otro coche con fuerza, se hace un trompo (ir marcha atrás) o hay que recolocar el coche | 🚧 |
| DRI-04 | Conducción de drift para todos los coches en esta disciplina: tracción 100 % trasera, agarre trasero ×0,62, giro ×1,3, límite de giro sobre sí mismo para que el derrape se pueda sostener con el gas | 🚧 |
| DRI-05 | Modos: **Puntuación** (solo, 2 vueltas, medallas 🥉🥈🥇 por puntos) y **Duelo** (1-3 rivales, gana quien más puntos tenga al acabar las vueltas el jugador; a los rivales que no han acabado se les proyecta la puntuación) | 🚧 |
| DRI-06 | Marcador: puntos totales, combo en curso con su multiplicador (parpadea al cobrarse o perderse) y, en Duelo, puesto por puntos | 🚧 |
| DRI-07 | La IA derrapa: en curvas tira de freno + giro para ir de lado; no usa objetos | 🚧 |
| DRI-08 | Circuitos anchos (11 u) de curvas enlazadas, sin rampas, armas ni turbos: **La cocina encerada** y **El garaje** | 🚧 |

## Obstáculos

| ID | Requisito | Estado |
|---|---|---|
| OBS-01 | Recorridos estrechos con obstáculos: **rampas-libro**, **puente de reglas** sin bordes, **eslalon** de lápices/botes, **barreras que van y vienen**, **barras giratorias**, **ventilador** y **cascada** que empujan de lado | 🚧 |
| OBS-02 | Si te caes o te sales, el coche vuelve a la pista en el último punto (más rápido que en Carrera: 0,9 s fuera) | 🚧 |
| OBS-03 | Modos: **Contrarreloj** (solo, 1 vuelta = recorrido completo, medallas por tiempo, fantasma de tu mejor vuelta) y **Carrera** (rivales a la vez, 2 vueltas) | 🚧 |
| OBS-04 | La IA esquiva los obstáculos (fijos y móviles) cambiando de carril y frena antes de los estrechos | 🚧 |
| OBS-05 | Los obstáculos móviles son deterministas (dependen del tiempo de carrera) para que el fantasma y la repetición coincidan | 🚧 |
| OBS-06 | Circuitos: **El escritorio** (libros, reglas, lápices, ventilador) y **El fregadero** (cascada del grifo, esponjas, pastillas de jabón resbaladizas, patitos) | 🚧 |

Nota de diseño: los recorridos son **circuitos cerrados** (salida y meta en el mismo sitio), no de A a B,
para reutilizar vueltas, minimapa, IA, recolocación y variantes al revés/espejo.

## Coches

| ID | Requisito | Estado |
|---|---|---|
| DCO-01 | Cada coche indica en qué disciplinas corre (`disc`). Los de siempre son de Carrera | 🚧 |
| DCO-02 | Coches de **Drift**: Patín (gratis al abrir), Humo, Trompo, Katana. Turismos de tracción trasera con mucho giro | 🚧 |
| DCO-03 | Coches de **Obstáculos**: Cabra (gratis al abrir), Oruga, Yeti. Camiones lentos con ruedas grandes, suspensión larga y mucho agarre | 🚧 |
| DCO-04 | Coches de Carrera que también valen: **Bólido, Flecha y Saeta** en Drift; **Tanque, Morsa y Rally** en Obstáculos | 🚧 |
| DCO-05 | Los rivales de Drift y Obstáculos salen de los coches de esa disciplina | 🚧 |

## Economía

| ID | Requisito | Estado |
|---|---|---|
| DEC-01 | **Medallas** en los modos en solitario: bronce 300 🪙, plata 600, oro 1.000 la primera vez que se consigue cada una; repetir sin mejorar da 100 | 🚧 |
| DEC-02 | Duelo de Drift y Carrera de Obstáculos pagan como una carrera normal (ECO-02) | 🚧 |
| DEC-03 | **Copa Derrape** (cocina → garaje → cocina al revés) y **Copa Obstáculos** (escritorio → fregadero → escritorio al revés): 3 pruebas con puntos, premio 4.000 | 🚧 |

## Calibración pendiente

Los umbrales de medalla salen de simulaciones con la IA (`node tests/racesim.mjs`), no de partidas reales:
hay que ajustarlos con lo que cuente el usuario al probar.
