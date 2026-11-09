// Entrada: botones táctiles, inclinación del móvil y teclado.
const KEY_MODE = 'reback.controlMode';

export class Controls {
  constructor() {
    this.state = { left: false, right: false, gas: false, brake: false };
    this.keys = new Set();
    this.mode = localStorage.getItem(KEY_MODE) || 'buttons'; // 'buttons' | 'tilt'
    this.tilt = 0; this.tiltZero = null;
    this.steerSmooth = 0;
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
    bind('btn-left', 'left'); bind('btn-right', 'right'); bind('btn-gas', 'gas'); bind('btn-brake', 'brake');
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

    const modeBtn = document.getElementById('btn-mode');
    const applyMode = () => {
      document.getElementById('steer-pad').classList.toggle('hidden', this.mode === 'tilt');
      modeBtn.textContent = this.mode === 'tilt' ? '📱' : '🎮';
    };
    this.applyMode = applyMode;
    modeBtn.addEventListener('click', () => this.setMode(this.mode === 'buttons' ? 'tilt' : 'buttons'));
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

  consumeFire() { const f = this.firePending; this.firePending = false; return f; }

  releaseAll() {
    for (const k in this.state) this.state[k] = false;
    document.querySelectorAll('.pad.active').forEach((el) => el.classList.remove('active'));
    this.keys.clear(); this.firePending = false; this.pad = null;
  }

  // Devuelve { steer: -1..1 (+ = izquierda), throttle, brake }
  read(dt) {
    if (this.override) return this.override;
    const k = this.keys, s = this.state;
    const left = s.left || k.has('ArrowLeft') || k.has('KeyA');
    const right = s.right || k.has('ArrowRight') || k.has('KeyD');
    const gas = s.gas || k.has('ArrowUp') || k.has('KeyW');
    const brake = s.brake || k.has('ArrowDown') || k.has('KeyS') || k.has('Space');

    let steer;
    if (this.mode === 'tilt' && !left && !right) {
      const v = -this.tilt / 28; // ±28º = giro completo
      steer = Math.max(-1, Math.min(1, Math.abs(v) < 0.05 ? 0 : v));
    } else {
      const target = (left ? 1 : 0) - (right ? 1 : 0);
      // los botones digitales entran rápido pero no de golpe
      const rate = target === 0 ? 10 : 7;
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
    return { steer, throttle, brake: brk };
  }
}

function vibrate(ms) { try { navigator.vibrate?.(ms); } catch { /* nada */ } }
