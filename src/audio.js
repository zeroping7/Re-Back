// Sonido sintetizado: derrapes, golpes, efectos, ambiente y música. Motores: muestras realistas por coche (AUD-13)
// con el motor sintetizado (AUD-10) como respaldo mientras cargan o si fallan.
import enginesMeta from './assets/engines.json';
import enginesUrl from './assets/engines.bin?url';
import skidUrl from './assets/skid.ogg?url'; // AUD-15: chirrido grabado de verdad (Kenney Starter Kit Racing, por Landeplage, CC0)

// Ondas con armónicos a medida (se crean una vez por contexto)
export function makeWaves(ctx) {
  const N = 32;
  const wave = (fn) => {
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) im[n] = fn(n);
    return ctx.createPeriodicWave(re, im);
  };
  return {
    // eléctrico: bobinado del motor, fundamental fuerte + 2.º y 3.º armónico, poco brillo
    electric: wave((n) => (n === 1 ? 1 : n === 2 ? 0.55 : n === 3 ? 0.3 : n === 6 ? 0.12 : 0.6 / (n * n))),
    // nitro: explosiones cortas → pulso estrecho (muchos armónicos casi iguales que caen despacio)
    nitro: wave((n) => (Math.sin(n * Math.PI * 0.18) / (n * 0.18 * Math.PI)) * (n % 2 ? 1 : 0.8)),
  };
}

// Una voz de motor: 2 osciladores + chillido de engranajes + ruido (escobillas / escape) + saturación
export class EngineVoice {
  constructor(ctx, out, waves, noiseBuf, { pan = false } = {}) {
    this.ctx = ctx; this.waves = waves;
    const osc = (type) => { const o = ctx.createOscillator(); if (type) o.type = type; return o; };
    const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    this.o1 = osc(); this.o2 = osc('sawtooth'); this.whine = osc('sine');
    this.g1 = gain(1); this.g2 = gain(0.2); this.gw = gain(0);
    this.noise = ctx.createBufferSource(); this.noise.buffer = noiseBuf; this.noise.loop = true;
    this.nf = ctx.createBiquadFilter(); this.nf.type = 'bandpass'; this.nf.Q.value = 1.2;
    this.ng = gain(0);
    this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.Q.value = 2.5;
    this.shaper = ctx.createWaveShaper();
    this.am = gain(1);                    // pulsos de explosión (nitro) / rizado (eléctrico)
    this.lfo = osc('sine'); this.lfoDepth = gain(0);
    this.out = gain(0);
    this.lfo.connect(this.lfoDepth).connect(this.am.gain);
    this.o1.connect(this.g1).connect(this.filter);
    this.o2.connect(this.g2).connect(this.filter);
    this.noise.connect(this.nf).connect(this.ng).connect(this.filter);
    this.filter.connect(this.shaper).connect(this.am).connect(this.out);
    this.whine.connect(this.gw).connect(this.out);
    this.pan = pan && ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (this.pan) this.out.connect(this.pan).connect(out); else this.out.connect(out);
    for (const o of [this.o1, this.o2, this.whine, this.lfo]) o.start();
    this.noise.start(0, Math.random());
    this.setType('electric', 1);
  }

  setType(type, pitch = 1) {
    if (this.type === type && this.pitch === pitch) return;
    this.type = type; this.pitch = pitch;
    const nitro = type === 'nitro';
    this.o1.setPeriodicWave(this.waves[nitro ? 'nitro' : 'electric']);
    this.o2.type = nitro ? 'sawtooth' : 'triangle';
    this.nf.type = nitro ? 'bandpass' : 'highpass';
    this.lfo.type = nitro ? 'square' : 'sine';
    const n = 512, curve = new Float32Array(n), k = nitro ? 3.2 : 1.4;
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * k) / Math.tanh(k); }
    this.shaper.curve = curve;
  }

  // rpm: 0 (ralentí) … 1 (tope) · load: gas 0…1 · vol: volumen final · dop: multiplicador Doppler
  set(rpm, load, vol, { dop = 1, tc = 0.04 } = {}) {
    const t = this.ctx.currentTime, P = this.pitch * dop;
    const st = (p, v, k = tc) => p.setTargetAtTime(v, t, k);
    if (this.type === 'nitro') {
      // monocilíndrico de 2 tiempos: frecuencia de explosiones de ~35 Hz (ralentí) a ~190 Hz
      const f = (34 + rpm * 156) * P;
      st(this.o1.frequency, f);
      st(this.o2.frequency, f * 0.5);                  // medio orden: explosiones irregulares
      st(this.g2.gain, 0.35 - rpm * 0.2);
      st(this.lfo.frequency, f);
      st(this.lfoDepth.gain, 0.55 - rpm * 0.35);      // a pocas vueltas se oye cada explosión
      st(this.nf.frequency, f * 4.5); st(this.nf.Q, 1.4);
      st(this.ng.gain, 0.25 + load * 0.45);            // escape rasposo
      st(this.filter.frequency, 260 + rpm * 1700 + load * 1300);
      st(this.whine.frequency, f * 7.3); st(this.gw.gain, 0.012 * rpm); // embrague / piñones
    } else {
      // eléctrico: zumbido que sube con las vueltas + chillido de piñones y siseo de escobillas
      const f = (90 + rpm * 330) * P;
      st(this.o1.frequency, f);
      st(this.o2.frequency, f * 2.005);
      st(this.g2.gain, 0.15 + load * 0.2);
      st(this.lfo.frequency, 21 + rpm * 12);
      st(this.lfoDepth.gain, 0.05 + load * 0.08);
      st(this.nf.frequency, 2500 + rpm * 3500); st(this.nf.Q, 0.7);
      st(this.ng.gain, 0.03 + load * 0.05 + rpm * 0.04);
      st(this.filter.frequency, 450 + rpm * 2200 + load * 900);
      st(this.whine.frequency, f * 3.62);
      st(this.gw.gain, (0.04 + load * 0.08) * (0.3 + rpm));
    }
    st(this.out.gain, vol, tc * 1.5);
  }

  // mismo nombre que SampleVoice: el tipo y el tono salen de la ficha del coche
  setCar(def, slot = 0) { this.setType(def?.motor === 'Nitro' ? 'nitro' : 'electric', carPitch(def) * (1 + slot * 0.02)); }

  silence(k = 0.05) { this.out.gain.setTargetAtTime(0, this.ctx.currentTime, k); }

  dispose() {
    this.silence(0.02);
    const t = this.ctx.currentTime + 0.15;
    for (const o of [this.o1, this.o2, this.whine, this.lfo, this.noise]) { try { o.stop(t); } catch { /* ya parado */ } }
  }
}

// ---------- Motores con muestras (AUD-13) ----------
// engines.bin: bucles μ-law de 8 sonidos base × 7 regímenes × (gas | sin gas). Ver tools/engines/make_engines.py
export async function loadEngineBank(ctx) {
  const bin = new Uint8Array(await (await fetch(enginesUrl)).arrayBuffer());
  const mu = enginesMeta.mu, lut = new Float32Array(256);
  for (let q = 0; q < 256; q++) { const y = (q / 255) * 2 - 1; lut[q] = Math.sign(y) * (Math.pow(1 + mu, Math.abs(y)) - 1) / mu; }
  const bank = {};
  for (const [key, b] of Object.entries(enginesMeta.bases)) {
    const layers = { on: [], off: [] };
    for (const l of b.loops) {
      const buf = ctx.createBuffer(1, l.len, enginesMeta.sr), d = buf.getChannelData(0);
      for (let i = 0; i < l.len; i++) d[i] = lut[bin[l.off + i]];
      layers[l.load][l.layer] = { buf, r: l.r };
    }
    bank[key] = { type: b.type, idle: b.idle, layers };
  }
  return bank;
}

const SAMPLE_GAIN = 4.0; // ajusta el nivel de las muestras al del motor sintetizado

// Una voz de motor con muestras: mezcla los 2 regímenes vecinos (y gas / sin gas) y ajusta el tono con las vueltas
export class SampleVoice {
  constructor(ctx, out, bank, { pan = false } = {}) {
    this.ctx = ctx; this.bank = bank;
    this.out = ctx.createGain(); this.out.gain.value = 0;
    this.pan = pan && ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (this.pan) this.out.connect(this.pan).connect(out); else this.out.connect(out);
    this.act = new Map(); this.base = null; this.pitch = 1; this.type = 'electric';
  }

  setCar(def) {
    const nitro = def?.motor === 'Nitro', s = def?.sound || [nitro ? 'n1' : 'e1', 1];
    const base = this.bank[s[0]] ? s[0] : nitro ? 'n1' : 'e1';
    this.pitch = s[1];
    if (base !== this.base) { this.base = base; this.type = this.bank[base].type; this._clear(0.04); }
  }

  _clear(k = 0.05) {
    const t = this.ctx.currentTime;
    for (const a of this.act.values()) { a.g.gain.setTargetAtTime(0, t, k * 0.5); try { a.src.stop(t + k * 5); } catch { /* ya parado */ } }
    this.act.clear();
  }

  _need(key, e, gain, rate, t, tc) {
    let a = this.act.get(key);
    if (!a) {
      const src = this.ctx.createBufferSource(); src.buffer = e.buf; src.loop = true;
      const g = this.ctx.createGain(); g.gain.value = 0;
      src.connect(g).connect(this.out);
      src.playbackRate.value = rate;
      src.start(0, Math.random() * e.buf.duration);
      a = { src, g }; this.act.set(key, a);
    }
    a.g.gain.setTargetAtTime(gain, t, tc);
    a.src.playbackRate.setTargetAtTime(rate, t, tc);
  }

  // rpm: 0 (ralentí) … 1,2 · load: gas 0…1 · vol: volumen final · dop: multiplicador Doppler
  set(rpm, load, vol, { dop = 1, tc = 0.04 } = {}) {
    const b = this.bank[this.base];
    if (!b) return;
    const t = this.ctx.currentTime;
    if (vol < 0.0006) { this.out.gain.setTargetAtTime(0, t, tc * 1.5); if (this.act.size) this._clear(0.1); return; }
    // vueltas del juego → régimen de la muestra (el nitro nunca baja del ralentí)
    const R = b.type === 'nitro' ? b.idle + Math.min(1.25, Math.max(0, (rpm - 0.04) / 0.96)) * (1 - b.idle) : Math.max(0.03, rpm);
    const on = b.layers.on, rs = on.map((l) => l.r);
    let i = 0; while (i < rs.length - 2 && R > rs[i + 1]) i++;
    const f = Math.min(1, Math.max(0, Math.log(R / rs[i]) / Math.log(rs[i + 1] / rs[i])));
    const ld = Math.min(1, Math.max(0, load));
    const wl = { on: Math.sin(ld * Math.PI / 2), off: Math.cos(ld * Math.PI / 2) };
    const wr = [Math.cos(f * Math.PI / 2), Math.sin(f * Math.PI / 2)];
    const keep = new Set();
    for (const lk of ['on', 'off']) {
      for (let j = 0; j < 2; j++) {
        const g = wl[lk] * wr[j], layer = i + j, key = lk + layer;
        if (g < 0.01) continue;
        keep.add(key);
        const rate = Math.min(3, Math.max(0.2, R / rs[layer] * this.pitch * dop));
        this._need(key, b.layers[lk][layer], g, rate, t, tc);
      }
    }
    for (const [key, a] of this.act) {
      if (keep.has(key)) continue;
      a.g.gain.setTargetAtTime(0, t, tc); try { a.src.stop(t + 0.3); } catch { /* ya parado */ }
      this.act.delete(key);
    }
    this.out.gain.setTargetAtTime(vol * SAMPLE_GAIN, t, tc * 1.5);
  }

  silence(k = 0.05) {
    this.out.gain.setTargetAtTime(0, this.ctx.currentTime, k);
    if (this.act.size) this._clear(Math.max(0.1, k * 2));
  }

  dispose() { this.silence(0.02); }
}

// Tono propio de cada coche: el nombre cambia un poco el timbre y el peso lo hace más grave
function carPitch(def) {
  if (!def) return 1;
  let h = 0; for (const ch of def.id || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (0.9 + (h % 1000) / 1000 * 0.2) * Math.pow(8 / (def.mass || 8), 0.35);
}

const SURF = {
  water: { type: 'bandpass', f: 1100, fs: 40, q: 0.6, vol: 0.2, lfo: 6.5, depth: 0.4 },   // chapoteo: siseo medio con olas
  mud: { type: 'lowpass', f: 360, fs: 12, q: 0.9, vol: 0.28, lfo: 3.2, depth: 0.55 },     // barro: murmullo grave y pegajoso
  sand: { type: 'bandpass', f: 2600, fs: 35, q: 0.5, vol: 0.12, lfo: 9, depth: 0.3 },     // arena: siseo fino rasposo
  wet: { type: 'highpass', f: 3200, fs: 30, q: 0.5, vol: 0.07, lfo: 0, depth: 0 },        // suelo mojado: pulverizado suave
};

// Bucle de chirrido de neumático (2 s, sin costura): tono principal ~1,2 kHz que deriva despacio, armónicos,
// vibración de "pega-suelta" (stick-slip) a 35-70 Hz y un roce de ruido filtrado
function squealBuffer(ctx) {
  const sr = ctx.sampleRate, L = Math.floor(sr * 2), X = Math.floor(sr * 0.12);
  const raw = new Float32Array(L + X);
  let ph = 0, wander = 0, wv = 0, chat = 0, ch = 0, lp = 0, bp = 0;
  for (let i = 0; i < L + X; i++) {
    wv += (Math.random() - 0.5) * 0.004; wv *= 0.9995; wander += wv; wander *= 0.9999;
    const f = 1180 + wander * 900 + Math.sin(i / sr * 2 * Math.PI * 5.3) * 25;
    ph += (2 * Math.PI * f) / sr;
    ch += (2 * Math.PI * (48 + Math.sin(i / sr * 3.1) * 18)) / sr;
    chat = 0.55 + 0.45 * Math.abs(Math.sin(ch + Math.random() * 0.3));
    const tone = Math.sin(ph) + 0.4 * Math.sin(2 * ph + 0.5) + 0.18 * Math.sin(3 * ph + 1.1) + 0.08 * Math.sin(5 * ph);
    const w = Math.random() * 2 - 1;
    lp += (w - lp) * 0.35; bp += (lp - bp) * 0.08; // ruido de banda media-alta
    raw[i] = tone * chat * 0.55 + (lp - bp) * 0.5;
  }
  const buf = ctx.createBuffer(1, L, sr), d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < L; i++) {
    let v = raw[i];
    if (i < X) { const k = i / X; v = raw[i] * k + raw[L + i] * (1 - k); } // fundido para que el bucle no se note
    d[i] = v; peak = Math.max(peak, Math.abs(v));
  }
  for (let i = 0; i < L; i++) d[i] /= peak;
  return buf;
}

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('reback.muted') === '1';
    this.musicOn = localStorage.getItem('reback.music') !== '0';
    this.engineType = 'electric'; this.enginePitch = 1; this.carDef = null; this.bank = null;
    this.rpm = 0; this._lastThr = 0; this._popCool = 0;
  }

  start() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(ctx.destination);

    // ruido para motores, derrapes y golpes
    const len = ctx.sampleRate * 1.5;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    const waves = makeWaves(ctx);
    this.engine = new EngineVoice(ctx, this.master, waves, buf);
    this.engine.setType(this.engineType, this.enginePitch);
    // tres voces para los motores de los rivales más cercanos
    this.rivalVoices = [0, 1, 2].map(() => new EngineVoice(ctx, this.master, waves, buf, { pan: true }));
    this._loadBank();

    // AUD-14: chirrido de neumático (bucle sintetizado: tono que vibra + roce) solo en suelos duros
    const n = ctx.createBufferSource(); n.buffer = squealBuffer(ctx); n.loop = true;
    this.skidSrc = n;
    this.skidFilter = ctx.createBiquadFilter(); this.skidFilter.type = 'highpass'; this.skidFilter.frequency.value = 500; this.skidFilter.Q.value = 0.7;
    this.skidGain = ctx.createGain(); this.skidGain.gain.value = 0;
    n.connect(this.skidFilter).connect(this.skidGain).connect(this.master);
    n.start();
    this._loadSkid();

    // capa continua de superficie (agua chapoteando, barro chapoteante, arena rasposa): ruido filtrado con trémolo irregular
    const sn = ctx.createBufferSource(); sn.buffer = buf; sn.loop = true;
    this.surfFilter = ctx.createBiquadFilter(); this.surfFilter.type = 'bandpass'; this.surfFilter.frequency.value = 1000; this.surfFilter.Q.value = 0.6;
    this.surfAM = ctx.createGain(); this.surfAM.gain.value = 0.7;
    this.surfGain = ctx.createGain(); this.surfGain.gain.value = 0;
    this.surfLfo = ctx.createOscillator(); this.surfLfo.frequency.value = 5;
    this.surfLfoDepth = ctx.createGain(); this.surfLfoDepth.gain.value = 0;
    this.surfLfo.connect(this.surfLfoDepth).connect(this.surfAM.gain);
    sn.connect(this.surfFilter).connect(this.surfAM).connect(this.surfGain).connect(this.master);
    sn.start(0, Math.random()); this.surfLfo.start();
    this._surf = null;
  }

  // Sonido continuo de la superficie bajo el coche del jugador. surf: 'water' | 'mud' | 'sand' | 'wet' | null
  setSurface(surf, speed = 0, air = false) {
    if (!this.ctx || !this.surfGain) return;
    const t = this.ctx.currentTime, P = SURF[surf];
    const k = P && !air ? Math.min(1, Math.max(0, speed - 1.5) / 14) : 0;
    if (surf !== this._surf && P) {
      this._surf = surf;
      this.surfFilter.type = P.type; this.surfFilter.Q.setTargetAtTime(P.q, t, 0.05);
      this.surfLfo.frequency.setTargetAtTime(P.lfo, t, 0.1);
      this.surfLfoDepth.gain.setTargetAtTime(P.depth, t, 0.1);
    }
    if (P) this.surfFilter.frequency.setTargetAtTime(P.f + speed * P.fs, t, 0.08);
    this.surfGain.gain.setTargetAtTime(P ? P.vol * Math.pow(k, 0.8) : 0, t, k > 0 ? 0.12 : 0.25); // sube y baja despacio: nada de chasquidos
  }

  // AUD-13: carga las muestras de motor y sustituye las voces sintetizadas (si falla, se queda el motor sintetizado)
  // AUD-15: sustituye el chirrido sintetizado por la grabación real en cuanto se descarga
  _loadSkid() {
    const ctx = this.ctx;
    fetch(skidUrl).then((r) => r.arrayBuffer()).then((ab) => new Promise((ok, ko) => ctx.decodeAudioData(ab, ok, ko))).then((rec) => {
      const src = rec.getChannelData(0), X = Math.floor(rec.sampleRate * 0.15), L = src.length - X;
      const buf = ctx.createBuffer(1, L, rec.sampleRate), d = buf.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < L; i++) { d[i] = i < X ? src[i] * (i / X) + src[L + i] * (1 - i / X) : src[i]; peak = Math.max(peak, Math.abs(d[i])); } // fundido: bucle sin costura
      for (let i = 0; i < L; i++) d[i] /= peak;
      const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true;
      n.playbackRate.value = this.skidSrc.playbackRate.value;
      n.connect(this.skidFilter);
      n.start(0, Math.random() * buf.duration);
      const old = this.skidSrc; this.skidSrc = n;
      try { old.stop(); old.disconnect(); } catch { /* nada */ }
      this.skidFilter.frequency.value = 250; // la grabación ya trae su timbre: solo se quita el retumbe grave
      this.skidReal = true;
    }).catch((e) => console.warn('Chirrido grabado no disponible; se usa el sintetizado', e));
  }

  _loadBank() {
    if (this._bankLoading) return;
    this._bankLoading = true;
    loadEngineBank(this.ctx).then((bank) => {
      this.bank = bank;
      const old = [this.engine, ...this.rivalVoices];
      this.engine = new SampleVoice(this.ctx, this.master, bank);
      if (this.carDef) this.engine.setCar(this.carDef);
      this.rivalVoices = [0, 1, 2].map(() => new SampleVoice(this.ctx, this.master, bank, { pan: true }));
      for (const v of old) v.dispose();
    }).catch((e) => console.warn('Motores con muestras no disponibles; se usa el sintetizado', e));
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('reback.muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  // 'electric': zumbido de motor eléctrico RC · 'nitro': motor de explosión pequeño, rasposo y con petardeos
  setEngine(type, def) {
    this.engineType = type; this.enginePitch = carPitch(def); this.rpm = 0; this.carDef = def;
    if (this.engine) this.engine.setCar(def);
  }

  // speed en m/s · throttle -1…1 · slip: deslizamiento · opts.max: velocidad punta · opts.air: en el aire
  update(speed, throttle, slip, { max = 30, air = false, screech = true } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dt = Math.min(0.1, Math.max(0.001, t - (this._t || t)));
    this._t = t;
    const nitro = this.engineType === 'nitro';
    const thr = Math.min(1, Math.abs(throttle || 0));
    const spd = Math.min(1.15, speed / Math.max(5, max));
    // vueltas: siguen a la velocidad; con gas suben algo más; en el aire o patinando se disparan
    let target = spd * 0.88 + thr * 0.14;
    if ((air || slip > 6) && thr > 0.3) target = Math.max(target, 0.75 + thr * 0.3);
    if (nitro) target = Math.max(target, 0.04 + Math.sin(t * 7.3) * 0.015 + Math.random() * 0.01);
    const rate = target > this.rpm ? (nitro ? 5 : 8) : (nitro ? 2.6 : 4);
    this.rpm += (target - this.rpm) * Math.min(1, rate * dt);
    const rpm = Math.min(1.2, this.rpm);
    const vol = nitro ? 0.06 + thr * 0.05 + rpm * 0.05 : (0.015 + thr * 0.06 + rpm * 0.07) * Math.min(1, rpm * 6 + thr);
    this.engine.set(rpm, thr, vol);
    // petardeo al soltar el gas con el nitro revolucionado
    this._popCool -= dt;
    if (nitro && this._lastThr > 0.6 && thr < 0.2 && rpm > 0.45 && this._popCool <= 0) {
      this._popCool = 0.8;
      const pops = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < pops; k++) {
        const dl = 0.05 + k * (0.07 + Math.random() * 0.06);
        this.noise(0.06, { vol: 0.35, freq: 700 + Math.random() * 500, type: 'lowpass', delay: dl });
        this.tone(60 + Math.random() * 30, 0.07, { type: 'square', vol: 0.12, slide: 0.5, delay: dl });
      }
    }
    this._lastThr = thr;
    // chirrido: entra a partir de un poco de deslizamiento y crece con él; calla en agua, tierra, aceite… y en el aire
    const sq = screech && !air && speed > 2 ? Math.min(1, Math.max(0, slip - 1) / 9) : 0;
    this.skidGain.gain.setTargetAtTime((this.skidReal ? 0.42 : 0.32) * Math.pow(sq, 0.7), t, sq > 0 ? 0.04 : 0.09);
    this.skidSrc.playbackRate.setTargetAtTime((this.skidReal ? 0.92 + sq * 0.12 : 0.88 + sq * 0.18) + Math.min(0.06, speed / 400), t, 0.1);
  }

  hit(strength) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400 + strength * 1500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25 + strength * 0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18 + strength * 0.2);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random()); s.stop(t + 0.5);
  }

  // ---------- Efectos de un disparo ----------
  tone(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, { vol = 0.4, freq = 1000, q = 1, type = 'lowpass', slideTo = 0, delay = 0, attack = 0 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    if (attack > 0) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); } // ataque suave: sin chasquido al empezar
    else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // burbuja de agua/barro: seno que sube de tono rápido y se apaga
  bubble(freq, dur, vol, delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.9, t + dur * 0.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  play(name, vol = 1) {
    if (!this.ctx || vol < 0.03) return;
    const v = vol;
    switch (name) {
      case 'count': this.tone(440, 0.25, { type: 'square', vol: 0.18 * v }); break;
      case 'go': this.tone(880, 0.6, { type: 'square', vol: 0.2 * v }); break;
      case 'lap': [660, 880, 1100].forEach((f, i) => this.tone(f, 0.15, { vol: 0.12 * v, delay: i * 0.09 })); break;
      case 'finish': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.2 * v, delay: i * 0.12 })); break;
      case 'pickup': this.tone(700, 0.12, { type: 'triangle', vol: 0.2 * v, slide: 2 }); this.tone(1400, 0.1, { type: 'triangle', vol: 0.12 * v, delay: 0.08 }); break;
      case 'turbo': this.noise(0.9, { vol: 0.5 * v, freq: 400, slideTo: 3000, type: 'bandpass', q: 1.5 }); this.tone(120, 0.8, { type: 'sawtooth', vol: 0.12 * v, slide: 3 }); break;
      case 'rocket': this.noise(1.2, { vol: 0.45 * v, freq: 2500, slideTo: 600, type: 'bandpass', q: 0.8 }); break;
      case 'throw': this.tone(300, 0.25, { type: 'sine', vol: 0.25 * v, slide: 2.5 }); break;
      case 'splash': { // entrar en agua: golpe grave, cuerpo de agua, rocío y burbujas
        this.tone(150, 0.16, { type: 'sine', vol: 0.22 * v, slide: 0.4 });
        this.noise(0.6, { vol: 0.42 * v, freq: 1500, slideTo: 260, type: 'lowpass', q: 0.8, attack: 0.02 });
        this.noise(0.4, { vol: 0.11 * v, freq: 5000, slideTo: 2600, type: 'highpass', q: 0.5, attack: 0.012, delay: 0.02 });
        for (let k = 0; k < 6; k++) this.bubble(250 + Math.random() * 650, 0.06 + Math.random() * 0.07, (0.05 + Math.random() * 0.07) * v, 0.05 + Math.random() * 0.5);
        break;
      }
      case 'mud': { // entrar en barro: chof pegajoso y burbujas graves
        this.tone(95, 0.22, { type: 'sine', vol: 0.3 * v, slide: 0.5 });
        this.noise(0.5, { vol: 0.5 * v, freq: 800, slideTo: 170, type: 'lowpass', q: 0.9, attack: 0.025 });
        for (let k = 0; k < 3; k++) this.bubble(110 + Math.random() * 140, 0.09 + Math.random() * 0.08, (0.06 + Math.random() * 0.05) * v, 0.1 + Math.random() * 0.35);
        break;
      }
      case 'sand': // entrar en arena: roce suave y golpe sordo
        this.noise(0.4, { vol: 0.3 * v, freq: 3200, slideTo: 1400, type: 'bandpass', q: 0.5, attack: 0.04 });
        this.noise(0.14, { vol: 0.2 * v, freq: 700, type: 'lowpass', attack: 0.012 });
        break;
      case 'oil': this.tone(180, 0.35, { type: 'sine', vol: 0.3 * v, slide: 0.4 }); break;
      case 'slip': this.tone(900, 0.4, { type: 'triangle', vol: 0.12 * v, slide: 0.5 }); break;
      case 'fuse': this.noise(0.5, { vol: 0.2 * v, freq: 5000, type: 'highpass' }); break;
      case 'beep': this.tone(1300, 0.06, { type: 'square', vol: 0.12 * v }); break;
      case 'pass': this.tone(500, 0.1, { vol: 0.18 * v }); this.tone(750, 0.12, { vol: 0.18 * v, delay: 0.1 }); break;
      case 'boom':
        this.noise(1.4, { vol: 0.9 * v, freq: 1200, slideTo: 60, type: 'lowpass' });
        this.tone(90, 0.8, { type: 'sine', vol: 0.5 * v, slide: 0.4 });
        break;
      case 'click': this.tone(1000, 0.05, { type: 'triangle', vol: 0.12 }); break;
      case 'zap':
        for (let k = 0; k < 6; k++) this.tone(180 + Math.random() * 120, 0.06, { type: 'square', vol: 0.12 * v, delay: k * 0.05 });
        this.noise(0.35, { vol: 0.25 * v, freq: 4000, type: 'bandpass', q: 4 });
        break;
      case 'ballshot': this.tone(90, 0.5, { type: 'sine', vol: 0.4 * v, slide: 0.6 }); this.noise(0.4, { vol: 0.3 * v, freq: 300, type: 'lowpass' }); break;
      case 'star': [988, 1319, 1568, 1976, 2637].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.16 * v, delay: i * 0.07 })); this.noise(0.8, { vol: 0.12 * v, freq: 7000, type: 'highpass' }); break;
      case 'cup': [523, 659, 784, 1046, 1046, 1175, 1319, 1568].forEach((f, i) => this.tone(f, i > 5 ? 0.5 : 0.2, { type: 'triangle', vol: 0.2 * v, delay: i * 0.13 })); break;
      case 'wrong': this.tone(220, 0.3, { type: 'square', vol: 0.12 * v }); break;
    }
  }

  stopEngine() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engine.silence();
    this.skidGain.gain.setTargetAtTime(0, t, 0.05);
    this.surfGain?.gain.setTargetAtTime(0, t, 0.05);
    for (const v of this.rivalVoices) v.silence();
  }

  // ---------- Motores de los 3 rivales más cercanos (volumen, panorama y efecto Doppler) ----------
  updateRivals(race) {
    if (!this.ctx || !this.rivalVoices) return;
    const t = this.ctx.currentTime, P = race.player, cam = race.camera;
    if (race.paused || this.muted) { for (const v of this.rivalVoices) v.silence(); return; }
    if (this._rivT && t - this._rivT < 0.05) return;
    this._rivT = t;
    const near = race.cars.filter((c) => c !== P).map((c) => [c, c.currPos.distanceToSquared(P.currPos)]).sort((a, b) => a[1] - b[1]).slice(0, 3);
    const e0 = cam.matrixWorld.elements, camRight = { x: e0[0], z: e0[2] }; // eje X de la cámara
    const lv = P.velocity || { x: 0, z: 0 };
    this.rivalVoices.forEach((v, i) => {
      const e = near[i];
      if (!e) { v.silence(0.1); return; }
      const [c, d2] = e, d = Math.sqrt(d2) || 1;
      v.setCar(c.def, i);
      const sp = c.speed || 0, max = (c.t && c.t.maxSpeed) || 30;
      const rpm = Math.min(1.1, sp / max * 0.88 + Math.abs(c.throttle || 0) * 0.14);
      // Doppler: velocidad relativa en la línea que une al jugador con el rival
      const dx = c.currPos.x - P.currPos.x, dz = c.currPos.z - P.currPos.z;
      const cv = c.velocity || { x: 0, z: 0 };
      const vr = ((cv.x - lv.x) * dx + (cv.z - lv.z) * dz) / d; // >0 se aleja
      const dop = Math.max(0.8, Math.min(1.25, 1 / (1 + vr / 160)));
      const vol = Math.pow(Math.max(0, 1 - d / 50), 2) * (0.05 + rpm * 0.06) * (i === 0 ? 1 : 0.75);
      v.set(rpm, Math.abs(c.throttle || 0), vol, { dop, tc: 0.08 });
      if (v.pan) {
        const cx = c.currPos.x - cam.position.x, cz = c.currPos.z - cam.position.z, l = Math.hypot(cx, cz) || 1;
        v.pan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, (cx * camRight.x + cz * camRight.z) / l)), t, 0.1);
      }
    });
  }

  // ---------- Ambiente de cada circuito (sintetizado) ----------
  startAmbient(kind) {
    if (!this.ctx) return;
    this.stopAmbient();
    const ctx = this.ctx;
    const out = (this.ambGain = ctx.createGain());
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
    out.connect(this.master);
    const nodes = (this.ambNodes = []);
    const loopNoise = (type, freq, q, vol) => {
      const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = vol;
      n.connect(f).connect(g).connect(out); n.start(0, Math.random());
      nodes.push(n);
      return { f, g };
    };
    const hum = (freq, vol) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
      const g = ctx.createGain(); g.gain.value = vol;
      o.connect(g).connect(out); o.start(); nodes.push(o);
      return g;
    };
    const ev = (fn, min, max) => {
      const loop = () => { fn(); this.ambTimers.push(setTimeout(loop, (min + Math.random() * (max - min)) * 1000)); };
      this.ambTimers.push(setTimeout(loop, min * 500));
    };
    const blip = (freq, dur, { type = 'sine', vol = 0.05, slide = 0, delay = 0 } = {}) => {
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
    };
    const click = (freq, vol) => {
      const t = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 6;
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      s.connect(f).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + 0.08);
    };
    this.ambTimers = [];
    if (kind === 'salon') {
      loopNoise('lowpass', 220, 0.5, 0.05); // rumor de casa
      let tic = 0;
      this.ambTimers.push(setInterval(() => click((tic++ % 2) ? 2600 : 3300, 0.16), 1000)); // reloj de pared
      ev(() => blip(523, 0.5, { type: 'triangle', vol: 0.012, delay: 0 }), 20, 40); // algo suena en la cocina
    } else if (kind === 'super') {
      hum(50, 0.03); hum(100, 0.02); hum(150, 0.008); // neveras
      loopNoise('bandpass', 5200, 8, 0.006); // fluorescentes
      ev(() => [784, 659, 523].forEach((f, i) => blip(f, 0.7, { type: 'sine', vol: 0.05, delay: i * 0.35 })), 18, 34); // megafonía
      ev(() => { for (let k = 0; k < 3; k++) click(1800 + Math.random() * 600, 0.04); }, 6, 14); // carritos lejanos
    } else if (kind === 'museo') {
      loopNoise('lowpass', 160, 0.5, 0.04); // sala grande y vacía
      hum(60, 0.012);
      ev(() => { for (let k = 0; k < 2; k++) click(900 + Math.random() * 200, 0.08); }, 5, 11); // pasos del vigilante a lo lejos
      ev(() => blip(196, 1.6, { type: 'triangle', vol: 0.02, slide: 0.98 }), 16, 30); // eco misterioso
    } else if (kind === 'muelle') {
      const w = loopNoise('lowpass', 420, 0.4, 0.07); // olas
      this.ambTimers.push(setInterval(() => { const t = ctx.currentTime; w.g.gain.setTargetAtTime(0.03 + Math.random() * 0.07, t, 1.2); }, 2200));
      ev(() => { const b = 1500 + Math.random() * 500; blip(b, 0.25, { type: 'sawtooth', vol: 0.02, slide: 0.7 }); blip(b * 0.9, 0.3, { type: 'sawtooth', vol: 0.018, slide: 0.65, delay: 0.3 }); }, 4, 10); // gaviotas
      ev(() => { for (let k = 0; k < 3; k++) click(300 + Math.random() * 100, 0.05); }, 8, 16); // madera crujiendo
    } else if (kind === 'parque') {
      loopNoise('bandpass', 600, 0.6, 0.025); // brisa
      ev(() => { const n = 2 + Math.floor(Math.random() * 3); for (let k = 0; k < n; k++) blip(700 + Math.random() * 500, 0.18, { type: 'triangle', vol: 0.012, slide: 1.2, delay: k * 0.2 }); }, 5, 12); // niños jugando a lo lejos
      ev(() => { blip(420, 0.5, { type: 'sine', vol: 0.012, slide: 0.8 }); }, 7, 13); // columpio que chirría
      ev(() => { const base = 2600 + Math.random() * 1800; for (let k = 0; k < 3; k++) blip(base, 0.08, { vol: 0.025, slide: 1.4, delay: k * 0.12 }); }, 3, 8); // pájaros
    } else {
      const w = loopNoise('bandpass', 500, 0.6, 0.05); // viento
      this.ambTimers.push(setInterval(() => {
        const t = ctx.currentTime;
        w.f.frequency.setTargetAtTime(300 + Math.random() * 700, t, 1.5);
        w.g.gain.setTargetAtTime(0.025 + Math.random() * 0.05, t, 1.5);
      }, 2500));
      ev(() => { // pájaros
        const base = 2400 + Math.random() * 2200, n = 2 + Math.floor(Math.random() * 4);
        for (let k = 0; k < n; k++) blip(base * (0.9 + Math.random() * 0.25), 0.09, { vol: 0.03, slide: 1.3 + Math.random() * 0.4, delay: k * 0.13 });
      }, 2, 6);
    }
  }

  stopAmbient() {
    for (const t of this.ambTimers || []) { clearTimeout(t); clearInterval(t); }
    this.ambTimers = [];
    for (const n of this.ambNodes || []) { try { n.stop(); } catch { /* ya parado */ } }
    this.ambNodes = [];
    if (this.ambGain) { this.ambGain.disconnect(); this.ambGain = null; }
  }

  duckAmbient(on) { if (this.ambGain) this.ambGain.gain.setTargetAtTime(on ? 0.25 : 1, this.ctx.currentTime, 0.2); }

  // ---------- Música procedimental ----------
  setMusic(on) {
    this.musicOn = on;
    localStorage.setItem('reback.music', on ? '1' : '0');
    if (this.musicGain) this.musicGain.gain.value = on ? 0.16 : 0;
  }

  // mode: 'menu' | 'race'; theme: id del circuito (o 'batalla') → canción propia (AUD-09)
  startMusic(mode = 'race', theme = null) {
    if (!this.ctx) return;
    if (!this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicOn ? 0.16 : 0;
      this.musicGain.connect(this.master);
    }
    const key = mode === 'menu' ? 'menu' : (SONGS[theme] ? theme : 'salon');
    const changed = key !== this.songKey;
    this.musicMode = mode; this.songKey = key; this.song = SONGS[key];
    if (this.musicTimer && !changed) return;
    this.step16 = 0;
    this.nextNote = Math.max(this.nextNote || 0, this.ctx.currentTime + 0.1);
    if (!this.musicTimer) this.musicTimer = setInterval(() => this.schedule(), 50);
  }

  stopMusic() { clearInterval(this.musicTimer); this.musicTimer = null; this.songKey = null; }

  // Estructura: 2 compases de entrada, 8 de estrofa, 8 de estribillo (melodía), y a repetir;
  // cada 3.ª vuelta, 2 compases de respiro sin bombo antes del estribillo.
  schedule() {
    const ctx = this.ctx, S = this.song;
    const dur16 = 60 / S.tempo / 4;
    while (this.nextNote < ctx.currentTime + 0.2) {
      const step = this.step16, s = step % 16, barAbs = Math.floor(step / 16);
      const intro = barAbs < 2;
      const b = intro ? 0 : (barAbs - 2) % 16, chorus = !intro && b >= 8, cycle = Math.floor((barAbs - 2) / 16);
      const breakdown = !intro && cycle % 3 === 2 && (b === 6 || b === 7);
      const prog = chorus ? S.chorus || S.prog : S.prog;
      const chord = prog[b % prog.length];
      const swing = s % 2 === 1 ? dur16 * (S.swing || 0) : 0;
      const t = this.nextNote + swing;
      const n = (semi, oct) => S.root * Math.pow(2, semi / 12 + oct);
      const on = (pat) => pat && pat[s] === 'x';
      // batería
      if (!breakdown && !intro && on(chorus && S.kick2 ? S.kick2 : S.kick)) this.mkick(t);
      if (!breakdown && on(S.snare) && !intro) this.msnare(t, S.snareVol ?? 0.5);
      if (on(chorus && S.hat2 ? S.hat2 : S.hat)) this.mhat(t, intro ? 0.08 : 0.13, 7000);
      if (chorus && S.clap && on(S.clap)) this.msnare(t, 0.25, 1800);
      // bajo
      if (!intro && on(S.bass)) {
        const oct = S.bassOct && S.bassOct[s] === 'o' ? 1 : 0;
        this.mnote(n(chord[0], oct), dur16 * (S.bassLen || 1.6), S.bassWave || 'sawtooth', 0.48, t, S.bassCut || 650);
      }
      // acordes o arpegio
      if (S.stab && on(S.stab)) for (const c of chord) this.mnote(n(c + 12, 0), dur16 * (S.stabLen || 1.2), S.stabWave || 'square', 0.06, t, 2200);
      if (S.arp && (!chorus || S.arpInChorus) && (S.arpEvery ? s % S.arpEvery === 0 : true)) {
        const semi = chord[s % 3] + (s % 6 < 3 ? 12 : 24);
        this.mnote(n(semi, 0), dur16 * 0.9, S.arpWave || 'square', intro ? 0.08 : 0.13, t, S.arpCut || 2600);
      }
      // melodía del estribillo (y un eco suave en la estrofa)
      const mel = S.lead && S.lead[b % S.lead.length];
      if (mel && (chorus || (S.leadVerse && !intro))) {
        const tok = mel[s];
        if (tok !== null && tok !== undefined) {
          const len = (mel[s + 1] === undefined || mel[s + 1] === null ? 1.7 : 0.95) * dur16 * (S.leadLen || 1);
          this.mnote(n(tok + 24, 0), len, S.leadWave || 'square', chorus ? 0.17 : 0.07, t, chorus ? 3600 : 1800);
          if (S.leadHarm && chorus) this.mnote(n(tok + 24 + S.leadHarm, 0), len, 'triangle', 0.08, t, 3000);
        }
      }
      this.nextNote += dur16;
      this.step16++;
    }
  }

  msnare(t, vol = 0.5, freq = 1200) {
    const sN = this.ctx.createBufferSource(); sN.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    sN.connect(f).connect(g).connect(this.musicGain); sN.start(t, Math.random()); sN.stop(t + 0.18);
    const o = this.ctx.createOscillator(), g2 = this.ctx.createGain();
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    g2.gain.setValueAtTime(vol * 0.5, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g2).connect(this.musicGain); o.start(t); o.stop(t + 0.12);
  }

  mnote(freq, dur, type, vol, t, cutoff) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = type; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f).connect(g).connect(this.musicGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  mkick(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(this.musicGain); o.start(t); o.stop(t + 0.2);
  }

  mhat(t, vol, freq) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = freq > 3000 ? 'highpass' : 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    s.connect(f).connect(g).connect(this.musicGain); s.start(t, Math.random()); s.stop(t + 0.08);
  }
}

// ---------- Canciones (AUD-09). Patrones de 16 pasos: 'x' suena, '.' calla. Melodía: semitonos sobre la tónica, null = silencio ----------
const _ = null;
const mel = (str) => str.trim().split(/\s+/).map((v) => (v === '.' ? null : +v));
const SONGS = {
  // menú: tranquilo, la menor
  menu: { tempo: 104, root: 110, prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]],
    kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', bass: 'x.....x.x.......', snareVol: 0.25,
    arp: true, arpEvery: 2, arpWave: 'triangle',
    lead: [mel('7 . . . 5 . 3 . . . 0 . . . . .'), mel('. . . . 3 . 5 . 7 . . . . . . .'), mel('10 . . . 7 . 5 . . . 3 . . . . .'), mel('5 . . . 2 . 0 . . . . . . . . .')] },
  // salón: funk alegre de casa, re mayor
  salon: { tempo: 124, root: 73.42, swing: 0.12, prog: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]], chorus: [[5, 9, 12], [7, 11, 14], [4, 7, 11], [-3, 0, 4]],
    kick: 'x..x..x...x..x..', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hat2: 'xxx.xxx.xxx.xxx.', clap: '....x..x....x...',
    bass: 'x..x..x.x.x..x.x', bassOct: '.......o.....o..', bassWave: 'square', bassCut: 900, stab: '..x...x...x...x.', stabLen: 0.6,
    lead: [mel('12 . 14 . 16 . . 14 . 12 . . 9 . . .'), mel('9 . 12 . 14 . . 12 . 9 . 7 . . . .'), mel('16 . 19 . 16 . 14 . 12 . 14 . 16 . . .'), mel('14 . 12 . 9 . . . 12 . . . . . . .')], leadHarm: -5 },
  // supermercado: disco de hilo musical, fa mayor
  super: { tempo: 126, root: 87.31, prog: [[0, 4, 7], [-1, 2, 7], [-3, 0, 4], [5, 9, 12]], chorus: [[5, 9, 12], [0, 4, 7], [7, 11, 14], [7, 11, 14]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hat2: 'x.xxx.xxx.xxx.xx', clap: '....x.......x...',
    bass: 'x.x.x.x.x.x.x.x.', bassOct: '..o...o...o...o.', bassLen: 0.9, arp: true, arpWave: 'sawtooth', arpCut: 1800,
    lead: [mel('12 . . 11 12 . 16 . . . 14 . 12 . . .'), mel('9 . . 7 9 . 12 . . . 11 . 9 . . .'), mel('12 . 14 . 16 . 17 . 19 . 17 . 16 . 14 .'), mel('12 . . . . . 7 . . . . . . . . .')], leadWave: 'sawtooth', leadHarm: 4 },
  // jardín: soleado con guitarreo a contratiempo, sol mayor
  jardin: { tempo: 140, root: 98, prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]], chorus: [[-3, 0, 4], [5, 9, 12], [0, 4, 7], [7, 11, 14]],
    kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'x...x.x.x...x.x.', bassWave: 'triangle', bassCut: 1200,
    stab: '..x...x...x...x.', stabLen: 0.5, stabWave: 'sawtooth',
    lead: [mel('7 . 9 . 11 . 12 . . . 11 . 9 . 7 .'), mel('4 . . . 7 . . . 9 . . . . . . .'), mel('12 . 11 . 9 . 7 . 9 . 11 . 12 . . .'), mel('14 . . . 12 . . . 11 . . . . . . .')], leadWave: 'triangle', leadVerse: true, leadHarm: -3 },
  // museo de noche: misterio con ritmo rápido, mi menor
  museo: { tempo: 148, root: 82.41, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], chorus: [[0, 3, 7], [3, 7, 10], [-2, 2, 5], [-1, 3, 6]],
    kick: 'x.........x.....', kick2: 'x.....x...x.....', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', bass: 'x..x..x...x..x..', bassWave: 'sawtooth', bassCut: 500,
    arp: true, arpWave: 'triangle', arpInChorus: true, arpCut: 2000,
    lead: [mel('12 . . . 15 . . . 14 . 12 . 11 . . .'), mel('12 . . . 7 . . . . . . . . . . .'), mel('15 . 17 . 19 . . . 17 . 15 . 14 . . .'), mel('15 . . . 14 . . . 11 . . . . . . .')], leadWave: 'sawtooth', leadLen: 1.4 },
  // muelle: atardecer marinero, la dórico
  muelle: { tempo: 116, root: 110, swing: 0.18, prog: [[0, 3, 7], [5, 9, 12], [0, 3, 7], [-2, 2, 5]], chorus: [[3, 7, 10], [-2, 2, 5], [0, 3, 7], [5, 9, 12]],
    kick: 'x.......x.....x.', snare: '....x.......x...', hat: 'x..x..x.x..x..x.', bass: 'x.....x.x.....x.', bassWave: 'triangle', bassCut: 900,
    stab: 'x.....x.....x...', stabWave: 'triangle', stabLen: 2,
    lead: [mel('7 . . 9 10 . 12 . . . 10 . 9 . 7 .'), mel('5 . . . 7 . . . 9 . . . . . . .'), mel('12 . . 10 9 . 7 . . . 9 . 10 . . .'), mel('7 . . . . . 0 . . . . . . . . .')], leadWave: 'triangle', leadVerse: true, leadHarm: -5 },
  // parque infantil: chiptune saltarín, do mayor
  parque: { tempo: 152, root: 130.81, prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], chorus: [[5, 9, 12], [7, 11, 14], [0, 4, 7], [-3, 0, 4]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', bass: 'x.x.x.x.x.x.x.x.', bassOct: '.o.o.o.o.o.o.o.o', bassWave: 'square', bassLen: 0.8, bassCut: 1400,
    arp: true, arpWave: 'square', arpEvery: 1,
    lead: [mel('12 . 12 . 16 . 19 . 16 . 12 . 14 . . .'), mel('11 . 11 . 14 . 17 . 14 . 11 . 12 . . .'), mel('17 . 16 . 14 . 12 . 14 . 16 . 17 . 19 .'), mel('16 . . . 12 . . . 7 . . . . . . .')], leadWave: 'square', leadHarm: -12 },
  // batalla: tenso y rápido, do menor
  batalla: { tempo: 160, root: 65.41, prog: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]], chorus: [[3, 7, 10], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]],
    kick: 'x...x...x...x...', kick2: 'x.x.x...x.x.x..x', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', bass: 'xx.xx.xx.xx.xx.x', bassWave: 'sawtooth', bassLen: 0.7, bassCut: 700,
    stab: 'x.....x.....x...', stabWave: 'sawtooth',
    lead: [mel('12 . 15 . 19 . 15 . 12 . 15 . 19 . 22 .'), mel('20 . 19 . 15 . . . 12 . . . . . . .'), mel('22 . 20 . 19 . 17 . 15 . 17 . 19 . . .'), mel('17 . . . 15 . . . 14 . . . . . . .')], leadWave: 'sawtooth' },
};
