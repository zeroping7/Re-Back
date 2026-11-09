// Cliente online de Re-Back (NET-02..05). Sin dependencias: funciona en navegador y en Node 22.
//
// Estado de un coche (13 float32 = 52 B):
//   [0] hora (s, servidor mod 1000)  [1..3] posición  [4..7] cuaternión  [8..10] velocidad
//   [11] dirección (-1..1)  [12] extra (bits: 1 acelera, 2 frena, 4 turbo, 8 derrape)

export const DEFAULT_SERVER = 'wss://re-back.sslip.io'; // se cambia cuando exista la IP del servidor
const STATE_N = 13;
const WRAP = 1000; // s
export const INTERP_DELAY = 100; // ms por detrás del tiempo real
const MAX_EXTRAP = 250; // ms

function serverUrl() {
  try {
    const q = new URLSearchParams(location.search).get('server');
    if (q) return q;
    const s = localStorage.getItem('rb-server');
    if (s) return s;
  } catch { /* Node */ }
  return DEFAULT_SERVER;
}

export class Net {
  constructor(url = serverUrl()) {
    this.url = url;
    this.ws = null;
    this.id = -1;
    this.room = null; // último 'lobby'
    this.offset = 0; // horaServidor - performance.now()
    this.rtt = 0;
    this.remotes = new Map(); // id -> [{t, s: Float32Array}]
    this.handlers = {};
    this._pings = [];
    this._out = new ArrayBuffer(1 + STATE_N * 4);
    this._outU8 = new Uint8Array(this._out);
    this._outView = new DataView(this._out);
    this.stats = { snaps: 0, bytesIn: 0 };
  }

  on(type, fn) { (this.handlers[type] ||= []).push(fn); return this; }
  _emit(type, m) { for (const fn of this.handlers[type] || []) fn(m); }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      ws.binaryType = 'arraybuffer';
      this.ws = ws;
      ws.onopen = () => {
        this._outU8[0] = 1;
        for (let i = 0; i < 5; i++) setTimeout(() => this.ping(), i * 60);
        this._pingTimer = setInterval(() => this.ping(), 2000);
        setTimeout(resolve, 320);
      };
      ws.onerror = e => reject(e);
      ws.onclose = () => { clearInterval(this._pingTimer); this._emit('close'); };
      ws.onmessage = ev => this._onMessage(ev.data);
    });
  }
  close() { this.ws?.close(); }

  // Hora del servidor estimada (ms)
  now() { return performance.now() + this.offset; }

  ping() { this._text({ t: 'ping', c: performance.now() }); }
  _text(m) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m)); }

  create(name, car) { this._text({ t: 'create', name, car }); return this._wait('joined'); }
  join(code, name, car) { this._text({ t: 'join', code, name, car }); return this._wait('joined'); }
  leave() { this._text({ t: 'leave' }); this.room = null; this.remotes.clear(); }
  profile(p) { this._text({ t: 'profile', ...p }); }
  setOpts(opts) { this._text({ t: 'opts', opts }); }
  start(opts) { this._text({ t: 'start', opts }); }
  end() { this._text({ t: 'end' }); }
  event(d) { this._text({ t: 'ev', d }); }
  get isHost() { return this.room && this.room.host === this.id; }

  _wait(type) {
    return new Promise((resolve, reject) => {
      const ok = m => { done(); resolve(m); };
      const ko = m => { done(); reject(new Error(m.e)); };
      const done = () => {
        this.handlers[type] = this.handlers[type].filter(f => f !== ok);
        this.handlers.error = this.handlers.error.filter(f => f !== ko);
      };
      this.on(type, ok).on('error', ko);
    });
  }

  // Envía el estado del coche propio. pos/vel: {x,y,z}; quat: {x,y,z,w}
  sendState(pos, quat, vel, steer = 0, flags = 0) {
    if (this.ws?.readyState !== 1 || this.ws.bufferedAmount > 16e3) return;
    const v = this._outView;
    const vals = [(this.now() / 1000) % WRAP, pos.x, pos.y, pos.z, quat.x, quat.y, quat.z, quat.w,
      vel.x, vel.y, vel.z, steer, flags];
    for (let i = 0; i < STATE_N; i++) v.setFloat32(1 + i * 4, vals[i], true);
    this.ws.send(this._out);
  }

  _onMessage(data) {
    if (typeof data !== 'string') {
      this.stats.bytesIn += data.byteLength;
      const v = new DataView(data);
      if (v.getUint8(0) !== 2) return;
      this.stats.snaps++;
      const n = v.getUint8(1);
      const nowS = this.now() / 1000;
      let o = 10;
      for (let k = 0; k < n; k++, o += 1 + STATE_N * 4) {
        const id = v.getUint8(o);
        if (id === this.id) continue;
        const s = new Float32Array(STATE_N);
        for (let i = 0; i < STATE_N; i++) s[i] = v.getFloat32(o + 1 + i * 4, true);
        // Desenvolver la hora (mod 1000 s) a ms absolutos cercanos a "ahora"
        let t = s[0] + Math.round((nowS - s[0]) / WRAP) * WRAP;
        t *= 1000;
        let buf = this.remotes.get(id);
        if (!buf) this.remotes.set(id, buf = []);
        if (buf.length && t <= buf[buf.length - 1].t) continue; // repetido o desordenado
        buf.push({ t, s });
        if (buf.length > 30) buf.shift();
      }
      return;
    }
    this.stats.bytesIn += data.length;
    const m = JSON.parse(data);
    if (m.t === 'pong') {
      const t = performance.now();
      const rtt = t - m.c;
      this._pings.push({ rtt, off: m.s - (m.c + rtt / 2) });
      if (this._pings.length > 10) this._pings.shift();
      const best = this._pings.reduce((a, b) => (b.rtt < a.rtt ? b : a));
      this.offset = best.off; this.rtt = best.rtt;
      return;
    }
    if (m.t === 'joined') { this.id = m.id; this.remotes.clear(); }
    if (m.t === 'lobby') this.room = m;
    if (m.t === 'left') this.remotes.delete(m.id);
    this._emit(m.t, m);
  }

  // Estado interpolado de un coche remoto para pintarlo. Devuelve null si no hay datos.
  // out = {pos:{x,y,z}, quat:{x,y,z,w}, vel:{x,y,z}, steer, flags, age}
  sample(id, out = { pos: {}, quat: {}, vel: {} }) {
    const buf = this.remotes.get(id);
    if (!buf || !buf.length) return null;
    const rt = this.now() - INTERP_DELAY;
    let a = buf[0], b = null;
    for (let i = buf.length - 1; i >= 0; i--) {
      if (buf[i].t <= rt) { a = buf[i]; b = buf[i + 1] || null; break; }
    }
    const A = a.s;
    if (b) {
      const k = (rt - a.t) / (b.t - a.t), B = b.s;
      out.pos.x = A[1] + (B[1] - A[1]) * k; out.pos.y = A[2] + (B[2] - A[2]) * k; out.pos.z = A[3] + (B[3] - A[3]) * k;
      nlerp(A, B, k, out.quat);
      out.vel.x = A[8] + (B[8] - A[8]) * k; out.vel.y = A[9] + (B[9] - A[9]) * k; out.vel.z = A[10] + (B[10] - A[10]) * k;
      out.steer = A[11] + (B[11] - A[11]) * k; out.flags = B[12];
    } else {
      // Sin muestra posterior: extrapolar con la velocidad (máx. 250 ms)
      const dt = Math.max(0, Math.min(MAX_EXTRAP, rt - a.t)) / 1000;
      out.pos.x = A[1] + A[8] * dt; out.pos.y = A[2] + A[9] * dt; out.pos.z = A[3] + A[10] * dt;
      out.quat.x = A[4]; out.quat.y = A[5]; out.quat.z = A[6]; out.quat.w = A[7];
      out.vel.x = A[8]; out.vel.y = A[9]; out.vel.z = A[10];
      out.steer = A[11]; out.flags = A[12];
    }
    out.age = this.now() - buf[buf.length - 1].t;
    return out;
  }
}

function nlerp(A, B, k, o) {
  let bx = B[4], by = B[5], bz = B[6], bw = B[7];
  if (A[4] * bx + A[5] * by + A[6] * bz + A[7] * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
  const x = A[4] + (bx - A[4]) * k, y = A[5] + (by - A[5]) * k, z = A[6] + (bz - A[6]) * k, w = A[7] + (bw - A[7]) * k;
  const l = Math.hypot(x, y, z, w) || 1;
  o.x = x / l; o.y = y / l; o.z = z / l; o.w = w / l;
}
