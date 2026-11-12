import { ITEMS } from './items.js';
import { fmtTime } from './race.js';
import { fmtPts } from './disciplines.js';

// Marcador en carrera: posición, vuelta, tiempos, objeto, mensajes y minimapa
export class Hud {
  constructor() {
    this.el = (id) => document.getElementById(id);
    this.pos = this.el('h-pos'); this.posTot = this.el('h-postot');
    this.lap = this.el('h-lap'); this.time = this.el('h-time'); this.best = this.el('h-best'); this.lastLap = this.el('h-last');
    this.speed = this.el('speed');
    this.healthBar = document.querySelector('#h-health b');
    this.item = this.el('btn-item');
    this.msg = this.el('h-msg');
    this.map = this.el('h-map');
    this.ctx = this.map.getContext('2d');
    this.msgT = 0; this.mapT = 0;
    this.last = {};
  }

  // aviso "MIRANDO ATRÁS" (CTL-06)
  lookBack(on) {
    if (on === this.lookOn) return;
    this.lookOn = on;
    if (!this.lookEl) { this.lookEl = document.createElement('div'); this.lookEl.id = 'h-lookback'; this.lookEl.textContent = '👀 ATRÁS'; this.el('hud').append(this.lookEl); }
    this.lookEl.classList.toggle('hidden', !on);
  }

  set(key, el, val) { if (this.last[key] !== val) { this.last[key] = val; el.textContent = val; } }

  message(text, secs = 1.5, cls = '') {
    this.msg.textContent = text;
    this.msg.className = 'show ' + cls;
    this.msgT = secs;
    clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => { this.msg.className = ''; }, secs * 1000);
  }

  setupMinimap(circuit) {
    // CRW-24: en un tramo A→B solo se dibuja de la salida a la meta (sin la vuelta oculta)
    const dr = circuit.drive, N = circuit.samples.length;
    this.mapOpen = !!dr;
    const pts = dr ? circuit.samples.slice(0, Math.min(N, dr[1] - 8) + 1).map((s) => s.p) : circuit.samples.map((s) => s.p);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    const W = this.map.width, H = this.map.height, pad = 10;
    const sc = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxZ - minZ));
    const ox = (W - (maxX - minX) * sc) / 2, oy = (H - (maxZ - minZ) * sc) / 2;
    this.toMap = (x, z) => [ox + (x - minX) * sc, oy + (z - minZ) * sc];
    this.mapPts = pts.map((p) => this.toMap(p.x, p.z));
  }

  drawMap(cars, player, battle) {
    const g = this.ctx, W = this.map.width, H = this.map.height;
    g.clearRect(0, 0, W, H);
    g.lineJoin = 'round';
    g.beginPath();
    this.mapPts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    if (!this.mapOpen) g.closePath();
    g.strokeStyle = '#0008'; g.lineWidth = 9; g.stroke();
    g.strokeStyle = '#ffffffcc'; g.lineWidth = 4; g.stroke();
    const [sx, sy] = this.mapPts[0];
    g.fillStyle = '#111'; g.fillRect(sx - 3, sy - 3, 6, 6);
    if (this.mapOpen) { const [fx, fy] = this.mapPts[this.mapPts.length - 1]; g.fillStyle = '#2e7d32'; g.fillRect(fx - 4, fy - 4, 8, 8); } // meta
    for (const c of cars) {
      if (c === player) continue;
      const [x, y] = this.toMap(c.currPos.x, c.currPos.z);
      g.fillStyle = c.color; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
    }
    if (battle) { // estrella
      const sp = battle.holder ? battle.holder.currPos : battle.pos;
      const [bx, by] = this.toMap(sp.x, sp.z);
      g.font = '15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⭐', bx, by - (battle.holder ? 9 : 0));
    }
    const [x, y] = this.toMap(player.currPos.x, player.currPos.z);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = player.color; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
  }

  // Batalla de la Estrella: relojes de todos (UX-14)
  battlePanel(d) {
    const B = d.battle;
    document.getElementById('hud').classList.toggle('battle-mode', !!B);
    if (!B) { if (this.bEl) this.bEl.classList.add('hidden'); return; }
    if (!this.bEl) { this.bEl = document.createElement('div'); this.bEl.id = 'h-battle'; this.el('hud').append(this.bEl); }
    this.bEl.classList.remove('hidden');
    this.bT = (this.bT || 0) + 1;
    if (this.bT % 6) return;
    const rows = [...d.cars].sort((a, b) => B.timers.get(a) - B.timers.get(b)).map((c) => {
      const left = B.timers.get(c), pct = (left / (B.time || 60)) * 100;
      return `<div class="br${c === d.player ? ' me' : ''}${c === B.holder ? ' hold' : ''}"><span class="dot" style="background:${c.color}"></span>` +
        `<span class="nm">${c === B.holder ? '⭐ ' : ''}${c.name}</span><i><b style="width:${pct}%;background:${c.color}"></b></i><span class="tm">${left.toFixed(1)}</span></div>`;
    }).join('');
    this.bEl.innerHTML = rows;
  }

  // Drift: puntos, combo y multiplicador (DRI-06)
  driftPanel(d) {
    const st = d.drift;
    document.getElementById('hud').classList.toggle('drift-mode', !!st);
    if (!st) { if (this.dEl) this.dEl.classList.add('hidden'); return; }
    if (!this.dEl) {
      this.dEl = document.createElement('div'); this.dEl.id = 'h-drift';
      this.dEl.innerHTML = '<div class="tot"><b></b><small>PTS</small></div><div class="combo"><span class="pts"></span><span class="mult"></span></div><div class="flash"></div>';
      this.el('hud').append(this.dEl);
      this.dTot = this.dEl.querySelector('.tot b'); this.dCombo = this.dEl.querySelector('.combo');
      this.dPts = this.dEl.querySelector('.pts'); this.dMult = this.dEl.querySelector('.mult'); this.dFlash = this.dEl.querySelector('.flash');
    }
    this.dEl.classList.remove('hidden');
    this.set('dtot', this.dTot, fmtPts(st.final ?? st.score));
    const on = st.combo > 1;
    if (this.last.dOn !== on) { this.last.dOn = on; this.dCombo.classList.toggle('on', on); }
    if (on) {
      this.set('dpts', this.dPts, '+' + fmtPts(st.combo * st.mult));
      this.set('dmult', this.dMult, '×' + st.mult);
      if (this.last.dm !== st.mult) { this.last.dm = st.mult; this.dCombo.dataset.m = st.mult; this.dMult.classList.remove('pop'); void this.dMult.offsetWidth; this.dMult.classList.add('pop'); }
    }
    // DRI-16: al perder el combo, la puntuación pendiente se rompe en rojo
    if (st.lost && st.lost !== this.lastLost) {
      this.lastLost = st.lost;
      const t = `+${fmtPts(st.lost.pts)} ×${st.lost.mult}`;
      const el = document.createElement('div'); el.className = 'brk';
      let h = `<span class="h l">${t}</span><span class="h r">${t}</span><i class="crack"></i>`;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * 6.283 + Math.random() * 0.5, d = 40 + Math.random() * 60;
        h += `<b style="--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d * 0.7 + 30).toFixed(0)}px;--r:${(Math.random() * 360 - 180).toFixed(0)}deg"></b>`;
      }
      el.innerHTML = h; this.dEl.append(el);
      setTimeout(() => el.remove(), 1400);
    }
    const f = st.flash;
    if (f && f !== this.lastFlash) {
      this.lastFlash = f;
      this.dFlash.textContent = f.text; this.dFlash.className = 'flash';
      void this.dFlash.offsetWidth; this.dFlash.className = 'flash show ' + (f.ok ? 'ok' : 'bad');
    }
  }

  update(d) {
    this.set('speed', this.speed, String(Math.round(d.speed)));
    if (d.battle) {
      this.set('pos', this.pos, `${d.place}º`);
      this.set('postot', this.posTot, `/${d.total}`);
      this.set('lap', this.lap, d.battle.holder === d.player ? '⭐ ¡LA TIENES!' : '⭐ BATALLA');
      const left = d.battle.timers.get(d.player);
      this.set('time', this.time, left.toFixed(1) + ' s');
    } else if (d.practice || d.solo) {
      this.set('pos', this.pos, '');
      this.set('postot', this.posTot, '');
      this.set('lap', this.lap, d.practice ? `VUELTA ${d.lap}` : `VUELTA ${d.lap}/${d.laps}`);
    } else {
      this.set('pos', this.pos, `${d.place}º`);
      this.set('postot', this.posTot, `/${d.total}`);
      this.set('lap', this.lap, `VUELTA ${d.lap}/${d.laps}`);
    }
    if (!d.battle) this.set('time', this.time, fmtTime(d.lapTime));
    const hp = Math.round(d.health);
    if (this.last.hp !== hp) {
      this.last.hp = hp;
      this.healthBar.style.width = hp + '%';
      this.healthBar.style.background = hp > 60 ? '#7dff8a' : hp > 30 ? '#ffd166' : '#ff5252';
    }
    this.set('best', this.best, 'Récord ' + fmtTime(d.best));
    this.set('lastLap', this.lastLap, 'Última ' + fmtTime(d.lastLap));
    const icon = d.bomb !== undefined ? `💣${Math.ceil(d.bomb)}` : d.item ? ITEMS[d.item].icon + (d.ammo > 1 ? `<small>×${d.ammo}</small>` : '') : '';
    if (this.last.item !== icon) {
      this.last.item = icon;
      this.item.innerHTML = icon || '·';
      this.item.classList.toggle('has', !!d.item);
      this.item.classList.toggle('bomb', d.bomb !== undefined);
    }
    this.mapT -= 1;
    if (this.mapT <= 0) { this.mapT = 3; this.drawMap(d.cars, d.player, d.battle); }
    this.battlePanel(d);
    this.driftPanel(d);
    if (this.last.noItems !== !!d.noItems) { this.last.noItems = !!d.noItems; document.getElementById('hud').classList.toggle('no-items', !!d.noItems); }
  }
}
