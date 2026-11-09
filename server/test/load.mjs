// Prueba de carga (NET-01..05): 10 clientes con src/net.js en una sala, 20 Hz durante 5 s.
import { spawn } from 'node:child_process';
import { Net } from '../../src/net.js';

const url = process.argv[2] || 'ws://localhost:2567';
let srv;
if (!process.argv[2]) {
  srv = spawn('node', [new URL('../index.js', import.meta.url).pathname], { stdio: 'inherit', env: { ...process.env, PORT: '2567' } });
  await new Promise(r => setTimeout(r, 500));
}
const N = 10, SECS = 5;
const fail = m => { console.log('❌', m); srv?.kill(); process.exit(1); };

const host = new Net(url); await host.connect();
const { code } = await host.create('P0', 'rayo');
const clients = [host];
for (let i = 1; i < N; i++) { const c = new Net(url); await c.connect(); await c.join(code, 'P' + i, 'pulga'); clients.push(c); }
await new Promise(r => setTimeout(r, 200));
if (host.room.players.length !== N) fail(`sala con ${host.room.players.length} jugadores`);
console.log(`Sala ${code} con ${N} jugadores ✔`);

// Sala llena
const extra = new Net(url); await extra.connect();
await extra.join(code, 'X', 'x').then(() => fail('entró el 11º'), e => console.log(`11º rechazado: "${e.message}" ✔`));
extra.close();

// Salida simultánea
const starts = [];
clients.forEach(c => c.on('start', m => starts.push(m.at - c.now())));
host.start({ track: 'salon', laps: 3 });
await new Promise(r => setTimeout(r, 300));
if (starts.length !== N) fail('no todos recibieron start');

// Eventos
let evs = 0; clients[3].on('ev', m => { if (m.from === 0 && m.d.item === 'cohete') evs++; });
host.event({ item: 'cohete', target: 3 });

// Estados a 20 Hz: cada coche se mueve en círculo
clients.forEach(c => { c.stats.snaps = 0; c.stats.bytesIn = 0; });
const t0 = performance.now();
const timers = clients.map((c, i) => setInterval(() => {
  const a = (performance.now() - t0) / 1000 + i;
  c.sendState({ x: Math.cos(a) * 20, y: 0.3, z: Math.sin(a) * 20 }, { x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) },
    { x: -Math.sin(a) * 20, y: 0, z: Math.cos(a) * 20 }, 0.2, 1);
}, 50));
// Error de interpolación: comparar lo que ve el cliente 1 del coche 0 con la posición real hace 100 ms
let maxErr = 0;
await new Promise(r => setTimeout(r, 1000));
const probe = setInterval(() => {
  const s = clients[1].sample(0); if (!s) return;
  const a = (clients[1].now() - 100 - (t0 + host.offset)) / 1000;
  const err = Math.hypot(s.pos.x - Math.cos(a) * 20, s.pos.z - Math.sin(a) * 20);
  maxErr = Math.max(maxErr, err);
}, 16);
await new Promise(r => setTimeout(r, (SECS - 1) * 1000));
timers.forEach(clearInterval); clearInterval(probe);

const snaps = Math.min(...clients.map(c => c.stats.snaps)) / SECS;
const kbs = Math.max(...clients.map(c => c.stats.bytesIn)) / SECS / 1024;
const offs = clients.map(c => c.offset), skew = Math.max(...offs) - Math.min(...offs);
const startSkew = Math.max(...starts) - Math.min(...starts);
console.log(`Instantáneas/s por cliente (mín): ${snaps.toFixed(1)}  ${snaps >= 18 ? '✔' : '❌'}`);
console.log(`Bajada por jugador (máx): ${kbs.toFixed(1)} KB/s  ${kbs < 15 ? '✔' : '❌'}`);
console.log(`Desfase de reloj entre clientes: ${skew.toFixed(2)} ms  ${skew < 5 ? '✔' : '❌'}  (salida: ${startSkew.toFixed(2)} ms)`);
console.log(`Eventos recibidos: ${evs}  ${evs === 1 ? '✔' : '❌'}`);
console.log(`Error de interpolación máx: ${maxErr.toFixed(2)} u (radio 20, 20 u/s)`);
console.log(`RTT: ${clients.map(c => c.rtt.toFixed(1)).join(' ')} ms`);
clients.forEach(c => c.close()); srv?.kill();
process.exit(snaps >= 18 && kbs < 15 && skew < 5 && evs === 1 ? 0 : 1);
