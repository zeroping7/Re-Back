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
