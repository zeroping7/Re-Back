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
    this.onReset = null;

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

    addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyR' && this.onReset) this.onReset();
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
    modeBtn.addEventListener('click', async () => {
      if (this.mode === 'buttons') {
        try {
          if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
            await DeviceOrientationEvent.requestPermission();
          }
        } catch { /* sin permiso */ }
        this.mode = 'tilt'; this.tiltZero = null;
      } else this.mode = 'buttons';
      localStorage.setItem(KEY_MODE, this.mode);
      applyMode();
    });
    applyMode();
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
    return { steer, throttle: gas ? 1 : 0, brake: brake ? 1 : 0 };
  }
}

function vibrate(ms) { try { navigator.vibrate?.(ms); } catch { /* nada */ } }
