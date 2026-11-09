// Sonido sintetizado: zumbido del motor eléctrico RC, chirrido de derrape y golpes.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('reback.muted') === '1';
    this.musicOn = localStorage.getItem('reback.music') !== '0';
  }

  start() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(ctx.destination);

    // motor: dos osciladores + filtro + saturación + vibración (eléctrico o nitro)
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass'; this.engFilter.frequency.value = 900; this.engFilter.Q.value = 4;
    this.engShaper = ctx.createWaveShaper();
    this.engAM = ctx.createGain(); this.engAM.gain.value = 0.85;
    this.engGain = ctx.createGain(); this.engGain.gain.value = 0;
    this.osc1 = ctx.createOscillator(); this.osc1.type = 'sawtooth';
    this.osc2 = ctx.createOscillator(); this.osc2.type = 'square';
    this.osc2Gain = ctx.createGain(); this.osc2Gain.gain.value = 0.35;
    this.lfo = ctx.createOscillator(); this.lfo.type = 'square'; this.lfo.frequency.value = 30;
    this.lfoDepth = ctx.createGain(); this.lfoDepth.gain.value = 0.04;
    this.lfo.connect(this.lfoDepth).connect(this.engAM.gain);
    this.osc1.connect(this.engFilter); this.osc2.connect(this.osc2Gain).connect(this.engFilter);
    this.engFilter.connect(this.engShaper).connect(this.engAM).connect(this.engGain).connect(this.master);
    this.osc1.start(); this.osc2.start(); this.lfo.start();
    this.setEngine(this.engineType || 'electric');

    // dos voces para los motores de los rivales más cercanos
    this.rivalVoices = [0, 1].map(() => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 3;
      const g = ctx.createGain(); g.gain.value = 0;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      o.connect(f).connect(g);
      if (pan) g.connect(pan).connect(this.master); else g.connect(this.master);
      o.start();
      return { o, f, g, pan, car: null };
    });

    // ruido para derrapes y golpes
    const len = ctx.sampleRate * 1.5;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true;
    this.skidFilter = ctx.createBiquadFilter(); this.skidFilter.type = 'bandpass'; this.skidFilter.frequency.value = 1800; this.skidFilter.Q.value = 3;
    this.skidGain = ctx.createGain(); this.skidGain.gain.value = 0;
    n.connect(this.skidFilter).connect(this.skidGain).connect(this.master);
    n.start();
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('reback.muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  // 'electric': zumbido limpio que sube con la velocidad · 'nitro': motor de explosión pequeño, grave y rasposo
  setEngine(type) {
    this.engineType = type;
    if (!this.ctx) return;
    const nitro = type === 'nitro';
    this.osc1.type = nitro ? 'square' : 'sawtooth';
    this.osc2.type = nitro ? 'sawtooth' : 'square';
    this.osc2Gain.gain.value = nitro ? 0.6 : 0.35;
    this.lfoDepth.gain.value = nitro ? 0.4 : 0.04;
    const n = 256, curve = new Float32Array(n), k = nitro ? 6 : 0;
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = k ? Math.tanh(x * k) / Math.tanh(k) : x; }
    this.engShaper.curve = curve;
  }

  update(speed, throttle, slip) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.engineType === 'nitro') {
      const f = 38 + speed * 5.2 + throttle * 22;
      this.osc1.frequency.setTargetAtTime(f, t, 0.06);
      this.osc2.frequency.setTargetAtTime(f * 2.01, t, 0.06);
      this.lfo.frequency.setTargetAtTime(f * 0.5, t, 0.06);
      this.engFilter.frequency.setTargetAtTime(380 + speed * 34 + throttle * 700, t, 0.05);
      this.engGain.gain.setTargetAtTime(0.05 + throttle * 0.08 + Math.min(speed, 40) * 0.0018, t, 0.08);
    } else {
      const f = 70 + speed * 9 + throttle * 30;
      this.osc1.frequency.setTargetAtTime(f, t, 0.05);
      this.osc2.frequency.setTargetAtTime(f * 1.5, t, 0.05);
      this.lfo.frequency.setTargetAtTime(17, t, 0.1);
      this.engFilter.frequency.setTargetAtTime(500 + speed * 40 + throttle * 600, t, 0.05);
      this.engGain.gain.setTargetAtTime(0.05 + throttle * 0.1 + Math.min(speed, 40) * 0.002, t, 0.08);
    }
    this.skidGain.gain.setTargetAtTime(Math.min(0.25, slip * 0.035), t, 0.05);
    this.skidFilter.frequency.setTargetAtTime(1400 + slip * 60, t, 0.1);
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

  noise(dur, { vol = 0.4, freq = 1000, q = 1, type = 'lowpass', slideTo = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
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
      case 'splash': this.noise(0.6, { vol: 0.6 * v, freq: 3000, slideTo: 400, type: 'bandpass', q: 0.7 }); break;
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
    this.engGain.gain.setTargetAtTime(0, t, 0.05);
    this.skidGain.gain.setTargetAtTime(0, t, 0.05);
    for (const v of this.rivalVoices) v.g.gain.setTargetAtTime(0, t, 0.05);
  }

  // ---------- Motores de los 2 rivales más cercanos (volumen y panorama según la posición) ----------
  updateRivals(race) {
    if (!this.ctx || !this.rivalVoices) return;
    const t = this.ctx.currentTime, P = race.player, cam = race.camera;
    if (race.paused || this.muted) { for (const v of this.rivalVoices) v.g.gain.setTargetAtTime(0, t, 0.05); return; }
    if (!this._rivT || t - this._rivT > 0.1) {
      this._rivT = t;
      const near = race.cars.filter((c) => c !== P).map((c) => [c, c.currPos.distanceToSquared(P.currPos)]).sort((a, b) => a[1] - b[1]).slice(0, 2);
      const e0 = cam.matrixWorld.elements, camRight = { x: e0[0], z: e0[2] }; // eje X de la cámara
      this.rivalVoices.forEach((v, i) => {
        const e = near[i];
        if (!e) { v.g.gain.setTargetAtTime(0, t, 0.1); return; }
        const [c, d2] = e, d = Math.sqrt(d2);
        const nitro = c.def.motor === 'Nitro';
        if (v.nitro !== nitro) { v.nitro = nitro; v.o.type = nitro ? 'square' : 'sawtooth'; }
        const sp = c.speed || 0, f = (nitro ? 40 + sp * 5 : 75 + sp * 8.5) * (1 + i * 0.03);
        v.o.frequency.setTargetAtTime(f, t, 0.08);
        v.f.frequency.setTargetAtTime(350 + sp * 30, t, 0.08);
        const vol = Math.pow(Math.max(0, 1 - d / 45), 2) * (0.035 + Math.min(sp, 35) * 0.0012);
        v.g.gain.setTargetAtTime(vol, t, 0.1);
        if (v.pan) {
          const dx = c.currPos.x - cam.position.x, dz = c.currPos.z - cam.position.z, l = Math.hypot(dx, dz) || 1;
          v.pan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, (dx * camRight.x + dz * camRight.z) / l)), t, 0.1);
        }
      });
    }
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

  startMusic(mode = 'race') {
    if (!this.ctx) return;
    if (!this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicOn ? 0.16 : 0;
      this.musicGain.connect(this.master);
    }
    this.musicMode = mode;
    if (this.musicTimer) return;
    this.step16 = 0;
    this.nextNote = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.schedule(), 50);
  }

  stopMusic() { clearInterval(this.musicTimer); this.musicTimer = null; }

  schedule() {
    const ctx = this.ctx;
    const tempo = this.musicMode === 'menu' ? 104 : 132;
    const dur16 = 60 / tempo / 4;
    // progresión: Am F C G (en semitonos sobre A2=110)
    const prog = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]];
    while (this.nextNote < ctx.currentTime + 0.2) {
      const s = this.step16 % 16, bar = Math.floor(this.step16 / 16) % 4;
      const chord = prog[bar];
      const t = this.nextNote;
      const n = (semi, oct) => 110 * Math.pow(2, semi / 12 + oct);
      // bajo
      if (s % 4 === 0 || s === 14) this.mnote(n(chord[0], 0), dur16 * 1.8, 'sawtooth', 0.5, t, 600);
      // arpegio
      if (this.musicMode !== 'menu' || s % 2 === 0) {
        const semi = chord[s % 3] + (s % 6 < 3 ? 12 : 24);
        this.mnote(n(semi, 0), dur16 * 0.9, 'square', 0.16, t, 2500);
      }
      // batería
      if (s % 4 === 0) this.mkick(t);
      if (s % 8 === 4) this.mhat(t, 0.35, 1500);
      if (s % 2 === 1) this.mhat(t, 0.12, 7000);
      this.nextNote += dur16;
      this.step16++;
    }
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
