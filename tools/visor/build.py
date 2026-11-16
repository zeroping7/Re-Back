js = open('out/bundle.js', encoding='utf-8').read().replace('</script', '<\\/script')
html = '''<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Re-Back · Visor de circuitos</title>
<style>
html,body{margin:0;height:100%;overflow:hidden;background:#1b2230;font-family:system-ui,sans-serif;color:#e8eefc;-webkit-user-select:none;user-select:none}
#view{position:fixed;inset:0;touch-action:none}#view canvas{display:block;width:100%;height:100%}
#bar{position:fixed;left:0;right:0;bottom:0;padding:10px 10px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(transparent,#0c111bd9 30%);display:flex;flex-direction:column;gap:8px}
.row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#list{flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px}#list button{flex:none}
button,select{font:inherit;font-size:14px;border:1px solid #3b4760;background:#222c40;color:#e8eefc;border-radius:10px;padding:8px 11px}
button.on{background:#ff8a1f;border-color:#ff8a1f;color:#111}select{flex:1;min-width:0}
#elp{position:fixed;top:52px;left:10px;right:62px;z-index:4;background:#0c111bf0;border:1px solid #3b4760;border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:6px}#elt{width:100%;box-sizing:border-box;height:38vh;font:13px ui-monospace,monospace;background:#0c111b;color:#e8eefc;border:1px solid #3b4760;border-radius:10px;padding:8px;-webkit-user-select:text;user-select:text}
#zp,#tp,#cp{position:fixed;top:52px;left:10px;right:62px;z-index:4;background:#0c111bf0;border:1px solid #3b4760;border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:6px}
#zt button{padding:6px 9px;font-size:13px}
input[type=range]{flex:1;accent-color:#ff8a1f}
#info{position:fixed;top:10px;left:10px;right:10px;text-align:center;font-size:14px;background:#0c111bb0;border-radius:10px;padding:6px;pointer-events:none;-webkit-user-select:text;user-select:text}
#paint{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;touch-action:none;z-index:2}#paint.on{pointer-events:auto}
#tools{position:fixed;right:10px;top:52px;display:flex;flex-direction:column;gap:6px;z-index:3}#tools button{font-size:20px;padding:6px 9px}
#bar,#info{z-index:3}
.lg{font-size:12px;opacity:.8}.lg b{padding:1px 6px;border-radius:6px;color:#fff}
</style></head><body>
<div id="view"></div><canvas id="paint"></canvas><div id="info">Cargando…</div>
<div id="elp" style="display:none"><div class="lg">Cuestas (hills): frac = punto de la vuelta 0–1, len = largo, h = altura, double = doble joroba · Rampas (ramps): frac, len, h, deck = plataforma</div>
<textarea id="elt" spellcheck="false"></textarea>
<div class="row"><button id="ela">✅ Aplicar</button><button id="elr">↩️ Original</button></div></div>
<div id="zp" style="display:none">
<div class="row"><button id="zv" class="on">👁️ Ver</button><button id="za">➕ Añadir</button><button id="zr">➖ Quitar</button><button id="zc">📋 Copiar</button></div>
<div class="row" id="zt"></div>
<div class="row" id="zlr"><span class="lg">Largo</span><input type="range" id="zlen" min="6" max="40" step="1" value="18"><span id="zlv" class="lg">18</span></div>
<div class="lg">Zonas: <span id="zl"></span> · las marcadas con + son nuevas (solo en el visor hasta pasarlas al código)</div>
</div>
<div id="tp" style="display:none">
<div class="row"><button id="ta">➕ Turbo</button><button id="aa">➕ Armas</button><button id="tq">➖ Quitar</button><button id="tc">📋 Copiar</button><button id="bt">✋ Mover</button></div>
<div class="lg"><span id="tl"></span> · toca la pista para poner, o un turbo/caja para quitar. Para moverlos usa ✋.</div>
</div>
<div id="cp" style="display:none">
<div class="row" id="cl"></div>
<div class="row"><button id="cm">✋ Mover</button><button id="cd">🗑️ Eliminar</button></div>
<div class="lg"><span id="cn"></span> · toca un componente de la lista y luego la pista. Mete su rampa en ⛰️ Alturas y su turbo en turbos (sale en 📋 Copiar todo).</div>
</div>
<div id="tools"><button id="pen" title="Lápiz">✏️</button><button id="eraser" title="Goma">🧽</button><button id="clear" title="Borrar todo">🗑️</button></div>
<div id="bar">
<div class="row" id="list"></div>
<div class="row lg"><b style="background:#1565c0">abierta</b><b style="background:#ef6c00">cerrada</b><b style="background:#c62828">horquilla</b><b style="background:#6a1b9a">obstáculo</b><b style="background:#00897b">cuesta</b><b style="background:#5d4037">rampa</b> · ↰ izq ↱ der</div>
<div class="row"><select id="trk"></select></div>
<div class="row"><button data-v="iso">3D</button><button id="lb" class="on">🏷️ Etiquetas</button><button id="ar" class="on">🎁 Armas</button><button id="tu">🚀 Turbos/Armas</button><button id="co">🧩 Componentes</button><button id="el">⛰️ Alturas</button><button id="zo">🟫 Zonas</button><button id="ca">📋 Copiar todo</button><span class="lg">Techo</span><input type="range" id="cut" min="2" max="100" step="0.5"></div>
</div>
<script>''' + js + '''</script><script>
(() => {
  const cv = document.getElementById('paint'), g = cv.getContext('2d');
  let mode = null, last = null;
  const fit = () => { const d = Math.min(devicePixelRatio, 2), old = document.createElement('canvas'); old.width = cv.width; old.height = cv.height; old.getContext('2d').drawImage(cv, 0, 0);
    cv.width = innerWidth * d; cv.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); g.drawImage(old, 0, 0, old.width / d, old.height / d); };
  addEventListener('resize', fit); fit();
  const set = (m) => { mode = mode === m ? null : m; for (const id of ['pen', 'eraser']) document.getElementById(id).classList.toggle('on', mode === id); cv.classList.toggle('on', !!mode); };
  document.getElementById('pen').onclick = () => set('pen');
  document.getElementById('eraser').onclick = () => set('eraser');
  document.getElementById('clear').onclick = () => g.clearRect(0, 0, cv.width, cv.height);
  const pt = (e) => [e.clientX, e.clientY];
  cv.addEventListener('pointerdown', (e) => { if (!mode) return; cv.setPointerCapture(e.pointerId); last = pt(e); draw(last); });
  cv.addEventListener('pointermove', (e) => { if (last) draw(pt(e)); });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, () => { last = null; });
  function draw(p) {
    g.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';
    g.strokeStyle = '#ff1744'; g.lineWidth = mode === 'eraser' ? 40 : 10; g.lineCap = g.lineJoin = 'round';
    g.beginPath(); g.moveTo(...last); g.lineTo(...p); g.stroke(); last = p;
  }
})();
</script></body></html>'''
open('out/index.html', 'w', encoding='utf-8').write(html); print(len(html))
