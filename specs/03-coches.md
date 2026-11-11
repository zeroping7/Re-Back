# 03 · Coches

## Catálogo

Cada coche tiene clase, motor, tracción y peso propios (estilo ficha de Re-Volt) y multiplicadores sobre el
ajuste base. Nombres y diseños originales.

| ID | Coche | Estilo | Clase | Motor | Tracción | Peso | Precio |
|---|---|---|---|---|---|---|---|
| furgo | Furgo | furgoneta de pizzas | Novato | Eléctrico | 4x4 | 10 | 600 (inicial) |
| pulga | Pulga | burbuja con ojos | Novato | Eléctrico | 4x4 | 6,5 | 600 (inicial) |
| chispa | Chispa | buggy | Aficionado | Eléctrico | 4x4 | 7 | 1.500 |
| tanque | Tanque | monster truck | Avanzado | Nitro | 4x4 50/50 | 11 | 3.000 |
| rally | Rally | rally compacto | Avanzado | Nitro | 4x4 60 % detrás | 8,5 | 4.000 |
| flecha | Flecha | turismo | Semi-pro | Eléctrico | 4x4 70 % detrás | 8 | 7.500 |
| formula | Fórmula | monoplaza | Pro | Nitro | Trasera | 7,5 | 10.000 |

| ID | Requisito | Estado |
|---|---|---|
| COC-01 | 13 coches (12 + secreto) con multiplicadores de potencia, velocidad, agarre, giro y suspensión | ✅ |
| COC-02 | Clase, motor (eléctrico/nitro), tracción y peso por coche, visibles en el garaje (peso en kg = masa × 0,2) | ✅ |
| COC-03 | Motor nitro con sonido distinto (más grave y rasposo) | ✅ |
| COC-04 | 3 coches nuevos: **Saeta** (turismo nitro Pro), **Morsa** (camión eléctrico pesado Avanzado), **Grillo** (buggy semi-pro de giro rápido) | ✅ |
| COC-05 | **Coche secreto «Cometa»** (estilo cohete): se regala al conseguir todas las estrellas ocultas | ✅ |
| COC-06 | **Rendimiento de carrera coherente con los medidores**: Pulga motor 1,32 (arranca como un rayo), Flecha motor 1,14 y punta 1,17, Fórmula punta 1,16 (medidos con `tests/carprobe.mjs`). Obstáculos no se toca | ✅ |
| COC-07 | **Medidores calculados de lo medido** (`src/carperf.js` ← `node tests/carprobe.mjs <disciplina> --write`): Velocidad = punta (u/s), Aceleración = 0→15 u/s (s), Manejo = giro a medio volante; escala fija 1-5 con decimales, igual en tarjetas y garaje; las mejoras desplazan la barra con la misma fórmula. Cada coche tiene valores por disciplina (Carrera y Drift); Obstáculos y los coches solo de Obstáculos siguen con su ficha `stats`. `node tests/carprobe.mjs <disc> --check` falla si los medidores ya no coinciden con la física | ✅ |

## Modelos 3D (hechos por código)

| ID | Requisito | Estado |
|---|---|---|
| COC-10 | Estilos: buggy, turismo, monster truck, rally, furgoneta, monoplaza, burbuja | ✅ |
| COC-11 | Perfiles suavizados (Chaikin) con normales suaves, pasos de rueda, matrículas, retrovisores, líneas de puertas | ✅ |
| COC-12 | Suspensión visible y animada (trapecios, amortiguadores con muelle), discos y pinzas de freno | ✅ |
| COC-13 | Neumáticos de tacos o lisos, llantas con radios a escala, antena con muelle | ✅ |
| COC-14 | Decoraciones: franjas, rally, llamas, lunares, pizza; dorsal y calcomanías | ✅ |
| COC-15 | Piezas fijas fusionadas por material (pocas llamadas de dibujo); menos detalle en coches lejanos | ✅ |
| COC-16 | Abolladuras y desgaste (ver FIS-31..34) | ✅ |
| COC-17 | **Furgo: sin aletas de rueda y con parabrisas visible**: se quitan los arcos negros de los pasos de rueda; el parabrisas (que quedaba oculto dentro de la carrocería) pasa a ser un panel de cristal pegado a la pendiente del capó; el cristal lateral usa `polygonOffset` y la calcomanía del dorsal baja para no solaparse con él. Criterio: se ve el parabrisas desde delante y sin parpadeo en las ventanas laterales | ✅ |
| COC-18 | **Retoques de carrocería hechos en el visor 3D**: Rally con aletas planas (`flatArches`: banda rectangular que cubre todo el ancho del neumático, con labio, del color de la carrocería); Flecha y Bisonte sin aletas (`noArches` en `cars.js`; la Saeta las conserva); Bisonte con el alerón 4 cm más alto (`wing.y` 0,54); Yeti con la barra de focos apoyada en el techo de la cabina. Criterio: se ve cada cambio en el visor y en el juego | ✅ |
| COC-19 | **Neumáticos con talón y flanco proporcionales a la rueda**: antes tenían medidas fijas (para radio 0,37) y en ruedas pequeñas el flanco sobresalía del taco (centro hundido) y quedaba un hueco con la llanta. Ahora se escalan con `R / 0.37`. Criterio: sin hueco entre llanta y neumático ni centro hundido en ningún coche | ✅ |
| COC-20 | **Más retoques desde el visor 3D**: Saeta, Katana, Patín y Trompo sin aletas (`noArches`); aletines del Yeti curvados siguiendo la rueda y 5 cm más bajos; alerón delantero de la Fórmula 0,30 más adelante, con dos soportes al morro (antes quedaba dentro de los neumáticos). Criterio: se ve cada cambio en el visor y en el juego | ✅ |
| COC-21 | **Escape solo en coches de motor nitro** (`motor: 'Nitro'` en `cars.js`): Rally y Saeta con tubo trasero nuevo, Yeti con dos chimeneas verticales; Tanque, Bisonte, Katana, Fórmula y Cometa conservan el suyo. Los eléctricos no llevan: se quitan los de Patín, Humo, Trompo y Morsa. Criterio: ningún eléctrico tiene escape y todos los nitro sí | ✅ |
| COC-22 | **Saeta retirada del juego** (petición del usuario): se quita de `src/cars.js` y `src/carperf.js`; si un perfil guardado la tenía, se borra al cargar (`profile.js`, junto a Rayo, Bólido y Grillo). Criterio: no aparece en garage ni tienda ni en rivales y el juego carga con perfiles antiguos | ✅ |
| COC-23 | **Humo de escape en los coches nitro, según las revoluciones** (`src/exhaust.js`). Sale por la boca de cada escape (`userData.exhausts` del modelo: Tanque 2 chimeneas, Yeti 2 chimeneas, Fórmula 2 tubos, Rally, Bisonte, Katana y Cometa 1 cada uno). Con las vueltas del motor `r` (0 ralentí … 1 tope, misma fórmula que el sonido): **a ralentí sale algo de humo; al subir `r` sale menos humo pero con más fuerza (más velocidad de salida); a partir de `r = 1/3` no sale nada; al volver a caer por debajo de 1/3 empieza el ciclo otra vez.** Solo `motor: 'Nitro'`; los eléctricos nunca. Sin humo con el motor muerto (pulso). Criterio: `node tests/exhaust.mjs` (curva monótona, 0 por encima de 1/3, todos los nitro con ≥1 escape y ningún eléctrico) y partida real con humo en la salida de la parrilla (capturas `tests/exhaustshot.mjs`) | ✅ (pendiente de probar en móvil) |

| COC-24 | **Rally sin guardabarros** (`noArches` en `cars.js`; las aletas planas `flatArches` no se montan si el coche lo tiene). Criterio: el Rally no muestra aletas | ✅ (pendiente de probar en móvil) |

## Mejoras (desviación DES-02)

Motor (+7 % potencia/nivel), Velocidad punta (+4,5 %), Neumáticos (+5 % agarre), Dirección (+5 % giro y respuesta).
3 niveles cada una. Precio ver [09-economia.md](09-economia.md). Estado ✅.
