// Revisa un trazado: radios mínimos, separación entre tramos y dibuja un PNG (via python)
import fs from 'fs';
const THREE = await import('three');
const [pts, W, name, box] = [JSON.parse(process.argv[2]), +process.argv[3], process.argv[4] || 'layout', JSON.parse(process.argv[5] || '[48,34]')];
const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
const L = c.getLength(), N = Math.round(L / 1.6);
const S = [];
for (let i = 0; i < N; i++) { const p = c.getPointAt(i / N); S.push([p.x, p.z]); }
let minR = 1e9, at = null;
for (let i = 0; i < N; i++) {
  const t1 = c.getTangentAt(i / N), t2 = c.getTangentAt(((i + 2) % N) / N);
  const da = Math.acos(Math.min(1, t1.dot(t2))); const r = 3.2 / Math.max(da, 1e-6);
  if (r < minR) { minR = r; at = S[i]; }
}
let minSep = 1e9, sepAt = null;
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  const d = Math.min(j - i, N - (j - i)); if (d * 1.6 < 30) continue;
  const dd = Math.hypot(S[i][0] - S[j][0], S[i][1] - S[j][1]);
  if (dd < minSep) { minSep = dd; sepAt = [S[i], S[j]]; }
}
let out = 0;
for (const [x, z] of S) if (Math.abs(x) > box[0] - W / 2 - 1.5 || Math.abs(z) > box[1] - W / 2 - 1.5) out++;
console.log(`${name}: len=${L.toFixed(0)} minR=${minR.toFixed(1)} at ${at.map(Math.round)} minSep=${minSep.toFixed(1)} at ${JSON.stringify(sepAt.map((p) => p.map(Math.round)))} outOfRoom=${out}`);
fs.writeFileSync(`/tmp/${name}.json`, JSON.stringify({ S, W, box }));
