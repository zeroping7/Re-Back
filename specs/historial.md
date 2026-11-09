# Historial de peticiones y decisiones

Todo lo que el usuario ha pedido, en orden, y lo que se decidió. Las specs reflejan el estado actual.

| # | Petición del usuario | Decisión / resultado |
|---|---|---|
| 1 | Crear el juego y la fase 1 en una casa, sin parar | Vite + Three.js + Rapier + Capacitor; coche RC con suspensión, circuito "El salón", CI web + APK |
| 2 | La descarga del APK no termina | APK válido; se publica también en GitHub Pages para descarga directa |
| 3 | Ajuste preferido: tracción trasera 90, freno 10, giro 0,3 | Pasan a ser los valores por defecto |
| 4 | Modelo del coche más realista | Buggy 1:10 con suspensión animada, neumáticos de tacos, llantas |
| 5 | Hacer el resto del juego siguiendo la esencia | Fases 2-5: IA, vueltas, armas, 3 circuitos, 5 coches, menús, música, APK final |
| 6 | Coches más lentos; pistas el doble de anchas y largas | Velocidad 25; mundo de los circuitos escalado ×2 |
| 7 | Más curvas, algo más estrechas, menos cajas y obstáculos, detalles divertidos, mejores modelos y más coches | Trazados nuevos, ancho 7, 2 puntos de cajas, detalles animados, 4 coches nuevos (9 en total) |
| 8 | Compra/venta de coches, mejoras con dinero del juego, empezar con los peores, modelos más reales | Monedas, garaje, mejoras, 60 % al vender; carrocerías suavizadas y más detalles |
| 9 | ¿Se puede jugar en el navegador? | Sí; Pages pasa a publicarse con GitHub Actions |
| 10 | Arreglar el deslizado de tarjetas; objetos para interactuar; cuestas; zonas de derrape controlables; más velocidad y menos agarre | Tarjetas deslizables, objetos sueltos, cuestas, zonas de derrape, turbos, vel. 29 y agarre 3,0/2,6 |
| 11 | Quitar escalones en cuestas y rampas; turbos lejos de curvas; físicas lo más parecidas a Re-Volt; deformación y salud; circuitos más largos; mejores texturas | Superficies continuas sin aristas internas, turbos automáticos en rectas, motor eléctrico y suspensión blanda, abolladuras y salud, circuitos ~1,7× más largos, texturas con relieve |
| 12 | Actuar como experto UI/UX y ambientación para parecerse lo máximo a Re-Volt; quitar objetos con los que se choca; implementar SDD con todo lo hablado | Specs creadas (esta carpeta) y CLAUDE.md. Hecho: decorado despejado, flechas en curvas, cajas de energía, 3 armas nuevas (cohetes ×3, pulso, bola de acero), copas Bronce/Plata/Oro con podio 3D, estrella oculta por circuito, ficha de coche (clase, motor, tracción, peso), rivales por clase, 3 cámaras, acelerar solo, taller 3D en los menús, tipografía arcade, carga con consejos, ambiente sonoro por circuito, motores de rivales y sonido nitro |
| 13 | Preview de coche y circuito al elegir en vez de un color; soporte para mando | UX-10, CTL-04, CTL-05 |
| 14 | Mejorar efectos al pasar por agua, barro, etc. y texturas más realistas | CIR-12, CIR-13 |
| 15 | Aplicar las mejoras propuestas: fantasma, repetición, música por circuito, 3 circuitos, coches nuevos y secreto, Batalla de la Estrella, pistas al revés/espejo, Copa Platino; mirar atrás y cámara con stick. Editor y multijugador, para más adelante | UX-11..14, CTL-06/07, COC-04/05, CIR-20..23, AUD-09, ECO-09; REF-18/19 📝 |
| 16 | Barro/agua demasiado incontrolables al girar; rehacer la arena de batalla (rampas tapadas); rampas de salto con aterrizaje (al revés se bloqueaba); freno + giro parado hacía andar el coche | FIS-21..23, CIR-24, UX-15 |

## Preferencias del usuario

- Trabaja **solo desde el móvil**; Claude programa, sube y publica; el usuario prueba y da feedback.
- Respuestas **breves y concisas**, en español.
- Mantener `PROGRESO.md` y estas specs al día.
- Objetivo principal: **parecerse lo máximo posible a Re-Volt**.
