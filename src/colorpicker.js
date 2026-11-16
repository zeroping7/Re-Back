// COC-25: selector de color propio (el <input type="color"> no abre en el WebView del APK).
// Cuadro de saturación/brillo + barra de tono + colores rápidos. Táctil y ratón (pointer events).
const hsv2hex = (h, s, v) => {
  const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
};
const hex2hsv = (hex) => {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, mx ? d / mx : 0, mx];
};
const QUICK = ['#e53935', '#ff7a00', '#ffd400', '#7cb342', '#00b8a9', '#1e88e5', '#5c6bc0', '#ab47bc', '#ff4081', '#ffffff', '#9aa4ae', '#212121'];

export function createColorPicker({ value, onChange, onReset }) {
  let [h, s, v] = hex2hsv(value);
  const root = document.createElement('div'); root.className = 'cp';
  root.innerHTML = '<div class="cp-l"><canvas class="cp-sv" width="200" height="130"></canvas><canvas class="cp-hue" width="200" height="22"></canvas></div>' +
    '<div class="cp-r"><div class="cp-q"></div><div class="cp-row"><span class="cp-cur"></span><button class="cp-reset">↺ Original</button></div></div>';
  const sv = root.querySelector('.cp-sv'), hue = root.querySelector('.cp-hue'), cur = root.querySelector('.cp-cur');
  const sg = sv.getContext('2d'), hg = hue.getContext('2d');
  const grad = hg.createLinearGradient(0, 0, hue.width, 0);
  for (let i = 0; i <= 6; i++) grad.addColorStop(i / 6, hsv2hex((i * 60) % 360, 1, 1));
  const draw = () => {
    const W = sv.width, H = sv.height;
    sg.fillStyle = hsv2hex(h, 1, 1); sg.fillRect(0, 0, W, H);
    let g = sg.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#fff'); g.addColorStop(1, '#fff0'); sg.fillStyle = g; sg.fillRect(0, 0, W, H);
    g = sg.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0000'); g.addColorStop(1, '#000'); sg.fillStyle = g; sg.fillRect(0, 0, W, H);
    const px = s * W, py = (1 - v) * H;
    sg.lineWidth = 3; sg.strokeStyle = '#000'; sg.beginPath(); sg.arc(px, py, 9, 0, 7); sg.stroke();
    sg.lineWidth = 2; sg.strokeStyle = '#fff'; sg.beginPath(); sg.arc(px, py, 9, 0, 7); sg.stroke();
    hg.fillStyle = grad; hg.fillRect(0, 0, hue.width, hue.height);
    const hx = (h / 360) * hue.width;
    hg.fillStyle = '#fff'; hg.strokeStyle = '#000'; hg.lineWidth = 2; hg.fillRect(hx - 3, 0, 6, hue.height); hg.strokeRect(hx - 3, 0, 6, hue.height);
    cur.style.background = hsv2hex(h, s, v);
  };
  const drag = (el, fn) => {
    const at = (e) => { const r = el.getBoundingClientRect(); fn(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))); draw(); onChange(hsv2hex(h, s, v)); };
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); at(e); el.onpointermove = at; });
    const end = () => { el.onpointermove = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.style.touchAction = 'none';
  };
  drag(sv, (x, y) => { s = x; v = 1 - y; });
  drag(hue, (x) => { h = x * 360 % 360; });
  const q = root.querySelector('.cp-q');
  for (const c of QUICK) {
    const b = document.createElement('button'); b.style.background = c;
    b.addEventListener('click', () => { [h, s, v] = hex2hsv(c); draw(); onChange(c); });
    q.append(b);
  }
  root.querySelector('.cp-reset').addEventListener('click', () => { onReset(); });
  draw();
  return root;
}
