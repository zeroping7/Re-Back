# 05 · Armas y cajas de energía

Como en Re-Volt: cajas de energía brillantes en la pista; al pasar por una se recibe un arma al azar
(una cada vez). Los que van detrás reciben armas mejores. Se usa con el botón de arma (o E / Intro).

| ID | Requisito | Estado |
|---|---|---|
| OBJ-01 | 2 puntos de cajas por vuelta, 3 cajas a lo ancho; reaparecen a los 4 s | ✅ |
| OBJ-02 | **Caja de energía**: cubo translúcido brillante con rayo dibujado, anillo giratorio y halo en el suelo | ✅ |
| OBJ-03 | El marcador muestra el arma y la **munición** que queda | ✅ |
| OBJ-04 | Pesos por posición: cohetes y turbo más probables cuanto más atrás; reparación según el daño | ✅ |

## Arsenal

| Arma | Icono | Comportamiento | Estado |
|---|---|---|---|
| Cohete | 🚀 | Teledirigido al coche de delante; explota (salto, giro, daño) | ✅ |
| **Cohetes ×3** | 🚀×3 | Tres cohetes, uno por pulsación | ✅ |
| Bola de agua | 💧 | Se lanza en parábola, rebota y empapa (frena, gira) | ✅ |
| Aceite | 🛢️ | Mancha detrás; quien la pisa pierde casi todo el agarre 1,3 s | ✅ |
| Bomba | 💣 | Patata caliente: se pega a tu coche y se pasa al tocar a otro; explota a los 4,5 s | ✅ |
| Turbo | ⚡ | 2,2 s de potencia ×1,8 y velocidad ×1,35 | ✅ |
| **Pulso eléctrico** | 🔌 | Aura eléctrica 3 s alrededor de tu coche; los coches cercanos se quedan sin motor 1,5 s | ✅ |
| **Bola de acero** | ⚫ | Bola pesada que sale rodando hacia delante y arrolla coches; dura 12 s | ✅ |
| Reparación | 🔧 | +55 de salud y endereza la chapa | ✅ |

## Criterios de aceptación

- La IA usa todas las armas en situaciones razonables ([06-ia.md](06-ia.md)).
- En `racesim` aparecen todas las armas usadas a lo largo de varias carreras.
