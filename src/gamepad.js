// Mando (CTL-04, CTL-05): conducción analógica en carrera y foco con cruceta en los menús.
// Mapeo "standard" de la Gamepad API (Xbox / PlayStation / genéricos Bluetooth).
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const DEAD = 0.18;

let lastPad = null;
export function rumble(ms, strength = 0.6) {
  try { lastPad?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 }); } catch { /* nada */ }
}

export class PadInput {
  constructor(controls) {
    this.controls = controls;
    this.prev = [];
    this.active = false;
    this.focus = null; this.focusIdx = 0; this.root = null;
    this.memory = new Map(); // foco recordado por pantalla
    this.repeatDir = null; this.repeatT = 0;
    addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') this.setActive(false); }, true);
    addEventListener('gamepadconnected', () => this.toast('🎮 Mando conectado'));
    addEventListener('gamepaddisconnected', () => { this.toast('🎮 Mando desconectado'); this.controls.pad = null; });
  }

  toast(text) {
    const el = document.getElementById('pad-toast');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  setActive(on) {
    if (on === this.active) return;
    this.active = on;
    document.body.classList.toggle('pad-mode', on);
    if (!on) this.clearFocus();
  }

  readPad() {
    const pads = navigator.getGamepads?.() || [];
    for (const p of pads) if (p && p.connected && p.buttons.length >= 10) return p;
    return null;
  }

  // ctx: { racing: bool } → en carrera conduce; si no, mueve el foco por los menús
  update(dt, ctx) {
    const p = this.readPad();
    lastPad = p;
    if (!p) { this.controls.pad = null; this.controls.padLook = false; this.controls.camStick.x = this.controls.camStick.y = 0; return; }
    const val = (i) => p.buttons[i]?.value ?? 0;
    const down = (i) => !!p.buttons[i]?.pressed || val(i) > 0.5;
    const now = p.buttons.map((_, i) => down(i));
    const hit = (i) => now[i] && !this.prev[i];
    const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
    const anyInput = now.some(Boolean) || Math.abs(ax) > 0.5 || Math.abs(ay) > 0.5;
    if (anyInput) this.setActive(true);

    if (ctx.racing) {
      this.clearFocus();
      // volante: stick con curva suave, o cruceta
      let steer = Math.abs(ax) < DEAD ? 0 : Math.sign(ax) * ((Math.abs(ax) - DEAD) / (1 - DEAD)) ** 1.4;
      if (now[B.LEFT]) steer = -1;
      if (now[B.RIGHT]) steer = 1;
      const gas = Math.max(val(B.RT), now[B.A] ? 1 : 0);
      const brake = Math.max(val(B.LT), now[B.B] ? 1 : 0);
      this.controls.pad = { steer: -steer, gas: gas > 0.08 ? gas : 0, brake: brake > 0.08 ? brake : 0 };
      if (hit(B.X) || hit(B.RB)) this.controls.firePending = true;
      // cámara: LB o pulsar el stick derecho = mirar atrás; stick derecho = girar alrededor del coche
      this.controls.padLook = now[B.LB] || now[B.R3];
      const rx = p.axes[2] ?? 0, ry = p.axes[3] ?? 0, dz = (v) => (Math.abs(v) < 0.2 ? 0 : (v - Math.sign(v) * 0.2) / 0.8);
      this.controls.camStick.x = dz(rx); this.controls.camStick.y = dz(ry);
      if (hit(B.Y)) this.controls.onCamera?.();
      if (hit(B.SELECT)) this.controls.onReset?.();
      if (hit(B.START)) this.controls.onPause?.();
    } else {
      this.controls.pad = null; this.controls.padLook = false;
      if (this.active) this.menu(dt, now, hit, ax, ay);
    }
    this.prev = now;
  }

  // ---------- Menús ----------
  menuRoot() {
    const start = document.getElementById('start');
    if (start && !start.classList.contains('hidden')) return start;
    const tune = document.getElementById('tune-panel');
    if (tune && !tune.classList.contains('hidden')) return tune;
    return [...document.querySelectorAll('.menu')].find((m) => !m.classList.contains('hidden')) || null;
  }

  focusables(root) {
    return [...root.querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent !== null && b.getBoundingClientRect().width > 0);
  }

  clearFocus() { this.focus?.classList.remove('pad-focus'); this.focus = null; }

  setFocus(el, list) {
    if (this.focus !== el) this.focus?.classList.remove('pad-focus');
    this.focus = el;
    if (!el) return;
    this.focusIdx = list.indexOf(el);
    el.classList.add('pad-focus');
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }

  defaultFocus(list) {
    return list.find((b) => b.classList.contains('card') && b.classList.contains('sel'))
      || list.find((b) => b.classList.contains('big-btn')) || list.find((b) => !b.classList.contains('back')) || list[0];
  }

  menu(dt, now, hit, ax, ay) {
    const root = this.menuRoot();
    if (!root) { this.clearFocus(); return; }
    let list = this.focusables(root);
    if (!list.length) return;
    if (root !== this.root) {
      if (this.root) this.memory.set(this.root.id, this.focusIdx);
      this.root = root;
      const i = this.memory.get(root.id);
      this.setFocus(i != null && list[i] && !list[i].classList.contains('back') ? list[i] : this.defaultFocus(list), list);
    }
    // el botón con foco puede haberse redibujado (las tarjetas se rehacen al elegir)
    if (!this.focus || !this.focus.isConnected || !list.includes(this.focus)) {
      this.setFocus(list[Math.min(this.focusIdx, list.length - 1)] || this.defaultFocus(list), list);
    }

    // dirección con repetición al mantener
    const dir = now[B.UP] || ay < -0.6 ? 'up' : now[B.DOWN] || ay > 0.6 ? 'down' : now[B.LEFT] || ax < -0.6 ? 'left' : now[B.RIGHT] || ax > 0.6 ? 'right' : null;
    if (dir !== this.repeatDir) { this.repeatDir = dir; this.repeatT = 0.38; if (dir) this.move(dir, list); }
    else if (dir && (this.repeatT -= dt) <= 0) { this.repeatT = 0.13; this.move(dir, list); }

    // Start: botón principal de la pantalla (¡A correr!, ¡Empezar copa!, empezar, reanudar)
    const primary = root.querySelector('#btn-start, #btn-go, #btn-cup-go, #btn-resume');
    if (hit(B.START) && primary && primary.offsetParent !== null) { primary.click(); return; }
    if (hit(B.A)) {
      const el = this.focus;
      el?.classList.add('pad-press'); setTimeout(() => el?.classList.remove('pad-press'), 120);
      el?.click();
      list = this.focusables(this.menuRoot() || root);
      if (this.menuRoot() === root && this.focus && !this.focus.isConnected) this.setFocus(list[Math.min(this.focusIdx, list.length - 1)], list);
    } else if (hit(B.B)) {
      const back = root.id === 'm-pause' ? root.querySelector('#btn-resume')
        : root.id === 'tune-panel' ? root.querySelector('#tune-close') : root.querySelector('.back');
      back?.click();
    }
  }

  move(dir, list) {
    const cur = this.focus;
    if (!cur) return;
    const r = cur.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    let best = null, bestScore = Infinity;
    for (const el of list) {
      if (el === cur) continue;
      const q = el.getBoundingClientRect();
      // distancia entre bordes en el eje del movimiento, para que tarjetas grandes no "tapen" a las pequeñas
      const dx = (q.left + q.width / 2) - cx, dy = (q.top + q.height / 2) - cy;
      const along = dx * v[0] + dy * v[1];
      if (along <= 4) continue;
      // separación lateral entre los bordes (0 si se solapan) + un poco de distancia entre centros
      const gap = v[0] ? Math.max(0, q.top - r.bottom, r.top - q.bottom) : Math.max(0, q.left - r.right, r.left - q.right);
      const across = gap * 4 + Math.abs(dx * v[1] + dy * v[0]) * (gap > 0 ? 0.6 : 0.2);
      const score = along + across + (q.left + q.top) * 0.001;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { this.setFocus(best, list); this.onMove?.(); }
  }
}
