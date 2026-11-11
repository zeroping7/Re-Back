# 08 · Audio

Todo el sonido se **sintetiza por código** (Web Audio): no hay archivos de audio ni música de terceros.

| ID | Requisito | Estado |
|---|---|---|
| AUD-01 | Motor del jugador: zumbido eléctrico que sube con la velocidad y el gas | ✅ |
| AUD-02 | **Motor nitro** para los coches de nitro: más grave, áspero y con vibración | ✅ |
| AUD-03 | **Motores de los rivales cercanos** (2 voces) con volumen según la distancia y panorama izquierda/derecha | ✅ |
| AUD-04 | Derrape, golpes, explosiones, salpicaduras, turbo, cohete, bomba, recogida, vueltas, meta | ✅ |
| AUD-05 | Pulso eléctrico (zumbido), bola de acero (golpe grave), estrella y fanfarria de copa | ✅ |
| AUD-06 | **Ambiente por circuito**: salón (tic-tac de reloj y rumor de casa), supermercado (zumbido de neveras y aviso por megafonía), jardín (viento y pájaros); baja en la pausa | ✅ |
| AUD-07 | Música procedimental en menús y carrera, se puede apagar | ✅ |
| AUD-08 | Sonido y música se pueden silenciar por separado (Opciones) | ✅ |
| AUD-10 | **Motores mejorados**: eléctrico con zumbido de bobinado, chillido de piñones y siseo de escobillas; nitro de 2 tiempos con explosiones audibles a pocas vueltas, escape rasposo, ralentí irregular y petardeo al soltar el gas. Las vueltas suben más rápido que bajan y se disparan en el aire o patinando. Cada coche tiene su tono (nombre y peso) | ✅ |
| AUD-11 | **Rivales**: 3 voces con el mismo motor que el jugador, panorama y **efecto Doppler** al adelantar/cruzarse | ✅ |
| AUD-09 | **Música con más ritmo** y un tema propio por circuito (tempo, tonalidad, batería y estribillo distintos) | ✅ |
| AUD-12 | **Superficies realistas**: al entrar en agua, barro o arena ya no suena un chasquido (el ruido empezaba de golpe). Agua = golpe grave + cuerpo de agua + rocío + burbujas; barro = chof grave con burbujas; arena = roce suave. Mientras se rueda por ellas suena una capa continua (chapoteo, barro, arena, suelo mojado) que sube y baja despacio con la velocidad y calla en el aire. Criterio: ataque ≥ 12 ms en todos los ruidos de superficie | ✅ (pendiente de oído en móvil) |
| AUD-13 | **Motores con muestras realistas, uno por coche.** 8 sonidos base (4 eléctricos, 4 nitro) generados con `tools/engines/make_engines.py` → `src/assets/engines.bin` (bucles de 7 regímenes × gas/sin gas, μ-law 24 kHz). La voz mezcla los 2 regímenes vecinos y ajusta el tono con las vueltas (y el Doppler). Cada coche tiene `sound: [base, tono]` en `src/cars.js` y no hay dos coches con el mismo par; si el sonido falla al cargar, se usa el motor sintetizado de AUD-10. Criterios: 18 coches con par único (`node tests/sounds.mjs`; nivel y clics: `node tests/engine.mjs`, juego real: `node tests/engine-game.mjs`, con `npx vite --port 5173`); sin clics al subir/bajar vueltas ni al pasar de gas a soltar; nivel parecido al motor anterior | ✅ (pendiente de oído en móvil) |

### Motor de cada coche (AUD-13)

| Base | Sonido | Coches (tono) |
|---|---|---|
| `e1` | Brushless on-road: silbido agudo y fino | Flecha (1,00) · Trompo (1,10) · Patín (0,90) |
| `e2` | Brushless buggy: whine potente con engranajes | Chispa (1,12) · Humo (0,95) |
| `e3` | Escobillas 540: zumbido clásico | Furgo (0,95) · Pulga (1,20) |
| `e4` | Crawler/monster: lento, grave, con gruñido de engranaje | Cabra (1,12) · Oruga (0,95) · Morsa (0,80) |
| `n1` | Nitro buggy .21: grave y con cuerpo | Rally (1,10) · Bisonte (0,88) |
| `n2` | Nitro on-road .12: agudo y chillón | Saeta (1,00) · Katana (0,90) |
| `n3` | Nitro truck grande: el más grave y bruto | Tanque (1,05) · Yeti (0,85) |
| `n4` | Nitro con pipa racing: muy agudo y limpio | Fórmula (1,00) · Cometa (1,14) |

Criterio de reparto: el tipo de motor de cada coche (`motor`) manda; dentro de cada tipo, el tamaño y el peso (coches pesados más graves) y el uso (derrape → on-road, trepadores → crawler).
