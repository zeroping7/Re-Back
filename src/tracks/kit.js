import * as THREE from 'three';
import { groundTex, surfaceTex } from '../textures.js';
import { room, mat, BARRIER_GROUPS } from './common.js';

// Piezas comunes de los circuitos de Drift y Obstáculos (specs/11-disciplinas.md)

export function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Habitación cerrada con suelo con relieve. Devuelve el material del suelo y sus UV (para cuestas y rampas).
export function indoor(B, R, { floor = 'tile', repeat, color = '#ffffff', roughness = 0.3, metalness = 0, wall = '#e8e2d4', baseboard } = {}) {
  const tx = groundTex(floor, repeat || [R.x / 5, R.z / 5]);
  const floorMat = new THREE.MeshStandardMaterial({ map: tx.map, normalMap: tx.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness, metalness, color });
  room(B, { x: R.x, z: R.z, h: R.h, floor: floorMat, wall: new THREE.MeshStandardMaterial({ color: wall, roughness: 0.92 }), baseboard });
  const groundUV = (x, z) => [(x + R.x) / (R.x * 2), (R.z - z) / (R.z * 2)];
  return { floorMat, groundUV };
}

// Ventana luminosa en la pared del fondo
export function windowWall(B, R, x = 0, w = 30, sky = '#bfe3ff') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 15), new THREE.MeshBasicMaterial({ color: sky }));
  m.position.set(x, 15, -R.z + 0.05); B.scene.add(m);
  for (const [bw, bh, bx, by] of [[w + 1, 0.8, x, 22.9], [w + 1, 0.8, x, 7.1], [0.8, 16, x - w / 2, 15], [0.8, 16, x + w / 2, 15], [0.5, 16, x, 15]]) {
    B.box(bw, bh, 0.6, bx, by, -R.z + 0.3, '#ffffff', { solid: false, shadow: false });
  }
}

// Coloca un objeto de radio r cerca de (x, z) sin pisar la pista
export function placer(circuit) {
  return (x, z, r, fn) => { const p = circuit.spot(x, z, r); if (p) fn(p[0], p[1]); return !!p; };
}

// ---------- Obstáculos (OBS-01) ----------
// Todo se calcula en unidades de diseño al construir; los avisos para la IA (hazards) van en unidades del mundo.
export function obstacleKit(B, circuit) {
  const { scene, RAPIER, S, MX } = B;
  const W = circuit.width, N = circuit.N, samples = circuit.samples;
  const hazards = [], zones = [], steppers = [], visuals = [];
  const avoid = () => [...circuit.elev.map((e) => [e.i0, e.i1]), [N - 10, 10], ...used];
  const used = [];
  const world = (v, y = 0) => new THREE.Vector3(v.x * S * MX, y * S, v.z * S);

  // tramo recto cerca de una fracción de la vuelta; reserva `len` muestras
  function frame(frac, len = 6, lat = 0) {
    const i = circuit.straightest(frac - 0.025, frac + 0.025, 3, len + 3, avoid());
    used.push([i - 2, i + len + 2]);
    return at(i, lat);
  }
  function at(i, lat = 0) {
    const s = samples[((i % N) + N) % N];
    return { i: s.i, p: s.p.clone().addScaledVector(s.n, lat), c: s.p.clone(), n: s.n.clone(), t: s.t.clone(), h: s.h, yaw: Math.atan2(s.t.x, s.t.z) };
  }

  // Eslalon: postes alternos a izquierda y derecha
  function slalom(frac, { n = 4, gap = 4, lat = 0.32, r = 0.9, h = 2.6, make } = {}) {
    const f0 = frame(frac, n * gap);
    for (let k = 0; k < n; k++) {
      const f = at(f0.i + k * gap, (k % 2 ? -1 : 1) * lat * W / 2);
      if (make) make(f, k);
      else B.cyl(r, r, h, f.p.x, f.h + h / 2, f.p.z, k % 2 ? '#ffd23f' : '#e53935', { seg: 8, phys: { groups: BARRIER_GROUPS, restitution: 0.4 } });
      if (make) B.collider(RAPIER.ColliderDesc.cylinder(h / 2, r), { x: f.p.x, y: f.h + h / 2, z: f.p.z }, null, { groups: BARRIER_GROUPS, restitution: 0.4 });
      hazards.push({ pos: world(f.p), r: (r + 0.25) * S, slow: 14, lat: (k % 2 ? -1 : 1) * lat });
    }
  }

  // Barrera que va y viene de lado a lado
  function slider(frac, { amp = 0.52, period = 3.2, phase = 0, w = 2.2, h = 1.3, d = 1.3, color = '#ef5350', mesh } = {}) {
    const f = frame(frac, 4);
    const m = mesh || new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    const k = B.kin(m, RAPIER.ColliderDesc.cuboid(w / 2 * S, h / 2 * S, d / 2 * S));
    const hz = { pos: world(f.c), r: (w / 2 + 0.3) * S, slow: 13, lat: 0 };
    hazards.push(hz);
    const move = (t, init) => {
      const o = Math.sin((t / period) * Math.PI * 2 + phase) * amp * W / 2;
      const x = f.c.x + f.n.x * o, z = f.c.z + f.n.z * o;
      k.set(x, f.h + h / 2 + 0.05, z, f.yaw, init);
      hz.pos.set(x * S * MX, 0, z * S); hz.lat = o / (W / 2);
    };
    move(0, true); steppers.push(move);
    return f;
  }

  // Barra giratoria sobre un pivote en el centro de la pista
  function spinner(frac, { arm = 0.56, period = 4.5, dir = 1, color = '#ffd23f', thick = 0.5 } = {}) {
    const f = frame(frac, 5);
    const len = arm * W;
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(len, thick, thick * 1.4), mat(color)));
    for (const sd of [-1, 1]) { const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, thick + 0.06, thick * 1.4 + 0.06), mat('#263238')); tip.position.x = sd * (len / 2 - 0.25); g.add(tip); }
    const k = B.kin(g, RAPIER.ColliderDesc.cuboid(len / 2 * S, thick / 2 * S, thick * 0.7 * S));
    B.cyl(0.4, 0.55, 0.9, f.c.x, f.h + 0.45, f.c.z, '#b0bec5', { seg: 10, phys: { groups: BARRIER_GROUPS } });
    hazards.push({ pos: world(f.c), r: len * 0.47 * S, slow: 12, lat: 0 });
    const move = (t, init) => k.set(f.c.x, f.h + 0.62, f.c.z, f.yaw + dir * (t / period) * Math.PI * 2, init);
    move(0, true); steppers.push(move);
    return f;
  }

  // Badenes: cilindros tumbados que hay que pasar por encima (las ruedas sí los pisan)
  function bumps(frac, { n = 3, gap = 2, r = 0.55, sink = 0.2, color = '#fbc02d' } = {}) {
    const f0 = frame(frac, n * gap);
    for (let k = 0; k < n; k++) {
      const f = at(f0.i + k * gap);
      B.cyl(r, r, W, f.c.x, f.h + r - sink - r, f.c.z, typeof color === 'function' ? color(k) : color, { seg: 10, rot: [0, f.yaw, Math.PI / 2], phys: { friction: 0.9 } });
    }
    hazards.push({ pos: world(f0.c), r: 0, slow: 12 });
    return f0;
  }

  // Zona que empuja de lado (ventilador o chorro de agua). side: de qué lado viene (+1 = izquierda de la marcha)
  function push(frac, { side = 1, force = 34, r = 4.2, surface = null, pulse = 0 } = {}) {
    const f = frame(frac, 6);
    const dir = f.n.clone().multiplyScalar(-side);
    zones.push({ pos: f.c.clone().setY(f.h), r, effect: 'push', dir, force, surface, on: pulse ? (t) => (Math.sin((t / pulse) * Math.PI * 2) > -0.3 ? 1 : 0) : null });
    hazards.push({ pos: world(f.c), r: 0, slow: 15 });
    return { ...f, side, dir, edge: f.c.clone().addScaledVector(f.n, side * (W / 2 + 2.6)) };
  }

  // Ventilador de sobremesa que sopla hacia la pista
  function fan(frac, opts = {}) {
    const f = push(frac, opts);
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 0.6, 12), mat('#455a64')); base.position.y = 0.3; g.add(base);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 8), mat('#607d8b')); neck.position.y = 2; g.add(neck);
    const cage = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.16, 6, 20), mat('#cfd8dc')); cage.position.set(0, 4.2, 0.4); g.add(cage);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 10).rotateX(Math.PI / 2), mat('#37474f')); hub.position.set(0, 4.2, 0); g.add(hub);
    const blades = new THREE.Group();
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 0.08), mat('#4fc3f7')); b.position.x = 1.15; const h = new THREE.Group(); h.rotation.z = (k / 4) * Math.PI * 2; h.add(b); blades.add(h); }
    blades.position.set(0, 4.2, 0.4); g.add(blades);
    g.position.set(f.edge.x, f.h, f.edge.z);
    g.rotation.y = Math.atan2(f.dir.x, f.dir.z);
    g.traverse((o) => { o.userData.dynamic = true; o.castShadow = true; });
    scene.add(g);
    B.collider(RAPIER.ColliderDesc.cylinder(2.5, 1.8), { x: f.edge.x, y: 2.5, z: f.edge.z }, null, { groups: BARRIER_GROUPS });
    visuals.push((t) => { blades.rotation.z = t * 14; });
    return f;
  }

  // Cascada: chorro que cae al lado y cruza la pista arrastrando el coche
  function waterfall(frac, opts = {}) {
    const f = push(frac, { surface: 'water', force: 30, r: 4.4, ...opts });
    const r = opts.r ?? 4.4;
    const wt = surfaceTex('water', [1, 2]);
    const flow = new THREE.MeshStandardMaterial({ color: '#9fdcff', emissive: '#3aa0d8', emissiveIntensity: 0.25, map: wt.map, normalMap: wt.normalMap, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    // lámina de agua que cruza la pista
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W + 5, r * 1.5).rotateX(-Math.PI / 2), flow);
    sheet.position.set(f.c.x, f.h + 0.07, f.c.z); sheet.rotation.y = f.yaw + Math.PI / 2; sheet.userData.dynamic = true; sheet.receiveShadow = true;
    scene.add(sheet);
    // caída desde lo alto
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.3, 9), new THREE.MeshStandardMaterial({ color: '#e6f6ff', emissive: '#7cc8f0', emissiveIntensity: 0.5, map: wt.map, roughness: 0.1, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
    fall.position.set(f.edge.x, f.h + 4.5, f.edge.z); fall.rotation.y = f.yaw; fall.userData.dynamic = true;
    scene.add(fall);
    // caño del que sale
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, r * 1.5, 10).rotateX(Math.PI / 2), mat('#b0bec5', { metalness: 0.8, roughness: 0.25 }));
    spout.position.set(f.edge.x, f.h + 9.2, f.edge.z); spout.rotation.y = f.yaw; spout.castShadow = true; scene.add(spout);
    const foam = new THREE.Mesh(new THREE.CircleGeometry(1.8, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
    foam.position.set(f.edge.x, f.h + 0.1, f.edge.z); foam.userData.dynamic = true; scene.add(foam);
    visuals.push((t) => { wt.map.offset.y = t * 0.9; wt.normalMap.offset.y = t * 0.9; foam.scale.setScalar(1 + Math.sin(t * 9) * 0.12); });
    return f;
  }

  return {
    frame, at, slalom, slider, spinner, bumps, push, fan, waterfall, hazards, zones,
    step: (t) => { for (const f of steppers) f(t, false); },
    update: (t) => { for (const f of visuals) f(t); },
  };
}
