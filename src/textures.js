import * as THREE from 'three';

// Texturas generadas por código (sin descargas).
function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function rnd(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function parquetTexture(repeat) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rnd(7);
    const rows = 8, plankH = h / rows;
    for (let y = 0; y < rows; y++) {
      let x = -r() * 200;
      while (x < w) {
        const len = 140 + r() * 160;
        const l = 52 + r() * 12, s = 45 + r() * 15, hue = 26 + r() * 8;
        g.fillStyle = `hsl(${hue},${s}%,${l}%)`;
        g.fillRect(x, y * plankH, len, plankH);
        // vetas
        g.globalAlpha = 0.12;
        for (let k = 0; k < 6; k++) {
          g.strokeStyle = r() > 0.5 ? '#5a3215' : '#f3c58f';
          g.lineWidth = 1 + r() * 2;
          const yy = y * plankH + r() * plankH;
          g.beginPath(); g.moveTo(x, yy);
          g.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 8, x + len * 0.6, yy + (r() - 0.5) * 8, x + len, yy);
          g.stroke();
        }
        g.globalAlpha = 1;
        g.fillStyle = '#3b220f';
        g.fillRect(x, y * plankH, 2, plankH);
        x += len;
      }
      g.fillStyle = '#3b220f';
      g.fillRect(0, y * plankH, w, 2);
    }
  }, { repeat });
}

export function rugTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#7d2a35'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e8c27a'; g.lineWidth = 14; g.strokeRect(24, 24, w - 48, h - 48);
    g.strokeStyle = '#2f4f6f'; g.lineWidth = 8; g.strokeRect(52, 52, w - 104, h - 104);
    g.fillStyle = '#e8c27a';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const cx = 110 + i * 73, cy = 110 + j * 73;
      g.beginPath(); g.moveTo(cx, cy - 22); g.lineTo(cx + 22, cy); g.lineTo(cx, cy + 22); g.lineTo(cx - 22, cy); g.closePath();
      g.fill();
    }
    // ruido de tela
    const r = rnd(3);
    for (let k = 0; k < 9000; k++) {
      g.fillStyle = r() > 0.5 ? '#ffffff10' : '#00000014';
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  });
}

export function checkerTexture(cols = 8, rows = 2) {
  return canvasTex(256, 64, (g, w, h) => {
    const cw = w / cols, ch = h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      g.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4';
      g.fillRect(i * cw, j * ch, cw, ch);
    }
  }, { repeat: [1, 1] });
}

export function wallpaperTexture(repeat) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#cfd9d2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c3cfc7';
    for (let i = 0; i < 8; i++) g.fillRect(i * 32, 0, 14, h);
    g.fillStyle = '#b7c5bc';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.beginPath(); g.arc(i * 64 + 23, j * 64 + 32, 4, 0, Math.PI * 2); g.fill();
    }
  }, { repeat });
}

export function bookCoverTexture(title, color) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffffaa'; g.lineWidth = 6; g.strokeRect(16, 16, w - 32, h - 32);
    g.fillStyle = '#fff'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
    g.fillText(title, w / 2, h / 2 + 12);
  });
}

export function canTexture() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#d9142b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(0, 80); g.bezierCurveTo(80, 40, 160, 110, 256, 60); g.lineTo(256, 75);
    g.bezierCurveTo(160, 125, 80, 55, 0, 95); g.fill();
    g.font = 'italic bold 40px sans-serif'; g.fillText('FIZZ', 70, 50);
  });
}

export function tileTexture(repeat) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rnd(21);
    const n = 2, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const l = (i + j) % 2 ? 90 : 84;
      g.fillStyle = `hsl(210, 8%, ${l + r() * 3}%)`;
      g.fillRect(i * s, j * s, s, s);
    }
    g.fillStyle = '#9aa1a8';
    for (let i = 0; i <= n; i++) { g.fillRect(i * s - 2, 0, 4, h); g.fillRect(0, i * s - 2, w, 4); }
    for (let k = 0; k < 400; k++) { g.fillStyle = r() > 0.5 ? '#ffffff22' : '#0000000d'; g.fillRect(r() * w, r() * h, 2, 2); }
  }, { repeat });
}

export function grassTexture(repeat) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rnd(5);
    g.fillStyle = '#5d9a3a'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 2600; k++) {
      const l = 30 + r() * 22;
      g.fillStyle = `hsl(${92 + r() * 20}, 50%, ${l}%)`;
      g.fillRect(r() * w, r() * h, 2, 3 + r() * 4);
    }
  }, { repeat });
}

export function dirtTexture(repeat) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rnd(9);
    g.fillStyle = '#8a6a48'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 2200; k++) {
      g.fillStyle = `hsl(${28 + r() * 10}, ${30 + r() * 20}%, ${28 + r() * 25}%)`;
      const s = 1 + r() * 4;
      g.fillRect(r() * w, r() * h, s, s);
    }
  }, { repeat });
}

export function labelTexture(lines, bg, fg = '#fff') {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff33'; g.fillRect(0, h * 0.68, w, h * 0.12);
    g.fillStyle = fg; g.textAlign = 'center'; g.font = 'bold 40px sans-serif';
    g.fillText(lines[0], w / 2, 56);
    if (lines[1]) { g.font = 'bold 22px sans-serif'; g.fillText(lines[1], w / 2, 100); }
  });
}

// ---------- Texturas de suelo con relieve (mapa de color + mapa de normales) ----------
function normalFromHeight(hc, strength = 2) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); const img = g.createImageData(w, h); const d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = ((-dx / l) * 0.5 + 0.5) * 255; d[i + 1] = ((dy / l) * 0.5 + 0.5) * 255; d[i + 2] = ((1 / l) * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
function texFrom(c, repeat, srgb) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function pair(size, draw, repeat, strength) {
  const col = document.createElement('canvas'), hei = document.createElement('canvas');
  col.width = hei.width = size; col.height = hei.height = size;
  const gc = col.getContext('2d'), gh = hei.getContext('2d');
  gh.fillStyle = '#808080'; gh.fillRect(0, 0, size, size);
  draw(gc, gh, size);
  return { map: texFrom(col, repeat, true), normalMap: texFrom(normalFromHeight(hei, strength), repeat, false) };
}

export function groundTex(kind, repeat = [1, 1]) {
  const r = rnd(kind.length * 7 + 3);
  switch (kind) {
    case 'parquet': return pair(512, (g, h, S) => {
      const rows = 8, ph = S / rows;
      for (let y = 0; y < rows; y++) {
        let x = -r() * 200;
        while (x < S) {
          const len = 150 + r() * 170, l = 50 + r() * 14, sat = 42 + r() * 18, hue = 24 + r() * 10;
          g.fillStyle = `hsl(${hue},${sat}%,${l}%)`; g.fillRect(x, y * ph, len, ph);
          for (let k = 0; k < 14; k++) {
            g.globalAlpha = 0.08 + r() * 0.08; g.strokeStyle = r() > 0.5 ? '#4a2810' : '#f6cf9a'; g.lineWidth = 1 + r() * 2;
            const yy = y * ph + r() * ph;
            g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 10, x + len * 0.7, yy + (r() - 0.5) * 10, x + len, yy); g.stroke();
          }
          g.globalAlpha = 1;
          const sh = g.createLinearGradient(0, y * ph, 0, y * ph + ph); sh.addColorStop(0, '#ffffff14'); sh.addColorStop(1, '#00000014');
          g.fillStyle = sh; g.fillRect(x, y * ph, len, ph);
          h.fillStyle = '#202020'; h.fillRect(x, y * ph, 3, ph);
          g.fillStyle = '#2e1a0c'; g.fillRect(x, y * ph, 2, ph);
          x += len;
        }
        h.fillStyle = '#202020'; h.fillRect(0, y * ph, S, 3);
        g.fillStyle = '#2e1a0c'; g.fillRect(0, y * ph, S, 2);
      }
    }, repeat, 3);
    case 'tile': return pair(512, (g, h, S) => {
      const n = 4, s = S / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const l = (i + j) % 2 ? 91 : 86;
        g.fillStyle = `hsl(210, 7%, ${l + r() * 2}%)`; g.fillRect(i * s, j * s, s, s);
        for (let k = 0; k < 60; k++) { g.fillStyle = `hsla(210,10%,${60 + r() * 30}%,0.25)`; g.fillRect(i * s + r() * s, j * s + r() * s, 2 + r() * 3, 2); }
      }
      g.fillStyle = '#a3a9ae'; h.fillStyle = '#303030';
      for (let i = 0; i <= n; i++) { g.fillRect(i * s - 3, 0, 6, S); g.fillRect(0, i * s - 3, S, 6); h.fillRect(i * s - 3, 0, 6, S); h.fillRect(0, i * s - 3, S, 6); }
    }, repeat, 4);
    case 'grass': return pair(512, (g, h, S) => {
      g.fillStyle = '#4f8f32'; g.fillRect(0, 0, S, S);
      for (let k = 0; k < 40; k++) { g.fillStyle = `hsla(${88 + r() * 25},45%,${30 + r() * 15}%,0.35)`; g.beginPath(); g.arc(r() * S, r() * S, 20 + r() * 60, 0, 7); g.fill(); }
      for (let k = 0; k < 9000; k++) {
        const x = r() * S, y = r() * S, len = 4 + r() * 9, l = 26 + r() * 30;
        g.strokeStyle = `hsl(${85 + r() * 30}, ${45 + r() * 20}%, ${l}%)`; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - len); g.stroke();
        h.strokeStyle = `rgb(${120 + l * 2},${120 + l * 2},${120 + l * 2})`; h.lineWidth = 1.2;
        h.beginPath(); h.moveTo(x, y); h.lineTo(x + (r() - 0.5) * 4, y - len); h.stroke();
      }
    }, repeat, 2);
    case 'dirt': return pair(512, (g, h, S) => {
      g.fillStyle = '#8a6a48'; g.fillRect(0, 0, S, S);
      for (let k = 0; k < 30; k++) { g.fillStyle = `hsla(${26 + r() * 10},35%,${30 + r() * 20}%,0.3)`; g.beginPath(); g.arc(r() * S, r() * S, 30 + r() * 70, 0, 7); g.fill(); }
      for (let k = 0; k < 5000; k++) { g.fillStyle = `hsl(${25 + r() * 12}, ${25 + r() * 25}%, ${25 + r() * 30}%)`; const s = 1 + r() * 3; g.fillRect(r() * S, r() * S, s, s); }
      for (let k = 0; k < 500; k++) {
        const x = r() * S, y = r() * S, rad = 2 + r() * 6, l = 45 + r() * 30;
        g.fillStyle = `hsl(30, 8%, ${l}%)`; g.beginPath(); g.ellipse(x, y, rad, rad * 0.8, r() * 3, 0, 7); g.fill();
        h.fillStyle = '#d0d0d0'; h.beginPath(); h.ellipse(x, y, rad, rad * 0.8, 0, 0, 7); h.fill();
      }
      // roderas
      h.strokeStyle = '#606060'; h.lineWidth = 18;
      for (const x of [S * 0.3, S * 0.7]) { h.beginPath(); h.moveTo(x, 0); h.lineTo(x + (r() - 0.5) * 20, S); h.stroke(); }
    }, repeat, 3);
    case 'mud': return pair(512, (g, h, S) => {
      g.fillStyle = '#4a3220'; g.fillRect(0, 0, S, S);
      for (let k = 0; k < 120; k++) {
        const x = r() * S, y = r() * S, rad = 6 + r() * 40;
        g.fillStyle = `hsla(${24 + r() * 8},40%,${14 + r() * 14}%,0.6)`; g.beginPath(); g.ellipse(x, y, rad, rad * 0.6, r() * 3, 0, 7); g.fill();
        h.fillStyle = r() > 0.5 ? '#a0a0a0' : '#606060'; h.beginPath(); h.ellipse(x, y, rad, rad * 0.6, 0, 0, 7); h.fill();
      }
      for (let k = 0; k < 30; k++) { g.fillStyle = '#ffffff22'; g.beginPath(); g.ellipse(r() * S, r() * S, 4 + r() * 10, 2 + r() * 3, r() * 3, 0, 7); g.fill(); }
    }, repeat, 4);
    case 'wax': return pair(256, (g, h, S) => {
      g.fillStyle = '#fff8e1'; g.fillRect(0, 0, S, S);
      for (let k = 0; k < 40; k++) { g.strokeStyle = '#ffffff'; g.globalAlpha = 0.5; g.lineWidth = 2 + r() * 6; g.beginPath(); g.arc(r() * S, r() * S, 20 + r() * 60, r() * 3, r() * 3 + 1.5); g.stroke(); }
      g.globalAlpha = 1;
    }, repeat, 1);
    case 'wet': return pair(256, (g, h, S) => {
      g.fillStyle = '#9fdcff'; g.fillRect(0, 0, S, S);
      for (let k = 0; k < 160; k++) {
        const x = r() * S, y = r() * S, rad = 2 + r() * 7;
        g.strokeStyle = '#ffffffcc'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, rad, 0, 7); g.stroke();
        h.fillStyle = '#b0b0b0'; h.beginPath(); h.arc(x, y, rad, 0, 7); h.fill();
      }
    }, repeat, 2);
    case 'water': return pair(256, (g, h, S) => {
      g.fillStyle = '#3d7fb0'; g.fillRect(0, 0, S, S);
      for (let k = 0; k < 60; k++) {
        const x = r() * S, y = r() * S, rad = 10 + r() * 40;
        const gr = h.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, '#c0c0c0'); gr.addColorStop(0.5, '#808080'); gr.addColorStop(0.7, '#a0a0a0'); gr.addColorStop(1, '#80808000');
        h.fillStyle = gr; h.beginPath(); h.arc(x, y, rad, 0, 7); h.fill();
      }
    }, repeat, 3);
    case 'marble': return pair(512, (g, h, S) => {
      // losas de mármol pulido con vetas
      const n = 2, s = S / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const dark = (i + j) % 2;
        g.fillStyle = dark ? '#cbc3b4' : '#ebe7df'; g.fillRect(i * s, j * s, s, s);
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = dark ? `rgba(220,220,230,${0.08 + r() * 0.12})` : `rgba(90,90,100,${0.06 + r() * 0.12})`;
          g.lineWidth = 0.6 + r() * 2.2;
          g.beginPath(); let x = i * s + r() * s, y = j * s;
          g.moveTo(x, y);
          for (let q = 0; q < 6; q++) { x += (r() - 0.4) * 50; y += s / 6; g.lineTo(x, y); }
          g.stroke();
        }
      }
      g.fillStyle = '#9a8f78'; h.fillStyle = '#404040';
      for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1.5, 0, 3, S); g.fillRect(0, i * s - 1.5, S, 3); h.fillRect(i * s - 2, 0, 4, S); h.fillRect(0, i * s - 2, S, 4); }
    }, repeat, 2);
    case 'sand': return pair(512, (g, h, S) => {
      g.fillStyle = '#e2c48c'; g.fillRect(0, 0, S, S);
      for (let k = 0; k < 40; k++) { g.fillStyle = `hsla(${38 + r() * 8},${45 + r() * 20}%,${62 + r() * 16}%,0.35)`; g.beginPath(); g.ellipse(r() * S, r() * S, 30 + r() * 80, 20 + r() * 50, r() * 3, 0, 7); g.fill(); }
      for (let k = 0; k < 14000; k++) { const l = 55 + r() * 35; g.fillStyle = `hsl(${35 + r() * 12}, 40%, ${l}%)`; g.fillRect(r() * S, r() * S, 1.2, 1.2); }
      // ondas del viento y huellas
      for (let k = 0; k < 22; k++) { const y = r() * S; h.strokeStyle = '#a0a0a0'; h.lineWidth = 6; h.beginPath(); h.moveTo(0, y); for (let x = 0; x <= S; x += 32) h.lineTo(x, y + Math.sin(x * 0.03 + k) * 8); h.stroke(); }
    }, repeat, 2);
    case 'rubber': return pair(256, (g, h, S) => {
      // losetas de caucho de parque infantil
      const cols = ['#d84343', '#3f7fd8', '#3fae5a', '#e6a52b'];
      const n = 2, s = S / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        g.fillStyle = cols[(i * 2 + j + (i ^ j)) % 4]; g.fillRect(i * s, j * s, s, s);
        for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.18})`; g.fillRect(i * s + r() * s, j * s + r() * s, 1.5, 1.5); h.fillStyle = r() > 0.5 ? '#909090' : '#707070'; h.fillRect(i * s + r() * s, j * s + r() * s, 2, 2); }
      }
      g.fillStyle = '#222'; h.fillStyle = '#404040';
      for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1, 0, 2, S); g.fillRect(0, i * s - 1, S, 2); h.fillRect(i * s - 2, 0, 4, S); h.fillRect(0, i * s - 2, S, 4); }
    }, repeat, 2);
    case 'cardboard': return pair(256, (g, h, S) => {
      g.fillStyle = '#c69c62'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < S; i += 8) { g.fillStyle = i % 16 ? '#bf9358' : '#cda46b'; g.fillRect(0, i, S, 4); h.fillStyle = i % 16 ? '#909090' : '#707070'; h.fillRect(0, i, S, 4); }
      g.fillStyle = '#00000022'; g.fillRect(S * 0.45, 0, 6, S);
      g.fillStyle = '#7a4a1a'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('↑ FRÁGIL', S / 2, S / 2);
    }, repeat, 2);
    case 'plank': return pair(256, (g, h, S) => {
      for (let i = 0; i < 4; i++) {
        g.fillStyle = `hsl(32, ${40 + r() * 15}%, ${48 + r() * 10}%)`; g.fillRect(i * S / 4, 0, S / 4, S);
        for (let k = 0; k < 20; k++) { g.fillStyle = '#5a361622'; g.fillRect(i * S / 4 + r() * S / 4, 0, 1 + r() * 2, S); }
        h.fillStyle = '#303030'; h.fillRect(i * S / 4, 0, 3, S); g.fillStyle = '#3b2210'; g.fillRect(i * S / 4, 0, 2, S);
      }
      g.fillStyle = '#444'; for (const y of [20, S - 20]) for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * S / 4 + S / 8, y, 4, 0, 7); g.fill(); }
    }, repeat, 2);
  }
  return null;
}

// ---------- Superficies especiales (barro, suelo mojado, cera, agua) ----------
// Devuelve { map, normalMap, roughnessMap, alphaMap }. Las texturas se repiten a lo largo (v) del parche;
// los bordes laterales (u≈0 y u≈1) son irregulares en el alphaMap para que no parezca un rectángulo pegado.
function noise2(seed) {
  // ruido de valor 2D repetible (periodo 1) con octavas
  const r = rnd(seed), G = 128, grid = Array.from({ length: G * G }, () => r());
  const v = (x, y) => grid[(((y % G) + G) % G) * G + (((x % G) + G) % G)];
  const sm = (t) => t * t * (3 - 2 * t);
  const one = (x, y, f) => {
    const X = x * f, Y = y * f, xi = Math.floor(X), yi = Math.floor(Y), tx = sm(X - xi), ty = sm(Y - yi);
    const m = f; // periodo
    const g = (a, b) => v(((a % m) + m) % m + 0, ((b % m) + m) % m + 0);
    return (g(xi, yi) * (1 - tx) + g(xi + 1, yi) * tx) * (1 - ty) + (g(xi, yi + 1) * (1 - tx) + g(xi + 1, yi + 1) * tx) * ty;
  };
  return (x, y, oct = 4, f0 = 4) => { let s = 0, a = 0.5, n = 0; for (let o = 0; o < oct; o++) { s += one(x, y, f0 << o) * a; n += a; a *= 0.5; } return s / n; };
}
function px(size, fn) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = fn(x / size, y / size), i = (y * size + x) * 4;
    d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
const edge = (u, n, w = 0.1) => { // 0 fuera, 1 dentro, con borde ondulado
  const d = Math.min(u, 1 - u);
  return Math.max(0, Math.min(1, (d - w * (0.35 + n * 0.9)) / 0.03));
};
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (t) => Math.max(0, Math.min(1, t));

const surfCache = new Map();
export function surfaceTex(kind, repeat = [1, 3]) {
  if (!surfCache.has(kind)) surfCache.set(kind, buildSurface(kind));
  const s = surfCache.get(kind), out = {};
  for (const k in s) {
    const t = new THREE.CanvasTexture(s[k].canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.anisotropy = 8;
    if (s[k].srgb) t.colorSpace = THREE.SRGBColorSpace;
    out[k] = t;
  }
  return out;
}

function buildSurface(kind) {
  const S = 256;
  const n1 = noise2(kind.length * 31 + 1), n2 = noise2(kind.length * 17 + 5), n3 = noise2(kind.length * 7 + 9);
  const H = new Float32Array(S * S);
  let col, rough, alpha;
  if (kind === 'mud') {
    // barro húmedo: charcos brillantes, grumos, roderas con dibujo de neumático
    const ruts = [0.3, 0.7];
    col = px(S, (u, v) => {
      const a = n1(u, v, 5, 3), b = n2(u, v, 3, 8), c = n3(u, v, 2, 24);
      let rut = 0;
      for (const r of ruts) { const d = Math.abs(u - r - (n2(0.5, v, 2, 2) - 0.5) * 0.06); rut = Math.max(rut, clamp01(1 - d / 0.06)); }
      const tread = rut * (Math.sin(v * 160 + (u > 0.5 ? 1 : 0)) > 0.2 ? 1 : 0.55);
      const pool = clamp01((a - 0.58) / 0.06);
      const dry = clamp01((b - 0.62) / 0.1) * (1 - pool);
      let k = mixc([88, 60, 38], [58, 38, 22], clamp01(a * 1.4 - 0.2));
      k = mixc(k, [128, 98, 70], dry * 0.8);
      k = mixc(k, [44, 30, 18], tread * 0.7);
      k = mixc(k, [36, 26, 18], pool * 0.85);
      const pebble = c > 0.78 ? (c - 0.78) * 4 : 0;
      k = mixc(k, [120, 110, 98], clamp01(pebble) * (1 - pool));
      const j = (b - 0.5) * 18;
      H[Math.floor(v * S) * S + Math.floor(u * S)] = 0.5 + (c - 0.5) * 0.5 - rut * 0.35 - pool * 0.3 + pebble * 0.6 + (Math.sin(v * 160) > 0.2 ? rut * 0.12 : 0);
      return [k[0] + j, k[1] + j * 0.8, k[2] + j * 0.6];
    });
    rough = px(S, (u, v) => { const pool = clamp01((n1(u, v, 5, 3) - 0.58) / 0.06), dry = clamp01((n2(u, v, 3, 8) - 0.62) / 0.1); const r = 0.42 - pool * 0.36 + dry * 0.45; return [0, r * 255, 0]; });
    alpha = px(S, (u, v) => { const e = edge(u, n3(u * 0.3, v, 3, 6), 0.09); const bite = clamp01((n2(u, v * 0.5, 2, 3) - 0.18) / 0.05); const a = e * (0.55 + 0.45 * bite); return [a * 255, a * 255, a * 255]; });
  } else if (kind === 'wet') {
    // suelo recién fregado: película de agua con charcos, pasadas de fregona y espuma
    col = px(S, (u, v) => {
      const foam = n3(u, v, 2, 28) > 0.82 ? 1 : 0;
      H[Math.floor(v * S) * S + Math.floor(u * S)] = 0.5 + (n2(u, v, 4, 10) - 0.5) * 0.4 + foam * 0.3;
      return foam ? [235, 245, 250] : mixc([92, 118, 138], [128, 156, 176], n2(u, v, 3, 4));
    });
    rough = px(S, (u, v) => [0, (0.03 + n3(u, v, 2, 28) * 0.05) * 255, 0]);
    alpha = px(S, (u, v) => {
      const film = clamp01((n1(u, v, 5, 3) - 0.36) / 0.08);
      const mop = 0.5 + 0.5 * Math.sin((u * 9 + Math.sin(v * 12.566) * 1.2) * 6.283);
      const foam = n3(u, v, 2, 28) > 0.82 ? 0.9 : 0;
      const a = Math.max(foam, film * (0.5 + mop * 0.25)) * edge(u, n2(u * 0.3, v, 3, 5), 0.07);
      return [a * 255, a * 255, a * 255];
    });
  } else if (kind === 'wax') {
    // cera recién dada: brillo con remolinos de abrillantadora
    col = px(S, (u, v) => { H[Math.floor(v * S) * S + Math.floor(u * S)] = 0.5; return mixc([255, 236, 190], [255, 250, 232], n2(u, v, 2, 6)); });
    rough = px(S, (u, v) => [0, (0.02 + n2(u, v, 3, 6) * 0.08) * 255, 0]);
    alpha = px(S, (u, v) => {
      let sw = 0;
      for (const [cx, cy, rr] of [[0.3, 0.25, 0.2], [0.7, 0.55, 0.24], [0.35, 0.82, 0.18], [0.75, 0.05, 0.15]]) {
        const d = Math.hypot(u - cx, (((v - cy + 1.5) % 1) - 0.5)) / rr;
        if (d < 1.4) sw = Math.max(sw, (0.5 + 0.5 * Math.sin(d * 40 + n1(u, v, 2, 4) * 6)) * clamp01(1.4 - d));
      }
      const a = (0.26 + sw * 0.42 + (n1(u, v, 4, 3) - 0.5) * 0.25) * edge(u, n3(u * 0.3, v, 3, 5), 0.06);
      return [a * 255, a * 255, a * 255];
    });
  } else if (kind === 'sand') {
    // arenero: arena suelta con montoncitos y huellas
    col = px(S, (u, v) => {
      const a = n1(u, v, 4, 4), c = n3(u, v, 2, 26);
      H[Math.floor(v * S) * S + Math.floor(u * S)] = 0.5 + (a - 0.5) * 0.8 + (c - 0.5) * 0.2;
      const k = mixc([214, 182, 128], [236, 212, 160], a);
      const j = (c - 0.5) * 30;
      return [k[0] + j, k[1] + j, k[2] + j * 0.8];
    });
    rough = px(S, () => [0, 0.95 * 255, 0]);
    alpha = px(S, (u, v) => { const e = edge(u, n2(u * 0.3, v, 3, 6), 0.08); return [e * 255, e * 255, e * 255]; });
  } else if (kind === 'water') {
    // agua: fondo oscuro con reflejos; el brillo lo pone el mapa de entorno
    col = px(S, (u, v) => { H[Math.floor(v * S) * S + Math.floor(u * S)] = n1(u, v, 4, 6) * 0.8 + n2(u, v, 3, 14) * 0.2; return mixc([28, 62, 82], [52, 98, 118], n2(u, v, 3, 3)); });
    rough = px(S, () => [0, 0.03 * 255, 0]);
    alpha = px(S, () => [255, 255, 255]);
  }
  // normales desde la altura
  const hc = document.createElement('canvas'); hc.width = hc.height = S;
  const hg = hc.getContext('2d'), img = hg.createImageData(S, S);
  for (let i = 0; i < S * S; i++) { const v = clamp01(H[i]) * 255; img.data.set([v, v, v, 255], i * 4); }
  hg.putImageData(img, 0, 0);
  const strength = { mud: 6, wet: 1.5, wax: 0.5, water: 4, sand: 5 }[kind];
  return {
    map: { canvas: col, srgb: true }, normalMap: { canvas: normalFromHeight(hc, strength) },
    roughnessMap: { canvas: rough }, alphaMap: { canvas: alpha },
  };
}
