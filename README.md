# Re-Back 🏎️

Carreras de coches RC low-poly para Android, inspiradas en Re-Volt.

- Jugar en el navegador: https://zeroping7.github.io/Re-Back/
- Descargar APK: https://github.com/zeroping7/Re-Back/releases/latest/download/re-back.apk

Estado y plan: ver [PROGRESO.md](PROGRESO.md).

## Desarrollo
```
npm install
npm run dev      # servidor local
npm run build    # genera dist/
node tests/sim.mjs   # simulación sin gráficos con piloto automático
```
Cada push a `main` publica la web (rama `gh-pages`) y compila el APK (Releases).
