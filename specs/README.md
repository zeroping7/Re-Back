# Especificaciones de Re-Back (Spec Driven Development)

Las especificaciones de esta carpeta son la **fuente de verdad** del juego. El código implementa lo que dicen
las specs; si algo cambia, se cambia primero la spec.

## Objetivo principal

> **Un juego de carreras de coches teledirigidos para Android que se parezca lo máximo posible a Re-Volt**
> en sensación de conducción, ambientación, modos de juego, armas y presentación, con **todo el contenido original**
> (nombres, modelos, texturas, sonidos y música propios).

Todo requisito se valora con una pregunta: *¿esto acerca el juego a cómo se siente Re-Volt?*

## Flujo de trabajo (SDD)

1. **Petición** del usuario (desde el móvil, en el chat).
2. **Spec primero**: se añade o modifica el requisito en el documento que toque, con su ID, descripción y
   criterios de aceptación. Se apunta la petición en [`historial.md`](historial.md).
3. **Implementación** pequeña y enfocada que cumpla la spec.
4. **Verificación** contra los criterios de aceptación: `node tests/racesim.mjs`, capturas en Chrome headless
   (`tests/ui.mjs`, `tests/race.mjs`, `tests/star.mjs`, `tests/spots.mjs`, `tests/garage.mjs`, `tests/damage.mjs`, `tests/gamepad.mjs`) y CI en verde.
5. **Cierre**: se marca el estado del requisito, se actualiza [`../PROGRESO.md`](../PROGRESO.md) y se publica
   (cada push a `main` genera web + APK).

## Estados

| Marca | Significado |
|---|---|
| ✅ | Hecho y verificado |
| 🚧 | En curso |
| 📝 | Pendiente / idea aprobada |
| ❌ | Descartado (con motivo) |

## Índice

| Documento | Contenido |
|---|---|
| [00-vision.md](00-vision.md) | Visión, pilares, restricciones |
| [01-referencia-revolt.md](01-referencia-revolt.md) | Qué hace que Re-Volt sea Re-Volt y cómo lo trasladamos |
| [02-fisicas.md](02-fisicas.md) | Conducción, colisiones, daños |
| [03-coches.md](03-coches.md) | Coches, clases, modelos, mejoras |
| [04-circuitos.md](04-circuitos.md) | Reglas de diseño y circuitos |
| [05-objetos.md](05-objetos.md) | Armas y cajas de energía |
| [06-ia.md](06-ia.md) | Rivales |
| [07-ui-ux.md](07-ui-ux.md) | Pantallas, marcador, estilo visual, controles |
| [08-audio.md](08-audio.md) | Motor, efectos, música, ambiente |
| [09-economia.md](09-economia.md) | Dinero, garaje, premios, copas |
| [10-plataforma.md](10-plataforma.md) | Tecnología, compilación, pruebas, rendimiento |
| [11-disciplinas.md](11-disciplinas.md) | Disciplinas: Carrera, Drift y Obstáculos (menús, modos, coches, circuitos) |
| [historial.md](historial.md) | Todo lo pedido y decidido, por orden |
