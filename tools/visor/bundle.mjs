import { build } from 'esbuild';
import fs from 'fs';
// Inyecta en buildCircuit un gancho del visor para sobrescribir alturas (no toca el repo)
const hook = {
  name: 'elev-hook',
  setup(b) {
    b.onLoad({ filter: /re-back\/src\/tracks\/common\.js$/i }, (a) => {
      let src = fs.readFileSync(a.path, 'utf8');
      const sig = 'export function buildCircuit(B, def) {';
      if (!src.includes(sig)) throw new Error('firma buildCircuit cambiada');
      src = src.replace(sig, sig + "\n  { const V = globalThis.__visorElev; if (V) { V.seen = { hills: def.hills || [], ramps: def.ramps || [] }; if (V.override) def = { ...def, ...V.override }; } }");
      return { contents: src, loader: 'js' };
    });
  },
};
await build({ entryPoints: ['entry.js'], bundle: true, minify: true, format: 'iife', outfile: 'out/bundle.js', nodePaths: ['/home/claude/re-back/node_modules'], plugins: [hook], logLevel: 'warning' });
