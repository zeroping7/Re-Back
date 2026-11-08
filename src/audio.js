// Sonido sintetizado: zumbido del motor eléctrico RC, chirrido de derrape y golpes.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('reback.muted') === '1';
  }

  start() {
    if (this.ctx) return;
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
}
