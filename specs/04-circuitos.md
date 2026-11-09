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
| CIR-07 | **Decorado despejado** (estilo Re-Volt): como mucho un grupo de objetos sueltos por circuito; decorado lejos de la pista; bordes bajos y sobrios con muro invisible alto | 🚧 |
| CIR-08 | **Carteles de flechas** automáticos en el exterior de las curvas cerradas | 🚧 |
| CIR-09 | Detalles animados de ambiente que no estorban (tren, gato, globos, mariposas…) | ✅ |
| CIR-10 | Una **estrella oculta** por circuito para el modo Contrarreloj, en un sitio que requiera saltar o salirse de la trazada | 🚧 |
| CIR-11 | Texturas con relieve (mapas de normales): parqué, baldosas, césped, tierra, barro, agua animada | ✅ |
| CIR-12 | Los decorados se colocan solos fuera de la pista (`circuit.spot`) | ✅ |

## Circuitos

| ID | Circuito | Longitud (mundo) | Elementos | Objetos sueltos | Estado |
|---|---|---|---|---|---|
| salon | **El salón** | ≈930 u | rampa-libro, túnel bajo la mesa, 3 cuestas, suelo encerado, tren de juguete, gato, robot, globos | bolos | ✅ |
| super | **Supermercado** | ≈880 u | rampa de cartón, túnel de cajas de cereales, 3 cuestas, suelo fregado, carteles de oferta, cintas de caja | latas | ✅ |
| jardin | **El jardín** | ≈1330 u | rampa de tablones, 4 montículos, barro, charco, estanque, aspersor, mariposas, molinillo, rana | balón de playa | ✅ |

## Ideas futuras

- Más escenarios a escala de juguete: museo, juguetería, garaje, barco (📝).
- Variantes de circuito en sentido inverso (📝).
