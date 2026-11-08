const THREE = await import('three');
const pts = JSON.parse(process.argv[2]).map(([x, z]) => new THREE.Vector3(x, 0, z));
const c = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
const N = 400, L = c.getLength();
let out = [];
for (let i = 0; i < N; i++) {
  const t1 = c.getTangentAt(i / N), t2 = c.getTangentAt((i + 1) / N);
  const da = Math.acos(Math.min(1, t1.dot(t2)));
  const r = (L / N) / Math.max(da, 1e-6);
  if (r < 9) { const p = c.getPointAt(i / N); out.push(`${p.x.toFixed(0)},${p.z.toFixed(0)} r=${r.toFixed(1)}`); }
}
console.log('len', L.toFixed(0)); console.log(out.join('\n'));
