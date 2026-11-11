# 04 · Circuitos

## Reglas de diseño

| ID | Regla | Estado |
|---|---|---|
| CIR-01 | Ancho de pista 7 u pequeñas (≈14 u de mundo); radio mínimo de curva ≈4 u; separación entre tramos ≥14 u (`tests/layout.mjs`) | ✅ |
| CIR-02 | Vuelta de 40-60 s: circuitos largos y con muchas curvas | ✅ |
| CIR-03 | Elevación solo con **cuestas** (perfil coseno, simples o dobles suaves) y **rampas** de salto; sin escalones (FIS-20) | ✅ |
| CIR-04 | Las cuestas llevan el mismo suelo que el circuito (UV del suelo); las rampas, su material (libro, cartón, tablones) | ✅ |
| CIR-05 | Placas de turbo colocadas solas en las rectas más largas, lejos de curvas, rampas y salida (`autoBoosts`) | ✅ |
| CIR-06 | 2-3 zonas de derrape en curvas (encerado / fregado / barro) | ✅ |
| CIR-07 | **Decorado despejado** (estilo Re-Volt): como mucho un grupo de objetos sueltos por circuito; decorado lejos de la pista; bordes bajos y sobrios con muro invisible alto | ✅ |
| CIR-08 | **Carteles de flechas** automáticos en el exterior de las curvas cerradas (radio < 9), con los colores de cada circuito | ✅ |
| CIR-09 | Detalles animados de ambiente que no estorban (tren, gato, globos, mariposas…) | ✅ |
| CIR-10 | Una **estrella oculta** por circuito para el modo Contrarreloj, en un sitio que requiera saltar o salirse de la trazada: flota en el vuelo del salto de la rampa (2 muestras tras la cima, 1,6 u por encima) y se coge pasando a menos de 2,4 u, así que hay que saltar a fondo y por el centro. Si ya es tuya se ve transparente | ✅ |
| CIR-11 | Texturas con relieve (mapas de normales): parqué, baldosas, césped, tierra, barro, agua animada | ✅ |
| CIR-12 | **Superficies realistas** (`surfaceTex`): barro con charcos brillantes, roderas y piedras; suelo fregado con película de agua, pasadas de fregona y espuma; cera con remolinos de abrillantadora; bordes irregulares y extremos difuminados; agua con doble capa de ondas y orilla de barro húmedo | ✅ |
| CIR-13 | **Efectos al pisar superficies**: barro → grumos lanzados por las ruedas, vaho, huellas marrones al salir y la carrocería se mancha de barro (desde abajo); charco → corona de salpicadura al entrar, abanicos de agua por rueda, ondas en el agua, huellas mojadas y gotas al salir; el agua lava el barro; fregado → estela pulverizada y huellas húmedas; cera → destellos y marcas claras al patinar. Prueba: `node tests/surfaces.mjs` | ✅ |
| CIR-12 | Los decorados se colocan solos fuera de la pista (`circuit.spot`) | ✅ |

## Circuitos

| ID | Circuito | Longitud (mundo) | Elementos | Objetos sueltos | Estado |
|---|---|---|---|---|---|
| salon | **El salón** | ≈930 u | rampa-libro, túnel bajo la mesa, 3 cuestas, suelo encerado, tren de juguete, gato, robot, globos | bolos | ✅ |
| super | **Supermercado** | ≈880 u | rampa de cartón, túnel de cajas de cereales, 3 cuestas, suelo fregado, carteles de oferta, cintas de caja | latas | ✅ |
| jardin | **El jardín** | ≈1330 u | rampa de tablones, 4 montículos, barro, charco, estanque, aspersor, mariposas, molinillo, rana | balón de playa | ✅ |

## Circuitos nuevos (petición 15)

| ID | Requisito | Estado |
|---|---|---|
| CIR-20 | **Museo de noche**: suelo de mármol pulido muy brillante, vitrinas, columnas, esqueleto de dinosaurio low-poly, luces de vitrina y foco de vigilante | ✅ |
| CIR-21 | **El muelle**: tablones de madera sobre el agua al atardecer, cajas, barcas, cuerdas, gaviotas y charcos | ✅ |
| CIR-22 | **Parque infantil**: arena (derrapa), suelo de caucho, tobogán-rampa, columpios, balancín y arenero | ✅ |
| CIR-23 | **Pistas al revés y en espejo**: se generan solas desde cada circuito (mismo decorado; rampas y cuestas giradas para el nuevo sentido; espejo invierte mundo y físicas) | ✅ |
| CIR-24 | **Rampa de salto con rampa de aterrizaje**: subida que lanza, plataforma corta y bajada simétrica, sin caras verticales; sirve en los dos sentidos. La estrella oculta queda en el aire sobre la plataforma | ✅ |
| CIR-25 | **El salón sin curvas cerradas ni parpadeos**: la S de la derecha tiene radio ≥ 7 (con pista de 7 no se cierra el borde interior); la cuesta va en una recta, no sobre una curva; los bordes siguen la pendiente (sin escalones entre bloques); rampas y cuestas ganan al suelo en profundidad (sin parpadeo de textura al despegar y aterrizar). Criterio: por el carril interior (−0,7…0,6) el coche no baja de 20 km/h en la S | ✅ |

## Ideas futuras

- Más escenarios a escala de juguete: museo, juguetería, garaje, barco (📝).
- Variantes de circuito en sentido inverso (📝).
