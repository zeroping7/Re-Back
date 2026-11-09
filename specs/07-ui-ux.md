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
 └─ Menú principal: Carrera rápida · Campeonato · Contrarreloj · Garaje · Opciones
     ├─ Carrera rápida → circuito, coche (solo los tuyos), vueltas, rivales, dificultad → Carga → Carrera → Resultados (+🪙)
     ├─ Campeonato → copa (Bronce/Plata/Oro) → coche → 3 carreras con clasificación entre medias → Podio final (+🪙)
     ├─ Contrarreloj → circuito, coche → Carga → Vueltas libres con récord y estrella oculta
     ├─ Garaje → comprar/vender, usar, mejoras, ficha del coche (clase, motor, tracción, peso)
     └─ Opciones → sonido, música, dirección (botones/inclinación), acelerar solo, cámara, calidad, ajustes ⚙
```

| ID | Requisito | Estado |
|---|---|---|
| UX-01 | Menú principal, preparar carrera, garaje, opciones, pausa, resultados | ✅ |
| UX-02 | Listas de tarjetas deslizables con el dedo | ✅ |
| UX-03 | **Taller 3D** detrás de los menús con cámara que se mueve despacio | 🚧 |
| UX-04 | **Pantalla de carga** con nombre del circuito, descripción y un consejo | 🚧 |
| UX-05 | Tipografía arcade, animación de entrada de los menús | 🚧 |
| UX-06 | **Campeonato**: selección de copa con candados/trofeos, clasificación entre carreras y podio | 🚧 |
| UX-07 | Opción **acelerar solo** (gas automático; el freno sigue funcionando) | 🚧 |
| UX-08 | Botón de **cámara** en carrera: Normal → Lejos → Paragolpes | 🚧 |
| UX-09 | Monedas visibles en los menús y premio animado en resultados | ✅ |

## Marcador en carrera

| ID | Requisito | Estado |
|---|---|---|
| HUD-01 | Arriba izquierda: posición grande, vuelta, tiempo actual, mejor vuelta, salud 🔧, minimapa | ✅ |
| HUD-02 | Tiempo de la **última vuelta** | 🚧 |
| HUD-03 | Caja del arma sobre los pedales con icono y **munición**; se toca para disparar | 🚧 |
| HUD-04 | Velocímetro abajo en el centro | ✅ |
| HUD-05 | Mensajes centrales: 3-2-1-¡YA!, última vuelta, sentido contrario, récord, estrella encontrada | ✅ (estrella 🚧) |

## Controles

| ID | Requisito | Estado |
|---|---|---|
| CTL-01 | Botones ◀ ▶ ▲ ▼ grandes con vibración | ✅ |
| CTL-02 | Inclinación del móvil (calibra al activar) | ✅ (sentido sin verificar en móvil) |
| CTL-03 | Teclado: flechas/WASD, E/Intro arma, R recolocar, P/Esc pausa, C cámara | ✅ (C 🚧) |
