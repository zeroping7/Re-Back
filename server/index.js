// Servidor online de Re-Back (NET-01..04).
// Salas por código, hasta 10 jugadores. Cada cliente manda su estado binario; el servidor
// reparte instantáneas con todos los coches a TICK_HZ y reenvía eventos (objetos, meta...).
import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = +process.env.PORT || 2567;
const MAX_PLAYERS = 10;
const TICK_HZ = 20;
const STATE_BYTES = 52; // 13 float32 (ver src/net.js)
const START_DELAY = 3000;

const rooms = new Map(); // code -> room
const now = () => Number(process.hrtime.bigint() / 1000n) / 1000; // ms con decimales

function newCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do { c = Array.from({ length: 4 }, () => L[Math.random() * L.length | 0]).join(''); } while (rooms.has(c));
  return c;
}

function lobby(room) {
  return {
    t: 'lobby', code: room.code, host: room.host, state: room.state, opts: room.opts,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, car: p.car, ready: p.ready })),
  };
}
function send(p, msg) { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(msg)); }
function broadcast(room, msg, except) {
  const s = JSON.stringify(msg);
  for (const p of room.players.values()) if (p !== except && p.ws.readyState === 1) p.ws.send(s);
}

function leave(p) {
  const room = p.room;
  if (!room) return;
  room.players.delete(p.id);
  p.room = null;
  if (!room.players.size) { rooms.delete(room.code); return; }
  if (room.host === p.id) room.host = room.players.keys().next().value;
  broadcast(room, { t: 'left', id: p.id });
  broadcast(room, lobby(room));
}

function join(p, room, name, car) {
  let id = 0;
  while (room.players.has(id)) id++;
  p.id = id; p.room = room; p.name = String(name || 'Jugador').slice(0, 16); p.car = String(car || '').slice(0, 20);
  p.ready = false; p.state = null;
  room.players.set(id, p);
  send(p, { t: 'joined', code: room.code, id });
  broadcast(room, lobby(room));
}

function onText(p, m) {
  const room = p.room;
  switch (m.t) {
    case 'ping': return send(p, { t: 'pong', c: m.c, s: now() });
    case 'create': {
      if (room) leave(p);
      const r = { code: newCode(), players: new Map(), host: 0, state: 'lobby', opts: {} };
      rooms.set(r.code, r);
      return join(p, r, m.name, m.car);
    }
    case 'join': {
      const r = rooms.get(String(m.code || '').toUpperCase());
      if (!r) return send(p, { t: 'error', e: 'Sala no encontrada' });
      if (r.players.size >= MAX_PLAYERS) return send(p, { t: 'error', e: 'Sala llena' });
      if (r.state !== 'lobby') return send(p, { t: 'error', e: 'La carrera ya ha empezado' });
      if (room) leave(p);
      return join(p, r, m.name, m.car);
    }
    case 'leave': return leave(p);
  }
  if (!room) return;
  switch (m.t) {
    case 'profile':
      if (m.name) p.name = String(m.name).slice(0, 16);
      if (m.car) p.car = String(m.car).slice(0, 20);
      if ('ready' in m) p.ready = !!m.ready;
      return broadcast(room, lobby(room));
    case 'opts':
      if (p.id !== room.host) return;
      room.opts = m.opts || {};
      return broadcast(room, lobby(room));
    case 'start': {
      if (p.id !== room.host || room.state !== 'lobby') return;
      room.state = 'race';
      if (m.opts) room.opts = m.opts;
      const order = [...room.players.keys()].sort(() => Math.random() - 0.5); // parrilla
      for (const q of room.players.values()) q.state = null;
      return broadcast(room, { t: 'start', at: now() + START_DELAY, opts: room.opts, grid: order });
    }
    case 'end':
      if (p.id !== room.host) return;
      room.state = 'lobby';
      for (const q of room.players.values()) q.ready = false;
      return broadcast(room, lobby(room));
    case 'ev': // evento de juego: se reenvía con autor y hora del servidor
      return broadcast(room, { t: 'ev', from: p.id, s: now(), d: m.d }, p);
  }
}

function tick() {
  for (const room of rooms.values()) {
    const list = [...room.players.values()].filter(p => p.state);
    if (!list.length) continue;
    // [u8 tipo=2][u8 n][f64 horaServidor] + n × ([u8 id][52 B estado])
    const buf = Buffer.allocUnsafe(10 + list.length * (1 + STATE_BYTES));
    buf.writeUInt8(2, 0); buf.writeUInt8(list.length, 1); buf.writeDoubleLE(now(), 2);
    let o = 10;
    for (const p of list) { buf.writeUInt8(p.id, o); p.state.copy(buf, o + 1); o += 1 + STATE_BYTES; }
    for (const p of room.players.values()) if (p.ws.readyState === 1 && p.ws.bufferedAmount < 64e3) p.ws.send(buf);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    let players = 0; for (const r of rooms.values()) players += r.players.size;
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size, players }));
  }
  res.writeHead(404); res.end();
});
const wss = new WebSocketServer({ server, maxPayload: 4096, perMessageDeflate: false });

wss.on('connection', (ws, req) => {
  req.socket.setNoDelay(true);
  const p = { ws, id: -1, room: null, alive: true, msgs: 0 };
  players.add(p);
  ws.on('pong', () => { p.alive = true; });
  ws.on('message', (data, isBinary) => {
    if (++p.msgs > 120) return; // límite: 120 mensajes/s
    if (isBinary) {
      // [u8 tipo=1][52 B estado]
      if (p.room && data.length === 1 + STATE_BYTES && data[0] === 1) p.state = Buffer.from(data.subarray(1));
      return;
    }
    let m; try { m = JSON.parse(data); } catch { return; }
    if (m && typeof m.t === 'string') onText(p, m);
  });
  ws.on('close', () => { players.delete(p); leave(p); });
  ws.on('error', () => {});
});

const players = new Set();
setInterval(tick, 1000 / TICK_HZ);
setInterval(() => { for (const p of players) p.msgs = 0; }, 1000);
// Conexiones muertas: ping cada 10 s, se cierran si no contestan
setInterval(() => {
  for (const p of players) {
    if (!p.alive) { p.ws.terminate(); continue; }
    p.alive = false; p.ws.ping();
  }
}, 10000);

server.listen(PORT, () => console.log(`Re-Back server en :${PORT}`));
