// Entrada: botones táctiles, inclinación del móvil y teclado.
const KEY_MODE = 'reback.controlMode';
export const MODES = ['buttons', 'bar', 'float', 'tilt']; // UX-31: flechas, barra fija, flotante, inclinar
const KEY_SENS = 'reback.steerSens'; // UX-29: sensibilidad de la dirección (0,6 … 1,5)

export class Controls {
  constructor() {
    this.state = { left: false, right: false, gas: false, brake: false, look: false };
    this.camStick = { x: 0, y: 0 }; // stick derecho del mando (CTL-07)
    this.padLook = false;
    this.keys = new Set();
    this.mode = localStorage.getItem(KEY_MODE) || 'buttons'; // ver MODES
    if (!MODES.includes(this.mode)) this.mode = 'buttons';
    this.tilt = 0; this.tiltZero = null;
    this.sens = +(localStorage.getItem(KEY_SENS) || 1) || 1;
    this.steerSmooth = 0;
    this.slide = 0; this.sliding = false; // UX-31: valor del slider (-1..1, + = izquierda) y si hay dedo encima
    this.override = null; // para pruebas automáticas
    this.onReset = null; this.onCamera = null;
    this.autoGas = false; // acelerar solo (el freno sigue funcionando)
    this.pad = null; // mando: { steer, gas, brake } (src/gamepad.js)

    const bind = (id, k) => {
      const el = document.getElementById(id);
      const on = (e) => { e.preventDefault(); this.state[k] = true; el.classList.add('active'); vibrate(8); };
      const off = (e) => { e.preventDefault(); this.state[k] = false; el.classList.remove('active'); };
      el.addEventListener('pointerdown', (e) => { el.setPointerCapture?.(e.pointerId); on(e); });
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('lostpointercapture', off);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    bind('btn-left', 'left'); bind('btn-right', 'right'); bind('btn-gas', 'gas'); bind('btn-brake', 'brake'); bind('btn-look', 'look');
    this.firePending = false;
    const item = document.getElementById('btn-item');
    item.addEventListener('pointerdown', (e) => { e.preventDefault(); this.firePending = true; vibrate(15); });

    addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyR' && this.onReset) this.onReset();
      if (e.code === 'KeyC' && !e.repeat && this.onCamera) this.onCamera();
      if ((e.code === 'KeyE' || e.code === 'Enter' || e.code === 'ShiftLeft') && !e.repeat) this.firePending = true;
      if ((e.code === 'Escape' || e.code === 'KeyP') && this.onPause) this.onPause();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    addEventListener('deviceorientation', (e) => {
      if (e.beta == null) return;
      const ang = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 90;
      // En horizontal, "beta" es el giro tipo volante
      let v = ang === 270 || ang === -90 ? -e.beta : e.beta;
      if (ang === 0 || ang === 180) v = e.gamma * (ang === 180 ? -1 : 1);
      if (this.tiltZero === null) this.tiltZero = v;
      this.tilt = v - this.tiltZero;
    });

    // UX-31: A · barra fija: la posición del dedo en la barra es el giro (centro = recto)
    const bar = document.getElementById('steer-bar'), knob = bar.querySelector('.sb-knob');
    const KNOB = 32 + 8; // radio del pomo + margen
    const setBar = (v) => { this.slide = v; knob.style.transform = `translateX(${-v * Math.max(1, bar.clientWidth / 2 - KNOB)}px)`; };
    const barAt = (e) => { const r = bar.getBoundingClientRect(), half = Math.max(1, r.width / 2 - KNOB); setBar(Math.max(-1, Math.min(1, -(e.clientX - (r.left + r.width / 2)) / half))); };
    let barId = null;
    bar.addEventListener('pointerdown', (e) => { e.preventDefault(); barId = e.pointerId; bar.setPointerCapture?.(e.pointerId); this.sliding = true; bar.classList.add('active'); barAt(e); vibrate(8); });
    bar.addEventListener('pointermove', (e) => { if (e.pointerId === barId) barAt(e); });
    const barEnd = (e) => { if (e.pointerId !== barId) return; barId = null; this.sliding = false; bar.classList.remove('active'); setBar(0); };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bar.addEventListener(ev, barEnd);
    bar.addEventListener('contextmenu', (e) => e.preventDefault());

    // UX-31: B · flotante: donde se apoya el pulgar es el centro; FLOAT_RANGE px a cada lado = giro completo
    const fl = document.getElementById('steer-float'), org = fl.querySelector('.sf-origin'), fin = fl.querySelector('.sf-finger');
    const FLOAT_RANGE = 80;
    let flId = null, x0 = 0;
    const flPos = (e) => { const r = fl.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    fl.addEventListener('pointerdown', (e) => {
      if (flId !== null) return;
      e.preventDefault(); flId = e.pointerId; fl.setPointerCapture?.(e.pointerId);
      const [x, y] = flPos(e); x0 = x;
      org.style.left = fin.style.left = `${x}px`; org.style.top = fin.style.top = `${y}px`;
      this.slide = 0; this.sliding = true; fl.classList.add('active'); vibrate(8);
    });
    fl.addEventListener('pointermove', (e) => {
      if (e.pointerId !== flId) return;
      const v = Math.max(-1, Math.min(1, (flPos(e)[0] - x0) / FLOAT_RANGE));
      this.slide = -v; fin.style.left = `${x0 + v * FLOAT_RANGE}px`;
    });
    const flEnd = (e) => { if (e.pointerId !== flId) return; flId = null; this.sliding = false; this.slide = 0; fl.classList.remove('active'); };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) fl.addEventListener(ev, flEnd);
    fl.addEventListener('contextmenu', (e) => e.preventDefault());
    this.resetSlider = () => { barId = flId = null; this.sliding = false; bar.classList.remove('active'); fl.classList.remove('active'); setBar(0); };

    const modeBtn = document.getElementById('btn-mode');
    const ICON = { buttons: '◀▶', bar: '🎚', float: '👆', tilt: '📱' };
    const applyMode = () => {
      document.getElementById('steer-pad').classList.toggle('hidden', this.mode !== 'buttons');
      bar.classList.toggle('hidden', this.mode !== 'bar');
      fl.classList.toggle('hidden', this.mode !== 'float');
      modeBtn.textContent = ICON[this.mode] || ICON.buttons;
      this.resetSlider();
    };
    this.applyMode = applyMode;
    modeBtn.addEventListener('click', () => this.setMode(MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]));
    applyMode();
  }

  async setMode(m) {
    if (m === 'tilt') {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
          await DeviceOrientationEvent.requestPermission();
        }
      } catch { /* sin permiso */ }
      this.tiltZero = null;
    }
    this.mode = m;
    localStorage.setItem(KEY_MODE, m);
    this.applyMode();
  }

  // Mirar atrás mientras se mantiene (CTL-06)
  get lookBack() { return this.state.look || this.padLook || this.keys.has('KeyQ'); }

  consumeFire() { const f = this.firePending; this.firePending = false; return f; }

  releaseAll() {
    for (const k in this.state) this.state[k] = false;
    document.querySelectorAll('.pad.active').forEach((el) => el.classList.remove('active'));
    this.keys.clear(); this.firePending = false; this.pad = null; this.padLook = false; this.camStick.x = this.camStick.y = 0;
    this.resetSlider?.();
  }

  setSens(v) {
    this.sens = v;
    try { localStorage.setItem(KEY_SENS, String(v)); } catch { /* sin almacenamiento */ }
  }

  // Devuelve { steer: -1..1 (+ = izquierda), throttle, brake, sens }
  read(dt) {
    if (this.override) return this.override;
    const k = this.keys, s = this.state;
    const left = s.left || k.has('ArrowLeft') || k.has('KeyA');
    const right = s.right || k.has('ArrowRight') || k.has('KeyD');
    const gas = s.gas || k.has('ArrowUp') || k.has('KeyW');
    const brake = s.brake || k.has('ArrowDown') || k.has('KeyS') || k.has('Space');

    let steer;
    if ((this.mode === 'bar' || this.mode === 'float') && !left && !right) {
      // UX-31: slider analógico: el giro es directamente la posición del dedo
      steer = this.slide; this.steerSmooth = steer;
    } else if (this.mode === 'tilt' && !left && !right) {
      const v = Math.max(-1, Math.min(1, -this.tilt * this.sens / 32)); // ±32º = giro completo (UX-29: menos grados con más sensibilidad)
      // FIS-25: curva suave cerca del centro (menos brusco)
      steer = Math.abs(v) < 0.05 ? 0 : Math.sign(v) * Math.abs(v) ** 1.35;
    } else {
      const target = (left ? 1 : 0) - (right ? 1 : 0);
      // los botones digitales entran rápido pero no de golpe
      // FIS-25: entrada más progresiva (antes 7): ~0,24 s hasta giro completo
      const rate = target === 0 ? 9 : 4.2 * this.sens; // UX-29
      this.steerSmooth += Math.max(-rate * dt, Math.min(rate * dt, target - this.steerSmooth));
      steer = this.steerSmooth;
    }
    let throttle = gas || (this.autoGas && !brake) ? 1 : 0, brk = brake ? 1 : 0;
    const p = this.pad;
    if (p) {
      if (p.steer !== 0 && !left && !right) { steer = p.steer; this.steerSmooth = steer; }
      brk = Math.max(brk, p.brake);
      throttle = Math.max(throttle, p.gas);
      if (this.autoGas && p.brake > 0.1) throttle = Math.max(gas ? 1 : 0, p.gas);
    }
    return { steer, throttle, brake: brk, human: true, sens: this.sens };
  }
}

function vibrate(ms) { try { navigator.vibrate?.(ms); } catch { /* nada */ } }
