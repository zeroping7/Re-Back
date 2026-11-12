# 02 · Físicas y conducción

Objetivo: que conducir se sienta como un coche RC de Re-Volt: ligero, rápido al salir, saltarín, que derrapa
de forma controlable y que se recoloca fácil. Motor: **Rapier** (`DynamicRayCastVehicleController`) a 60 Hz fijos.

## Escala

| ID | Requisito | Estado |
|---|---|---|
| FIS-01 | 1 unidad ≈ 22 cm. Coche ≈ 2 u de largo. Los circuitos se diseñan en unidades "pequeñas" y se amplían ×2 (`trackDef.scale`); los coches no se escalan | ✅ |
| FIS-02 | Paso de física fijo 1/60 s con interpolación de la posición al dibujar; máximo 5 pasos por fotograma | ✅ |

## Coche

| ID | Requisito | Estado |
|---|---|---|
| FIS-10 | Chasis `roundCuboid` con centro de masas muy bajo (no vuelca en curva normal) | ✅ |
| FIS-11 | **Motor eléctrico tipo RC**: mucho par al salir que cae con la velocidad: `F = potencia · 1,25 · (1 − (v/vmax)^1,6)` | ✅ |
| FIS-12 | Suspensión blanda y saltarina por rueda (rayos); las ruedas ignoran bordes, coches y objetos sueltos | ✅ |
| FIS-13 | **Derrape**: freno + giro a más de 8 u/s reduce el agarre trasero y limita el giro sobre sí mismo para que sea controlable | ✅ |
| FIS-14 | Control en el aire (cabeceo con gas/freno, giro con dirección) y autonivelado suave | ✅ |
| FIS-15 | Se **endereza solo** si queda apoyado de lado a menos de 4 u/s; recolocación automática si vuelca 1,4 s | ✅ |
| FIS-16 | Rebotes contra muros y bordes (restitución 0,5, fricción 0,05) y entre coches (0,35) | ✅ |
| FIS-17 | **Peso por coche** (masa 6,5–11): potencia, freno, inercia, fuerza máx. de suspensión y control en el aire se escalan con la masa para que todos aceleren parecido, pero los pesados empujan más y las explosiones los mueven menos | ✅ |
| FIS-18 | **Tracción por coche**: reparto propio (`rearBias` del coche) relativo al ajuste base: `base + (coche − 90)` | ✅ |

### Parámetros base fijos (`src/tuning.js`; el panel ⚙ se quitó el 2026-11-09 para evitar trampas)

| Parámetro | Valor | Nota |
|---|---|---|
| Potencia | 145 | |
| Velocidad máx. | 29 u/s | |
| Tracción trasera | 90 % | elegido por el usuario |
| Freno | 10 | elegido por el usuario |
| Giro máx. | 0,30 rad | elegido por el usuario |
| Agarre del./tras. | 3,0 / 2,6 | "un poco menos de agarre" |
| Suspensión | dureza 30, compresión 2,2, extensión 2,8, recorrido 0,36 | blanda |
| Gravedad | 22 | saltos largos |
| Carga aerodinámica | 0,06 | |
| Control en el aire | 14 | |

Si cambian los valores por defecto se sube la clave de guardado para que se apliquen.

## Superficies y zonas

| ID | Requisito | Estado |
|---|---|---|
| FIS-20 | Cuestas y rampas **sin escalones**: malla continua subdividida con colisión `trimesh` + `FIX_INTERNAL_EDGES`; ocupan todo el ancho | ✅ |
| FIS-21 | Zonas de derrape (encerado, fregado, barro, arena): agarre delantero ×0,88 y trasero ×0,74 y giro sobre sí mismo limitado (2 rad/s): resbala pero se controla | ✅ |
| FIS-22 | Charco: frena con resistencia del agua (empuje contra la marcha), no con freno de ruedas (evita trompos) | ✅ |
| FIS-23 | Parado, **freno + giro no arranca** el coche (solo frena); la marcha atrás se mete con el freno solo y, ya yendo hacia atrás, se puede girar. La IA puede salir de atascos igual que antes | ✅ |
| FIS-24 | **Giro extra a baja velocidad**: en parado el ángulo de giro es ×1,6 y baja de forma lineal hasta ×1 a 6 u/s, para maniobrar mejor. Criterio: el radio de giro en parado es claramente menor y a velocidad de carrera no cambia | ✅ |
| FIS-25 | **Dirección menos brusca** (todos los coches): los botones tardan ~0,24 s en llegar al giro completo (antes 0,14 s); inclinación con ±32º y curva suave en el centro; mando con curva más suave. Criterio: toques cortos corrigen poco, mantener pulsado sigue dando el giro completo | ✅ |
| FIS-35 | **Marcas de derrape continuas**: tiras por rueda que no se cortan (aguantan parpadeos de 0,1 s, empiezan y acaban difuminadas, intensidad suavizada), van por encima de las cintas de pista y las más viejas se desvanecen poco a poco en vez de desaparecer de golpe. En drift marcan las cuatro ruedas al ir de lado y caben 7.000 tramos | ✅ |
| FIS-36 | **Marcas de neumático realistas**: huella más ancha con bordes suaves, surcos del dibujo a lo largo, grano de goma y vetas irregulares (coordenadas de huella en la tira); en el Jardín y La maqueta son surcos marrones de tierra en vez de goma (`tests/skidshot.mjs`) | ✅ |
| FIS-22 | Placas de turbo: empujón de 0,8 s | ✅ |
| FIS-23 | Charco: frena (velocidad máx. ×0,7) y salpica | ✅ |

## Daños (desviación DES-01)

| ID | Requisito | Estado |
|---|---|---|
| FIS-30 | Golpe fuerte (Δv horizontal > 5): daño `(fuerza − 0,22) · 22`; aterrizajes muy duros y explosiones también dañan | ✅ |
| FIS-31 | La carrocería se **abolla en el punto de contacto real** (punto de contacto de Rapier en coordenadas del coche) | ✅ |
| FIS-32 | Con menos salud: velocidad máx. ×(0,72 + 0,28·salud), potencia ×(0,85 + 0,15·salud), tira hacia un lado | ✅ |
| FIS-33 | Aspecto: pintura sucia y mate, antena doblada, humo gris → negro, fuego por debajo del 18 % | ✅ |
| FIS-34 | La reparación (objeto 🔧) devuelve salud y endereza parte de la chapa | ✅ |

## Criterios de aceptación

- `node tests/racesim.mjs <circuito> 3 2`: todos los coches terminan en los tres circuitos.
- Ningún coche se queda parado contra un escalón de rampa o cuesta.
- Recolocar nunca deja el coche dentro de una rampa (rayo hacia abajo).

## Marcha atrás y freno (12 nov 2026)

| ID | Requisito | Estado |
|---|---|---|
| FIS-37 | Parado, el freno mete la marcha atrás también con el volante girado (antes solo frenaba) | ✅ |
| FIS-38 | Freno + giro (derrape) nunca hace ganar velocidad: el motor solo mantiene las traseras girando mientras el coche pierde velocidad. Prueba: `node tests/reverseprobe.mjs` | ✅ |
