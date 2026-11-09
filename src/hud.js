import { ITEMS } from './items.js';
import { fmtTime } from './race.js';

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
    const pts = circuit.samples.map((s) => s.p);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    const W = this.map.width, H = this.map.height, pad = 10;
    const sc = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxZ - minZ));
    const ox = (W - (maxX - minX) * sc) / 2, oy = (H - (maxZ - minZ) * sc) / 2;
    this.toMap = (x, z) => [ox + (x - minX) * sc, oy + (z - minZ) * sc];
    this.mapPts = pts.map((p) => this.toMap(p.x, p.z));
  }

  drawMap(cars, player) {
    const g = this.ctx, W = this.map.width, H = this.map.height;
    g.clearRect(0, 0, W, H);
    g.lineJoin = 'round';
    g.beginPath();
    this.mapPts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.strokeStyle = '#0008'; g.lineWidth = 9; g.stroke();
    g.strokeStyle = '#ffffffcc'; g.lineWidth = 4; g.stroke();
    const [sx, sy] = this.mapPts[0];
    g.fillStyle = '#111'; g.fillRect(sx - 3, sy - 3, 6, 6);
    for (const c of cars) {
      if (c === player) continue;
      const [x, y] = this.toMap(c.currPos.x, c.currPos.z);
      g.fillStyle = c.color; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
    }
    const [x, y] = this.toMap(player.currPos.x, player.currPos.z);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = player.color; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
  }

  update(d) {
    this.set('speed', this.speed, String(Math.round(d.speed)));
    if (d.practice) {
      this.set('pos', this.pos, '');
      this.set('postot', this.posTot, '');
      this.set('lap', this.lap, `VUELTA ${d.lap}`);
    } else {
      this.set('pos', this.pos, `${d.place}º`);
      this.set('postot', this.posTot, `/${d.total}`);
      this.set('lap', this.lap, `VUELTA ${d.lap}/${d.laps}`);
    }
    this.set('time', this.time, fmtTime(d.lapTime));
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
    if (this.mapT <= 0) { this.mapT = 3; this.drawMap(d.cars, d.player); }
  }
}
