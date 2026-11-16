# Visor de circuitos (artefacto de Claude)

Fuente del visor/editor de circuitos que se publica como artefacto (no forma parte del juego).

Reconstruir (desde esta carpeta, con el repo en /home/claude/re-back y `npm ci` hecho):

```
npm i --no-save esbuild
node bundle.mjs && python3 build.py   # genera out/index.html
```

`bundle.mjs` inyecta en `buildCircuit` un gancho (`globalThis.__visorElev`) para poder cambiar cuestas y rampas sin tocar el juego.
