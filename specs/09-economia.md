# 09 · Economía y progresión (desviación DES-02)

Partida guardada en `localStorage` (`reback.profile.v1`): monedas 🪙, coches comprados con sus mejoras,
coche en uso, copas y estrellas.

| ID | Requisito | Estado |
|---|---|---|
| ECO-01 | Inicio: 500 🪙 y solo **Furgo** y **Pulga** (los peores) | ✅ |
| ECO-02 | Premio por carrera: `tabla[puesto] · (0,7 + 0,1·coches) · dificultad · (0,6 + 0,4·vueltas/3)`, tabla 1000/650/450/300/200/150; dificultad ×0,7 / ×1 / ×1,5 | ✅ |
| ECO-03 | Precios de coches de 1.500 a 10.000 (ver [03-coches.md](03-coches.md)) | ✅ |
| ECO-04 | Mejora: `(150 + precio·0,1) · (nivel+1)`, redondeado a 50 | ✅ |
| ECO-05 | Vender: 60 % de lo gastado (coche + mejoras); siempre queda al menos un coche | ✅ |
| ECO-06 | **Copas**: premio final al 1º 100 %, 2º 50 %, 3º 25 % (Bronce 1.500, Plata 3.000, Oro 6.000) además del premio de cada carrera | 🚧 |
| ECO-07 | Copas encadenadas: Plata se abre quedando entre los 3 primeros en Bronce; Oro, en Plata | 🚧 |
| ECO-08 | **Estrella oculta**: 500 🪙 la primera vez que se coge en cada circuito | 🚧 |

## Copas

| Copa | Dificultad | Vueltas | Rivales | Circuitos | Premio |
|---|---|---|---|---|---|
| Bronce | Fácil | 2 | 3 | salón → súper → jardín | 1.500 |
| Plata | Normal | 3 | 3 | súper → jardín → salón | 3.000 |
| Oro | Difícil | 3 | 5 | jardín → salón → súper | 6.000 |

Puntos por carrera: 10 · 6 · 4 · 3 · 2 · 1.
