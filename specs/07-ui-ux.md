# 07 · Interfaz, experiencia y estilo

## Principios

1. **Ambiente de taller de juguetes** en los menús (como el frente de Re-Volt): el coche gira en una peana dentro
   de un taller 3D con banco de trabajo, panel de herramientas, estanterías y una lámpara cálida.
2. **Arcade y legible**: tipografía gruesa en cursiva, números grandes, contraste alto (blanco con sombra sobre
   paneles azul noche), acentos amarillo/naranja.
3. **Pulgares primero**: horizontal; controles grandes abajo (≥ 80 px), nada importante en las esquinas
   superiores salvo botones pequeños; todo se toca, nada requiere precisión.
4. **Pocas pantallas, siempre con vuelta atrás** y sonido al pulsar.

## Paleta y tipografía

| Uso | Valor |
|---|---|
| Fondo de paneles | azul noche `#101533` con transparencia |
| Acento principal | amarillo `#ffd23f` |
| Botón principal | degradado naranja `#ffb347 → #ff6a00` |
| Éxito / peligro | verde `#7dff8a` / rojo `#ff5252` |
| Tipografía de títulos y números | **Russo One** (OFL, incluida en el paquete) en cursiva |
| Texto | system-ui |

## Pantallas y flujo

```
Inicio (toca para empezar)
 └─ Menú principal: Carrera rápida · Campeonato · Contrarreloj · Batalla · Garaje · Opciones
     ├─ Carrera rápida → circuito, coche (solo los tuyos), vueltas, rivales, dificultad → Carga → Carrera → Resultados (+🪙)
     ├─ Campeonato → copa (Bronce/Plata/Oro) → coche → 3 carreras con clasificación entre medias → Podio final (+🪙)
     ├─ Contrarreloj → circuito, coche → Carga → Vueltas libres con récord y estrella oculta
     ├─ Garaje → comprar/vender, usar, mejoras, ficha del coche (clase, motor, tracción, peso)
     └─ Opciones → sonido, música, dirección (botones/inclinación), acelerar solo, cámara, calidad (sin ajustes de conducción: se quitaron para evitar trampas, UI-ANTITRAMPAS)
```

| ID | Requisito | Estado |
|---|---|---|
| UX-01 | Menú principal, preparar carrera, garaje, opciones, pausa, resultados | ✅ |
| UX-02 | Listas de tarjetas deslizables con el dedo | ✅ |
| UX-03 | **Taller 3D** detrás de los menús con cámara que se mueve despacio y vistas por pantalla (general en el menú, cerca del coche al elegir, podio) | ✅ |
| UX-04 | **Pantalla de carga** con modo, nombre del circuito, descripción, barra animada y un consejo; compila los shaders antes de empezar | ✅ |
| UX-05 | Tipografía arcade (Russo One), botones en cursiva con brillo, animación de entrada de los menús | ✅ |
| UX-06 | **Campeonato**: selección de copa con candados/trofeos, clasificación entre carreras (dos columnas: carrera y copa) y **podio 3D** con los 3 primeros y confeti | ✅ |
| UX-07 | Opción **acelerar solo** (gas automático; el freno sigue funcionando) | ✅ |
| UX-08 | Botón de **cámara** en carrera: Normal → Lejos → Parachoques (también en Opciones; se guarda) | ✅ |
| UX-09 | Monedas visibles en los menús y premio animado en resultados | ✅ |
| UX-10 | **Previews** en las tarjetas de coche (render 3D del modelo) y de circuito (vista aérea del trazado con los coches en la salida) en vez de un color; imágenes en `public/previews/`, generadas con `node tests/previews.mjs`; si falta una, se usa el color | ✅ |
| UX-11 | **Fantasma** en Contrarreloj: coche translúcido que repite tu mejor vuelta en ese circuito y variante (se guarda en el móvil) | ✅ |
| UX-12 | **Repetición** al acabar la carrera: botón en resultados; cámaras de TV a ras de suelo junto a la pista que cambian con cortes, alguna toma aérea y de persecución; explosiones repetidas; se sale tocando o con B | ✅ |
| UX-13 | **Variantes de circuito**: Normal, Al revés (se abre con la Copa Plata) y Espejo (con la Copa Oro); récords y fantasmas por variante | ✅ |
| UX-14 | **Batalla de la Estrella**: arena cerrada; la estrella aparece en el centro, quien la lleva gasta su reloj (60 s); se roba tocando al que la lleva; gana quien vacía su reloj; rivales con IA de persecución/huida | ✅ |
| UX-15 | **Arena de batalla rehecha**: rampas de mesa (subida, plataforma, bajada) con pasillo libre delante y detrás; bloques solo en las islas entre pasillos | ✅ |
| UX-16 | Lista de relojes de la batalla arriba a la derecha, bajo los botones, compacta: no tapa el centro de la pantalla | ✅ |
| UX-17 | **Arena con looping y subida a la mesa**: rampas sin plataformas sueltas encima; looping de juguete (con velocidad ≥12 entra "en el carril" y lo recorre entero, turbo en la entrada); suelo → silla → mesa → bajada al suelo, todo enlazado; cajas de energía también en la silla y la mesa (`tests/loop.mjs`, `tests/arena.mjs`) | ✅ |
| UX-18 | Chocar con las esquinas o paredes ya no recoloca el coche: solo si se sale de verdad del escenario (+6 u) o vuelca | ✅ |

## Marcador en carrera

| ID | Requisito | Estado |
|---|---|---|
| HUD-01 | Arriba izquierda: posición grande, vuelta, tiempo actual, mejor vuelta, salud 🔧, minimapa | ✅ |
| HUD-02 | Tiempo de la **última vuelta** | ✅ |
| HUD-03 | Caja del arma sobre los pedales con icono y **munición**; se toca para disparar | ✅ |
| HUD-04 | Velocímetro abajo en el centro | ✅ |
| HUD-05 | Mensajes centrales: 3-2-1-¡YA!, última vuelta, sentido contrario, récord, estrella encontrada | ✅ |

## Controles

| ID | Requisito | Estado |
|---|---|---|
| CTL-01 | Botones ◀ ▶ ▲ ▼ grandes con vibración | ✅ |
| CTL-02 | Inclinación del móvil (calibra al activar) | ✅ (sentido sin verificar en móvil) |
| CTL-03 | Teclado: flechas/WASD, E/Intro arma, R recolocar, P/Esc pausa, C cámara | ✅ |
| CTL-04 | **Mando** (Gamepad API, Bluetooth/USB): stick izq. o cruceta = volante analógico, RT/A acelerar, LT/B frenar, X/RB disparar, LB mirar atrás, Y cámara, Select recolocar, Start pausa. Al usar el mando se ocultan los botones táctiles (vuelven al tocar la pantalla) | ✅ |
| CTL-05 | **Menús con mando**: cruceta/stick mueve un foco visible entre botones, A pulsa, B atrás (o reanudar en pausa), Start empieza; en el APK el botón B no cierra la app; Start pulsa el botón principal (¡A correr!) | ✅ (B en APK sin verificar con mando real) |
| CTL-06 | **Mirar atrás** mientras se mantiene: botón 👀 táctil, tecla Q, LB o pulsar el stick derecho | ✅ |
| CTL-07 | **Stick derecho** mueve la cámara: izquierda/derecha gira alrededor del coche, arriba/abajo sube o baja; al soltar vuelve sola | ✅ |
