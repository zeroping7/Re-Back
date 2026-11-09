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
| 17 | La lista de rivales y tiempos de la batalla tapa el centro | UX-16 |
| 18 | Quitar la plataforma de arriba de las rampas de la batalla; looping tipo pista de juguete y rampas para subir a mesa/silla bien comunicadas; no recolocar al chocar con esquinas; cohetes que explotan contra uno mismo | UX-17, UX-18, OBJ-20 |
| 19 | Online fluido, gratis y para 8-10 jugadores | Servidor propio en Oracle Cloud Always Free (Madrid) con WebSocket + Caddy; NET-01..08 |
| 20 | Mejorar el sonido de todos los motores y quitar los ajustes de conducción (velocidad, etc.) para evitar trampas | AUD-10, AUD-11; panel ⚙ eliminado (02-fisicas, 07-ui-ux) |
| 21 | Icono nuevo de la app (propuesta A: buggy rojo saltando sobre rayos naranjas, título amarillo), original | PLA-05 |
| 22 | Dirección demasiado sensible/brusca en todos los coches; que gire más porque en parado cuesta maniobrar | FIS-24 (giro ×1,6 en parado), FIS-25 (entrada de dirección más progresiva) |
| 23 | Dos modalidades nuevas con sus circuitos y coches: Drift (por puntos) y Obstáculos (en solitario y con rivales); se desbloquean con copas; algunos coches actuales valen en ellas; adaptar los menús | [11-disciplinas.md](11-disciplinas.md): DIS-*, DRI-*, OBS-*, DCO-*, DEC-* |
| 24 | Drift: curvas más seguidas y pista la mitad de ancha. Obstáculos: no era eso; se busca algo tipo *crawler park* (fotos de referencia) | DRI-08 rehecho; obstáculos en conversación |
| 25 | Coches de drift parecidos a los RC de drift reales (fotos), con mucha aceleración y patinando al salir; circuitos de drift con aspecto de pista RC real y detalles que den inmersión | DCO-02 rehecho, DRI-09, DRI-10 |

## Preferencias del usuario

- Trabaja **solo desde el móvil**; Claude programa, sube y publica; el usuario prueba y da feedback.
- Respuestas **breves y concisas**, en español.
- Mantener `PROGRESO.md` y estas specs al día.
- Objetivo principal: **parecerse lo máximo posible a Re-Volt**.

