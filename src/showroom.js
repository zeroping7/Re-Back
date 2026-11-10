import * as THREE from 'three';
import { buildCarModel } from './carModel.js';
import { carById } from './cars.js';
import { groundTex, canTexture } from './textures.js';

// Taller de juguetes detrás de los menús (UX-03): el coche gira en una peana encima de un banco de trabajo
// gigante, con herramientas colgadas, una lámpara cálida y cámara que se mueve despacio entre "sitios".
const VIEWS = {
  // off = cuánto se desplaza la imagen a la derecha (fracción del ancho) para que el sujeto quede en la zona libre
  main: { pos: [-4.6, 3.6, 10.6], look: [1.4, 1.5, -1.5], drift: 0.9, off: 0.18 },
  // car: paneles en el 58 % izquierdo; el coche se centra en el 42 % derecho (centro al 79 % del ancho)
  car: { pos: [-2.3, 1.45, 5.7], look: [0, 0.15, 0], drift: 0.45, off: 0.29 },
  podium: { pos: [0, 3.1, 10.8], look: [0, 1.0, -0.5], drift: 0.35, off: 0.18 },
};
// Ángulo con el que arranca la peana: el frente del coche (+z) se ve en 3/4 desde la cámara
const FRONT_34 = 0.23;

export class Showroom {
  constructor(envMap) {
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color('#0d1230');
    scene.fog = new THREE.Fog('#0d1230', 26, 70);
    scene.environment = envMap;
    scene.environmentIntensity = 0.45;
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.view = 'main';
    this.camPos = new THREE.Vector3(...VIEWS.main.pos);
    this.camLook = new THREE.Vector3(...VIEWS.main.look);
    this.t = 0;
    this.leds = [];
    this.views = VIEWS;
    this.spinT0 = 0;
    this.offX = VIEWS.main.off;
    this.w = 1; this.h = 1; this.dirty = true;

    // ---------- Luces ----------
    scene.add(new THREE.HemisphereLight('#c9d6ff', '#4a3524', 0.55));
    const lamp = (this.lamp = new THREE.SpotLight('#ffd9a0', 420, 0, 0.62, 0.55, 2));
    lamp.position.set(2.2, 8.6, 1.2);
    lamp.target.position.set(0, -0.5, 0);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.0005; lamp.shadow.normalBias = 0.02;
    scene.add(lamp, lamp.target);
    const rim = new THREE.DirectionalLight('#7fa8ff', 1.6);
    rim.position.set(-6, 5, -8);
    scene.add(rim);
    const back = new THREE.PointLight('#ff8a3d', 60, 30, 2);
    back.position.set(7, 4, -5);
    scene.add(back);

    // ---------- Banco de trabajo y pared ----------
    const wood = groundTex('plank', [6, 4]);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(44, 1, 22), new THREE.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, roughness: 0.75, color: '#c79a6a' }));
    bench.position.set(0, -1.25, -1);
    bench.receiveShadow = true;
    scene.add(bench);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 22), new THREE.MeshStandardMaterial({ map: pegboardTexture(), roughness: 0.9 }));
    wall.position.set(0, 9.5, -8);
    wall.receiveShadow = true;
    scene.add(wall);

    // ---------- Herramientas gigantes colgadas ----------
    const steel = new THREE.MeshStandardMaterial({ color: '#b8c2cc', metalness: 0.9, roughness: 0.28 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2b2f36', metalness: 0.6, roughness: 0.45 });
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, shadow = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
      m.castShadow = shadow; m.receiveShadow = true;
      scene.add(m);
      return m;
    };
    // llave fija
    const wrench = new THREE.Group();
    wrench.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 6.5, 0.28), steel));
    for (const y of [3.6, -3.6]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.32, 8, 16, Math.PI * 1.55), steel);
      ring.position.y = y; ring.rotation.z = y > 0 ? Math.PI * 0.72 : -Math.PI * 0.28;
      wrench.add(ring);
    }
    wrench.position.set(-9.5, 7.5, -7.6); wrench.rotation.z = 0.25;
    wrench.traverse((o) => { o.castShadow = true; });
    scene.add(wrench);
    // destornillador
    add(new THREE.CylinderGeometry(0.62, 0.7, 3.2, 8), new THREE.MeshStandardMaterial({ color: '#ffb300', roughness: 0.25, transparent: true, opacity: 0.92 }), -4.5, 9.2, -7.4, 0, 0, -0.1);
    add(new THREE.CylinderGeometry(0.16, 0.16, 4.6, 8), steel, -4.25, 5.4, -7.45, 0, 0, -0.1);
    // martillo
    add(new THREE.BoxGeometry(0.55, 5.6, 0.4), new THREE.MeshStandardMaterial({ color: '#a8743f', roughness: 0.7 }), 9.5, 7.3, -7.5, 0, 0, 0.12);
    add(new THREE.BoxGeometry(3.2, 1.15, 0.9), dark, 9.85, 10.2, -7.4, 0, 0, 0.12);
    // ganchos
    for (const [x, y] of [[-9.6, 11.4], [-4.6, 11.1], [9.7, 11.3]]) add(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6), dark, x, y, -7.7, Math.PI / 2, 0, 0, false);
    // cartel del club
    add(new THREE.PlaneGeometry(6.4, 3.6), new THREE.MeshStandardMaterial({ map: posterTexture(), roughness: 0.6 }), 3.4, 6.2, -7.9, 0, 0, 0, false);

    // ---------- Cosas sobre el banco ----------
    // caja de herramientas roja
    const red = new THREE.MeshStandardMaterial({ color: '#c62828', roughness: 0.4, metalness: 0.2 });
    add(new THREE.BoxGeometry(5, 2.2, 2.6), red, -9, 0.35, -4.2, 0, 0.25);
    add(new THREE.BoxGeometry(5.1, 0.35, 2.7), new THREE.MeshStandardMaterial({ color: '#a31515', roughness: 0.4 }), -9, 1.6, -4.2, 0, 0.25);
    add(new THREE.TorusGeometry(0.8, 0.12, 6, 12, Math.PI), dark, -9, 1.78, -4.2, 0, 0.25);
    // botes de pintura
    const can = canTexture();
    add(new THREE.CylinderGeometry(0.85, 0.85, 1.9, 16), new THREE.MeshStandardMaterial({ map: can, metalness: 0.4, roughness: 0.4 }), -5.4, 0.2, -5.2, 0, 1.2);
    add(new THREE.CylinderGeometry(0.85, 0.85, 1.9, 16), new THREE.MeshStandardMaterial({ map: can, color: '#90caf9', metalness: 0.4, roughness: 0.4 }), -3.6, 0.2, -6.1, 0, 2.5);
    // cargador de baterías con luces
    add(new THREE.BoxGeometry(3, 1.1, 1.8), new THREE.MeshStandardMaterial({ color: '#263238', roughness: 0.5 }), 1.8, -0.2, -5.6, 0, -0.15);
    for (let k = 0; k < 4; k++) {
      const led = add(new THREE.BoxGeometry(0.22, 0.14, 0.05), new THREE.MeshStandardMaterial({ color: '#111', emissive: k < 2 ? '#39ff6a' : '#ff3d3d', emissiveIntensity: 2 }), 0.95 + k * 0.45, -0.05, -4.68, 0, -0.15, 0, false);
      this.leds.push(led);
    }
    // batería suelta
    add(new THREE.BoxGeometry(2.6, 1.0, 1.15), new THREE.MeshStandardMaterial({ map: batteryTexture(), roughness: 0.35 }), 5.3, -0.25, 2.4, 0, -0.6);
    // pila de ruedas de recambio
    const rubber = new THREE.MeshStandardMaterial({ color: '#1d1d1f', roughness: 0.85 });
    const rimM = new THREE.MeshStandardMaterial({ color: '#d0d4da', metalness: 0.8, roughness: 0.3 });
    for (let k = 0; k < 3; k++) {
      const y = -0.4 + k * 0.72;
      add(new THREE.CylinderGeometry(1.15, 1.15, 0.7, 20), rubber, 7.2 + (k % 2) * 0.15, y, -2.6, 0, k);
      add(new THREE.CylinderGeometry(0.62, 0.62, 0.72, 12), rimM, 7.2 + (k % 2) * 0.15, y, -2.6, 0, k, 0, false);
    }
    // tornillo gigante tumbado
    add(new THREE.CylinderGeometry(0.75, 0.75, 0.5, 6), steel, 8.6, -0.1, 1.2, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.3, 0.3, 3.2, 10), steel, 10.4, -0.4, 1.2, 0, 0, Math.PI / 2);
    // rollo de cinta
    add(new THREE.TorusGeometry(0.85, 0.38, 10, 20), new THREE.MeshStandardMaterial({ color: '#cfd8dc', roughness: 0.6 }), -5.6, 0.45, -1.2, 0, 0.6);
    // lámpara colgante
    add(new THREE.ConeGeometry(1.5, 1.3, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#2e5d4b', metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }), 2.2, 9.2, 1.2, 0, 0, 0, false);
    add(new THREE.SphereGeometry(0.38, 12, 8), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffcf80', emissiveIntensity: 3 }), 2.2, 8.75, 1.2, 0, 0, 0, false);
    add(new THREE.CylinderGeometry(0.05, 0.05, 12, 4), dark, 2.2, 15.8, 1.2, 0, 0, 0, false);

    // ---------- Peana giratoria ----------
    this.stage = new THREE.Group();
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.25, 40), new THREE.MeshStandardMaterial({ color: '#1a2150', roughness: 0.35, metalness: 0.35 }));
    plat.position.y = -0.62; plat.receiveShadow = true; plat.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.05, 6, 64), new THREE.MeshBasicMaterial({ color: '#ff8a1f' }));
    ring.rotation.x = Math.PI / 2; ring.position.y = -0.49;
    this.turntable = new THREE.Group();
    this.stage.add(plat, ring, this.turntable);
    scene.add(this.stage);

    // ---------- Podio ----------
    this.podium = new THREE.Group();
    this.podium.visible = false;
    this.podiumCars = new THREE.Group();
    const steps = [[0, 1.5, '#ffd23f', '1'], [-2.9, 1.0, '#c0c7d0', '2'], [2.9, 0.6, '#cd7f32', '3']];
    this.podiumSlots = steps.map(([x, h, color, n]) => {
      const mats = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.3 });
      const front = new THREE.MeshStandardMaterial({ map: numberTexture(n, color), metalness: 0.3, roughness: 0.4 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.8, h, 2.8), [mats, mats, mats, mats, front, mats]);
      b.position.set(x, -0.75 + h / 2, 0); b.castShadow = true; b.receiveShadow = true;
      this.podium.add(b);
      return { x, y: -0.75 + h };
    });
    this.podium.add(this.podiumCars);
    scene.add(this.podium);
    this.confetti = makeConfetti();
    this.confetti.mesh.visible = false;
    scene.add(this.confetti.mesh);
    this.carId = null;
  }

  // Coche en la peana
  showCar(id) {
    if (id === this.carId) return;
    this.carId = id;
    this.spinT0 = this.t; // cada coche nuevo empieza girando desde el frente 3/4
    this.turntable.children.forEach(disposeTree);
    this.turntable.clear();
    this.turntable.add(carOnStand(carById(id), carById(id).color));
  }

  // Los tres primeros de la copa: [{ def, color }]
  showPodium(top3) {
    this.podiumCars.children.forEach(disposeTree);
    this.podiumCars.clear();
    top3.slice(0, 3).forEach((e, i) => {
      const def = carById(e.def), m = carOnStand(def, e.color);
      const s = this.podiumSlots[i];
      m.position.x = s.x; m.position.y += s.y + 0.5;
      m.rotation.y = i === 0 ? 0 : i === 1 ? 0.35 : -0.35;
      this.podiumCars.add(m);
    });
    this.setView('podium');
  }

  setView(v) {
    if (v !== this.view) this.spinT0 = this.t;
    this.view = v;
    const pod = v === 'podium';
    this.podium.visible = pod; this.confetti.mesh.visible = pod; this.stage.visible = !pod;
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.w = w; this.h = h; this.dirty = true;
  }

  render(renderer, dt) {
    this.t += dt;
    const t = this.t, V = VIEWS[this.view];
    this.turntable.rotation.y = FRONT_34 + (t - this.spinT0) * 0.5;
    const d = V.drift;
    const want = new THREE.Vector3(V.pos[0] + Math.sin(t * 0.13) * d, V.pos[1] + Math.sin(t * 0.09) * d * 0.3, V.pos[2] + Math.cos(t * 0.11) * d * 0.4);
    const k = 1 - Math.exp(-dt * 2.2);
    this.camPos.lerp(want, k);
    this.camLook.lerp(new THREE.Vector3(...V.look), k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    // desplazamiento lateral de la imagen según la vista (suave al cambiar de pantalla)
    const dOff = V.off - this.offX;
    if (this.dirty || Math.abs(dOff) > 0.0003) {
      this.offX = Math.abs(dOff) < 0.0003 ? V.off : this.offX + dOff * k;
      this.camera.setViewOffset(this.w, this.h, -this.w * this.offX, 0, this.w, this.h);
      this.camera.updateProjectionMatrix();
      this.dirty = false;
    }
    // luces del cargador parpadeando
    this.leds.forEach((l, i) => { l.material.emissiveIntensity = i === 1 ? (Math.sin(t * 5) > 0 ? 2.5 : 0.2) : 2; });
    if (this.confetti.mesh.visible) this.confetti.update(dt);
    renderer.render(this.scene, this.camera);
  }
}

// Liberar la memoria de la GPU de un coche que se quita (si algo compartido se vuelve a usar, three.js lo recarga)
function disposeTree(o) {
  o.traverse((m) => {
    m.geometry?.dispose();
    for (const mat of [].concat(m.material || [])) { mat.map?.dispose(); mat.dispose(); }
  });
}

export function carOnStand(def, color) {
  const W = [
    { x: def.wheelX, z: def.wheelZf, front: true }, { x: -def.wheelX, z: def.wheelZf, front: true },
    { x: def.wheelX, z: def.wheelZr, front: false }, { x: -def.wheelX, z: def.wheelZr, front: false },
  ];
  const m = buildCarModel(def, color, W, -0.02);
  const hubY = -0.02 - 0.22;
  m.userData.wheels.forEach((w) => { w.position.y = hubY; });
  m.userData.updateSuspension([hubY, hubY, hubY, hubY]);
  m.position.y = -0.5 + def.wheelR - hubY;
  return m;
}

// ---------- Texturas del taller ----------
function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function pegboardTexture() {
  const t = canvas(1024, 384, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#5d4630'); grd.addColorStop(1, '#8a6a48');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a1d12';
    for (let y = 8; y < h; y += 16) for (let x = 8 + ((y / 16) % 2) * 0; x < w; x += 16) { g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
    g.fillStyle = '#00000030';
    for (let k = 1; k < 4; k++) g.fillRect((w / 4) * k - 2, 0, 4, h);
  });
  return t;
}

function posterTexture() {
  return canvas(512, 288, (g, w, h) => {
    g.fillStyle = '#101533'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    g.save(); g.translate(w / 2, 128); g.transform(1, 0, -0.22, 1, 0, 0);
    const grd = g.createLinearGradient(0, -60, 0, 20);
    grd.addColorStop(0, '#ffe259'); grd.addColorStop(1, '#ff7a18');
    g.fillStyle = grd; g.font = '900 104px sans-serif'; g.textAlign = 'center';
    g.fillText('RE-BACK', 0, 20);
    g.restore();
    g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
    g.fillText('CLUB DE CARRERAS RC', w / 2, 200);
    g.fillStyle = '#ff8a1f'; g.font = 'bold 22px sans-serif';
    g.fillText('★ SALÓN · SÚPER · JARDÍN ★', w / 2, 240);
  });
}

function batteryTexture() {
  return canvas(256, 128, (g, w, h) => {
    g.fillStyle = '#1565c0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd23f'; g.fillRect(0, 86, w, 14);
    g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center';
    g.fillText('7,2 V', w / 2, 52);
    g.font = 'bold 18px sans-serif'; g.fillText('3000 mAh · RECARGABLE', w / 2, 78);
  });
}

function numberTexture(n, color) {
  return canvas(128, 128, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = '#00000022'; g.fillRect(0, h * 0.8, w, h * 0.2);
    g.fillStyle = '#fff'; g.strokeStyle = '#0006'; g.lineWidth = 6;
    g.font = '900 84px sans-serif'; g.textAlign = 'center';
    g.strokeText(n, w / 2, 94); g.fillText(n, w / 2, 94);
  });
}

// Confeti para el podio
function makeConfetti(n = 180) {
  const geo = new THREE.PlaneGeometry(0.16, 0.09);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const cols = ['#ffd23f', '#ff6a00', '#7dff8a', '#4fc3f7', '#ff4081', '#ffffff'];
  const P = [];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    P.push({ p: new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 10, (Math.random() - 0.5) * 6), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), s: 0.8 + Math.random() * 1.4, w: Math.random() * 6 });
    mesh.setColorAt(i, c.set(cols[i % cols.length]));
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  return {
    mesh,
    update(dt) {
      P.forEach((o, i) => {
        o.p.y -= o.s * dt; o.p.x += Math.sin(o.w += dt * 2) * dt * 0.6;
        o.r.x += dt * 3; o.r.y += dt * 2;
        if (o.p.y < -0.7) { o.p.y = 9 + Math.random() * 2; o.p.x = (Math.random() - 0.5) * 12; }
        m4.compose(o.p, q.setFromEuler(o.r), one);
        mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
