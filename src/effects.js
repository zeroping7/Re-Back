import * as THREE from 'three';

// ---------- Partículas (puntos con shader: tamaño y transparencia por partícula) ----------
const VS = `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
varying float vAlpha; varying vec3 vColor;
uniform float uScale;
void main() {
  vAlpha = aAlpha; vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FS = `
varying float vAlpha; varying vec3 vColor;
uniform float uSoft;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float a = vAlpha * mix(1.0, smoothstep(1.0, 0.0, d), uSoft);
  gl_FragColor = vec4(vColor, a);
}`;

export class Particles {
  constructor(scene, max, { additive = false, soft = 1 } = {}) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.p = Array.from({ length: max }, () => ({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, s0: 1, s1: 1, a0: 1, grav: 0, drag: 0 }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: { value: 400 }, uSoft: { value: soft } },
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.next = 0;
  }

  setViewport(h) { this.material.uniforms.uScale.value = h * 0.9; }

  emit(x, y, z, vx, vy, vz, { life = 1, size = 1, size1 = size * 3, alpha = 0.5, color = [1, 1, 1], grav = 0, drag = 1 } = {}) {
    const i = this.next; this.next = (this.next + 1) % this.max;
    const p = this.p[i];
    p.life = life; p.max = life; p.vx = vx; p.vy = vy; p.vz = vz; p.s0 = size; p.s1 = size1; p.a0 = alpha; p.grav = grav; p.drag = drag;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.col[i * 3] = color[0]; this.col[i * 3 + 1] = color[1]; this.col[i * 3 + 2] = color[2];
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.p[i];
      if (p.life <= 0) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      p.life -= dt;
      const k = 1 - Math.max(0, p.life) / p.max; // 0 → 1
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vz *= d; p.vy = p.vy * d - p.grav * dt;
      this.pos[i * 3] += p.vx * dt; this.pos[i * 3 + 1] += p.vy * dt; this.pos[i * 3 + 2] += p.vz * dt;
      if (this.pos[i * 3 + 1] < 0.02 && p.grav > 0) { this.pos[i * 3 + 1] = 0.02; p.vy *= -0.4; }
      this.size[i] = p.s0 + (p.s1 - p.s0) * k;
      this.alpha[i] = p.a0 * (1 - k) * Math.min(1, k * 8 + 0.3);
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true; a.aSize.needsUpdate = true; a.aAlpha.needsUpdate = true; a.aColor.needsUpdate = true;
  }
}

const TIRE = [0.06, 0.05, 0.05];

// ---------- Marcas de derrape (cinta con búfer circular) ----------
export class SkidMarks {
  // FIS-35: tiras continuas por rueda. No se cortan: entran y salen difuminadas, toleran parpadeos cortos
  // de la intensidad, van por encima de las cintas de pista y las más viejas se desvanecen poco a poco.
  constructor(scene, maxQuads = 1600) {
    this.max = maxQuads;
    this.pos = new Float32Array(maxQuads * 4 * 3);
    this.alpha = new Float32Array(maxQuads * 4);
    this.col = new Float32Array(maxQuads * 4 * 3);
    this.birth = new Float32Array(maxQuads * 4);
    const idx = new Uint32Array(maxQuads * 6);
    for (let i = 0; i < maxQuads; i++) {
      const v = i * 4;
      idx.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aCol', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aBirth', new THREE.BufferAttribute(this.birth, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.uNow = { value: 0 };
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      uniforms: { uNow: this.uNow, uMax: { value: maxQuads } },
      vertexShader: `attribute float aAlpha; attribute vec3 aCol; attribute float aBirth; uniform float uNow; uniform float uMax;
        varying float vA; varying vec3 vC;
        void main(){ float age = uNow - aBirth; vA = aAlpha * (1.0 - smoothstep(uMax * 0.6, uMax * 0.97, age)); vC = aCol;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying float vA; varying vec3 vC; void main(){ if (vA < 0.004) discard; gl_FragColor = vec4(vC, vA); }`,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.next = 0; this.count = 0;
    this.last = [];
  }

  quad(last, cur, color) {
    const i = this.next; this.next = (this.next + 1) % this.max;
    this.count++;
    this.pos.set([last.lx, last.y, last.lz, last.rx, last.y, last.rz, cur.lx, cur.y, cur.lz, cur.rx, cur.y, cur.rz], i * 12);
    this.alpha.set([last.a, last.a, cur.a, cur.a], i * 4);
    this.birth.fill(this.count, i * 4, i * 4 + 4);
    for (let v = 0; v < 4; v++) this.col.set(color, (i * 4 + v) * 3);
    const g = this.mesh.geometry.attributes;
    g.position.needsUpdate = true; g.aAlpha.needsUpdate = true; g.aCol.needsUpdate = true; g.aBirth.needsUpdate = true;
    this.uNow.value = this.count;
  }

  // Llamar cada paso por rueda: punto de contacto, dirección lateral, intensidad (0 = sin marca)
  // color: [r,g,b] (por defecto goma), lift: altura extra (para pintar encima de parches)
  add(wheel, point, side, strength, width = 0.28, color = TIRE, lift = 0) {
    let last = this.last[wheel];
    const a = Math.min(0.6, Math.max(0, strength));
    // salto grande (recolocar, otro sitio): empezar tira nueva
    if (last && (point.x - last.x) ** 2 + (point.z - last.z) ** 2 > 9) last = this.last[wheel] = null;
    if (a <= 0) {
      if (!last) return;
      // sin marca: aguantar un instante (evita cortes por parpadeo) y luego cerrar con un final difuminado
      last.off = (last.off || 0) + 1;
      if (last.off < 6) return;
      if (last.a > 0) {
        const end = this.point(point, side, width, lift, 0);
        if ((point.x - last.x) ** 2 + (point.z - last.z) ** 2 > 0.01) this.quad(last, end, last.color || color);
      }
      this.last[wheel] = null;
      return;
    }
    const cur = this.point(point, side, width, lift, a);
    cur.color = color;
    if (!last) { cur.a = 0; this.last[wheel] = cur; return; } // empieza difuminada
    const dx = point.x - last.x, dz = point.z - last.z;
    if (dx * dx + dz * dz < 0.09) { last.off = 0; return; } // espera a moverse
    // suavizar la intensidad entre tramos para que no haya escalones
    cur.a = last.a + (a - last.a) * 0.5;
    this.quad(last, cur, color);
    this.last[wheel] = cur;
  }

  point(p, side, width, lift, a) {
    return { x: p.x, z: p.z, y: p.y + 0.075 + lift, lx: p.x + side.x * width / 2, lz: p.z + side.z * width / 2, rx: p.x - side.x * width / 2, rz: p.z - side.z * width / 2, a, off: 0 };
  }
}

// ---------- Ondas en el agua (anillos que se abren y se desvanecen) ----------
export class Ripples {
  constructor(scene, max = 48) {
    const geo = new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2);
    this.items = Array.from({ length: max }, () => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: 0, depthWrite: false }));
      m.visible = false; m.renderOrder = 2; scene.add(m);
      return { m, t: 0, life: 1, r0: 0.3, r1: 2 };
    });
    this.next = 0;
  }
  emit(x, y, z, { r0 = 0.3, r1 = 2.5, life = 0.9, alpha = 0.55 } = {}) {
    const it = this.items[this.next]; this.next = (this.next + 1) % this.items.length;
    Object.assign(it, { t: 0, life, r0, r1, a: alpha });
    it.m.position.set(x, y, z); it.m.visible = true;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.m.visible) continue;
      it.t += dt;
      const k = it.t / it.life;
      if (k >= 1) { it.m.visible = false; continue; }
      const e = 1 - (1 - k) * (1 - k);
      it.m.scale.setScalar(it.r0 + (it.r1 - it.r0) * e);
      it.m.material.opacity = it.a * (1 - k);
    }
  }
}
