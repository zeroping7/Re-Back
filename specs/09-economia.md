# 09 · Economía y progresión (desviación DES-02)

Partida guardada en `localStorage` (`reback.profile.v1`): monedas 🪙, coches comprados con sus mejoras,
coche en uso, copas y estrellas.

| ID | Requisito | Estado |
|---|---|---|
| ECO-01 | Inicio: 500 🪙 y solo **Furgo** y **Pulga** (los peores) | ✅ |
| ECO-02 | Premio por carrera: `tabla[puesto] · (0,7 + 0,1·coches) · dificultad · vueltas/ref`, tabla 600/400/280/200/140/100; dificultad ×0,7 / ×1 / ×1,5; `ref` = 3 vueltas en Carrera y Drift, 1 en Obstáculos (vuelta mucho más larga). **Proporcional a las vueltas**: todas las duraciones pagan lo mismo por minuto. La Batalla paga como 2 vueltas y cuenta 6 coches como máximo | ✅ |
| ECO-03 | Precios de coches de 1.500 a 18.000 (ver [03-coches.md](03-coches.md)) | ✅ |
| ECO-04 | Mejora: `(120 + precio·0,027) · (nivel+1)`, redondeado a 50; el precio cuenta hasta 18.000 (tope para el Cometa) | ✅ |
| ECO-05 | Vender: 60 % de lo gastado (coche + mejoras); siempre queda al menos un coche | ✅ |
| ECO-06 | **Copas**: premio final al 1º 100 %, 2º 50 %, 3º 25 % (Bronce 1.000, Plata 2.000, Oro 4.000, Platino 7.000, Derrape y Obstáculos 2.500) además del premio de cada carrera | ✅ |
| ECO-07 | Copas encadenadas: Plata se abre quedando entre los 3 primeros en Bronce; Oro, en Plata | ✅ |
| ECO-08 | **Estrella oculta**: 500 🪙 la primera vez que se coge en cada circuito | ✅ |
| ECO-09 | **Copa Platino** (se abre con Oro): circuitos al revés y en espejo, difícil, 6 coches | ✅ |
| ECO-10 | **Copa repetida**: el premio final entero solo se cobra la primera vez. Si se mejora el puesto se cobra la diferencia; si no, el 25 %. El podio lo dice | ✅ |
| ECO-11 | **Circuitos por progreso**: al empezar solo Salón, Súper y Jardín. Parque se abre con la Copa Bronce; Museo y Muelle con la Plata (entre los 3 primeros). En el menú salen con 🔒 y la copa que piden; el podio anuncia los que se abren | ✅ |
| ECO-12 | **Coches por clase**: los Semi-pro piden la Copa Plata y los Pro la Copa Oro (entre los 3 primeros) además del precio. El garaje lo indica y el podio anuncia los que ya se pueden comprar | ✅ |
| ECO-13 | **Primera victoria** en cada circuito y dificultad (carreras con 4 coches o más, también en copa): 300 / 400 / 500 🪙 una sola vez. Sale en los resultados | ✅ |
| ECO-14 | Clave de guardado `reback.profile.v2`. Si no existe pero hay una partida `v1`, se migra entera (dinero, coches, mejoras, copas, estrellas, medallas); solo empieza de cero quien no tenía partida | ✅ |
| ECO-15 | **Online**: las carreras online darán monedas, menos que en solitario (propuesta: 50 % del premio de carrera, sin primeras victorias). Se hace con NET-08 | 📝 |

## Ritmo buscado (decidido el 12 nov 2026)

- Ni fácil ni lento: un coche nuevo cada **6–8 carreras** al principio y cada **15–20** al final.
- Todos los coches de Carrera en unas **4–5 horas**; las mejoras y el resto de disciplinas alargan el juego (≈ 200.000 🪙 en total).
- Ganar las 4 copas de Carrera a la primera debe dar entre el **50 % y el 75 %** de lo que cuestan los coches de Carrera.
- Ninguna forma de jugar debe pagar mucho más por minuto que otra (ni copas repetidas ni carreras cortas).
- Drift y Obstáculos deben poder pagarse sus coches sin obligar a volver a Carrera.

## ⚠ Revisión al añadir contenido (coches, circuitos, copas, modos)

Cada vez que se añada o quite un coche, circuito, copa o modo, **repasar esta lista antes de publicar**:

1. **Coche nuevo**: precio dentro de la escalera de su disciplina (sin saltos de más del doble entre dos seguidos);
   clase correcta (Semi-pro pide Plata, Pro pide Oro); actualizar la tabla de [03-coches.md](03-coches.md).
2. **Circuito nuevo**: decidir con qué copa se abre (`TRACK_NEEDS` en `src/tracks/index.js`) y en qué copa se corre.
   Suma 1 estrella (500) y 3 primeras victorias (1.200): comprobar que no desequilibra. Si la vuelta dura mucho más
   o menos que las demás de su disciplina, ajustar `REF_LAPS` o darle un factor propio.
   En Drift u Obstáculos, fijar los puntos o tiempos de las medallas.
3. **Copa nueva**: premio acorde con su dificultad y número de carreras; qué abre (circuitos, coches, disciplina).
4. **Modo nuevo** (online, pantalla partida…): cuánto paga por minuto frente a una carrera rápida.
5. Pasar `node tests/economy.mjs` (tiene que acabar en ✓) y revisar que el ritmo de arriba se mantiene.
6. Si los precios o premios cambian mucho, valorar si hay que compensar o reiniciar las partidas guardadas.

Fórmulas en `src/economy.js`. Precios en `src/cars.js`, copas en `src/cups.js`, medallas en `src/disciplines.js`.

## Copas

| Copa | Dificultad | Vueltas | Rivales | Circuitos | Premio |
|---|---|---|---|---|---|
| Bronce | Fácil | 2 | 3 | salón → súper → jardín | 1.000 |
| Plata | Normal | 3 | 3 | súper → parque → jardín → salón | 2.000 |
| Oro | Difícil | 3 | 5 | museo → jardín → muelle → súper | 4.000 |
| Platino | Experto | 3 | 5 | salón al revés → parque espejo → museo al revés → muelle espejo | 7.000 |
| Derrape (Drift) | Por puntos | 2 | 3 | cocina → garaje → cocina al revés | 2.500 |
| Obstáculos | Normal | 2 | 3 | maqueta → maqueta al revés | 2.500 |

Puntos por carrera: 10 · 6 · 4 · 3 · 2 · 1. Desempate: más victorias y luego mejor puesto en la última carrera.
Abandonar una copa (pausa o resultados) pierde los puntos; se puede reiniciar la carrera en curso.
