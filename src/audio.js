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

    // motor: dos osciladores + filtro
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass'; this.engFilter.frequency.value = 900; this.engFilter.Q.value = 4;
    this.engGain = ctx.createGain(); this.engGain.gain.value = 0;
    this.osc1 = ctx.createOscillator(); this.osc1.type = 'sawtooth';
    this.osc2 = ctx.createOscillator(); this.osc2.type = 'square';
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    this.osc1.connect(this.engFilter); this.osc2.connect(g2).connect(this.engFilter);
    this.engFilter.connect(this.engGain).connect(this.master);
    this.osc1.start(); this.osc2.start();

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

  update(speed, throttle, slip) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 70 + speed * 9 + throttle * 30;
    this.osc1.frequency.setTargetAtTime(f, t, 0.05);
    this.osc2.frequency.setTargetAtTime(f * 1.5, t, 0.05);
    this.engFilter.frequency.setTargetAtTime(500 + speed * 40 + throttle * 600, t, 0.05);
    this.engGain.gain.setTargetAtTime(0.05 + throttle * 0.1 + Math.min(speed, 40) * 0.002, t, 0.08);
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
      case 'wrong': this.tone(220, 0.3, { type: 'square', vol: 0.12 * v }); break;
    }
  }

  stopEngine() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engGain.gain.setTargetAtTime(0, t, 0.05);
    this.skidGain.gain.setTargetAtTime(0, t, 0.05);
  }

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
