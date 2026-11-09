# 00 · Visión

## Objetivo principal

Hacer un juego de carreras de coches RC para Android que **se parezca lo máximo posible a Re-Volt**.
Es el criterio que manda sobre todos los demás: ante dos opciones, gana la que más se acerque a la sensación
de Re-Volt (salvo petición expresa del usuario en otro sentido, que se anota como desviación).

## Pilares

| ID | Pilar | Qué significa |
|---|---|---|
| VIS-01 | **Escala de juguete** | Coches de juguete en lugares cotidianos gigantes: una casa, un supermercado, un jardín. Los objetos reales (sofás, estanterías, latas, árboles) son el decorado y el obstáculo. |
| VIS-02 | **Conducción RC viva** | Coches ligeros y nerviosos, que rebotan, derrapan, saltan, vuelcan y se recolocan. Divertidos antes que realistas. |
| VIS-03 | **Caos con armas** | Cajas de energía en la pista que dan un arma al azar; los que van detrás reciben armas mejores. |
| VIS-04 | **Progresión** | Empezar con coches flojos y ganar para conseguir mejores (dinero, garaje, copas, estrellas ocultas). |
| VIS-05 | **Móvil primero** | Se juega en horizontal con controles táctiles grandes; también con inclinación y teclado. |
| VIS-06 | **Ambiente** | Cada circuito tiene luz, sonido de fondo y pequeños detalles animados propios. |

## Restricciones

- **Contenido 100 % original.** No se usan nombres, logotipos, música, sonidos, texturas ni modelos de Re-Volt.
  Coches, circuitos y armas tienen nombres propios en español. En el juego no se menciona Re-Volt.
- El usuario trabaja **solo desde el móvil**: Claude escribe todo el código, lo sube y publica; el usuario prueba.
- Respuestas al usuario **breves y en español**.
- Stack: Three.js + Rapier + Vite + Capacitor (ver [10-plataforma.md](10-plataforma.md)).

## Desviaciones pedidas por el usuario (respecto a Re-Volt)

| ID | Desviación | Motivo |
|---|---|---|
| DES-01 | Sistema de **daños** con abolladuras y pérdida de rendimiento | Pedido expresamente |
| DES-02 | **Dinero, compra/venta y mejoras** de coches | Pedido expresamente (Re-Volt desbloquea ganando) |
| DES-03 | **Minimapa** en el marcador | Ayuda en pantalla de móvil |

## No objetivos (por ahora)

- Multijugador online (idea futura opcional).
- Editor de circuitos (idea futura).
