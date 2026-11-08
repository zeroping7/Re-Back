import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildTrack } from './track.js';
import { Car } from './car.js';
import { Particles, SkidMarks } from './effects.js';
import { Controls } from './controls.js';
import { Sfx } from './audio.js';
import { tuning, setupTuningPanel, onTuningChange } from './tuning.js';

const params = new URLSearchParams(location.search);
const FIXED = 1 / 60;

async function init() {
  await RAPIER.init();

  // ---------- Render ----------
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1b1d2a');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);

  // Luces: sol entrando por la ventana + cielo + lámpara cálida
  scene.add(new THREE.HemisphereLight('#e3ecff', '#8a6a4a', 0.5));
  const sun = new THREE.DirectionalLight('#fff0d6', 3.2);
  const sunOffset = new THREE.Vector3(8, 34, -26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 120;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  // ---------- Física ----------
  const world = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
  world.timestep = FIXED;

  const track = buildTrack(scene, world, RAPIER);
  const lamp = new THREE.PointLight('#ffc477', 260, 70, 1.4);
  lamp.position.set(track.lampPos.x, 18, track.lampPos.z);
  scene.add(lamp);

  const car = new Car(scene, world, RAPIER, tuning);
  car.reset(track.start.pos, track.start.yaw);
  onTuningChange(() => car.applyTuning());

  // ---------- Efectos ----------
  const smoke = new Particles(scene, 500);
  const sparks = new Particles(scene, 300, { additive: true, soft: 0.6 });
  const skids = new SkidMarks(scene);
  const sfx = new Sfx();

  // ---------- Entrada / UI ----------
  const controls = new Controls();
  const doReset = () => {
    const s = track.sampleNear(car.currPos.x, car.currPos.z);
    car.reset(s.p, track.yawOf(s.t));
    trauma = 0;
  };
  controls.onReset = doReset;
  document.getElementById('btn-reset').addEventListener('click', doReset);
  const soundBtn = document.getElementById('btn-sound');
  const syncSound = () => { soundBtn.textContent = sfx.muted ? '🔇' : '🔊'; soundBtn.classList.toggle('off', sfx.muted); };
  soundBtn.addEventListener('click', () => { sfx.setMuted(!sfx.muted); syncSound(); });
  syncSound();
  setupTuningPanel();

  let running = false;
  const startGame = async () => {
    document.getElementById('start').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    sfx.start();
    running = true;
    if (!params.has('test')) {
      try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* nada */ }
      try { await screen.orientation?.lock?.('landscape'); } catch { /* nada */ }
    }
  };
  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('loading').classList.add('hidden');
  if (params.has('test')) startGame();

  // ---------- Cámara ----------
  const camDir = new THREE.Vector3().copy(car.forward).setY(0).normalize();
  let camY = car.currPos.y + tuning.camHeight;
  let camDistNow = tuning.camDist;
  let trauma = 0;
  const carRender = new THREE.Vector3();
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), look = new THREE.Vector3();
  const rayFrom = new THREE.Vector3();
  const camRay = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });

  function updateCamera(dt, time) {
    carRender.copy(car.model.position);
    if (params.get('cam') === 'top') {
      camera.position.set(0, 120, 0.01); camera.lookAt(0, 0, 0); camera.fov = 50; camera.updateProjectionMatrix();
      return;
    }
    if (params.get('cam') === 'side') {
      camera.position.copy(carRender).add(tmp.set(4.5, 2.2, 3.5)); camera.lookAt(carRender); camera.fov = 50; camera.updateProjectionMatrix();
      return;
    }
    // dirección: morro del coche, mezclada con la velocidad al derrapar
    tmp.copy(car.forward).setY(0);
    if (tmp.lengthSq() < 0.01) tmp.copy(camDir);
    tmp.normalize();
    const vflat = tmp2.copy(car.velocity).setY(0);
    if (vflat.length() > 6 && car.fwdSpeed > 0) tmp.lerp(vflat.normalize(), 0.35).normalize();
    if (car.fwdSpeed < -3) tmp.negate().lerp(camDir, 0.5); // marcha atrás: no girar la cámara de golpe
    camDir.lerp(tmp, 1 - Math.exp(-dt * 4.5)).normalize();

    // distancia con anticolisión (rayo desde encima del coche)
    let want = tuning.camDist;
    rayFrom.copy(carRender); rayFrom.y += 1.6;
    const camTarget = tmp.copy(carRender).addScaledVector(camDir, -want); camTarget.y = carRender.y + tuning.camHeight;
    const dir = tmp2.copy(camTarget).sub(rayFrom);
    const dl = dir.length(); dir.divideScalar(dl);
    camRay.origin = { x: rayFrom.x, y: rayFrom.y, z: rayFrom.z };
    camRay.dir = { x: dir.x, y: dir.y, z: dir.z };
    const hit = world.castRay(camRay, dl, true, undefined, undefined, car.collider, car.body);
    if (hit) want = Math.max(1.5, want * (hit.timeOfImpact / dl) - 0.4);
    camDistNow += (want - camDistNow) * (1 - Math.exp(-dt * (want < camDistNow ? 20 : 3)));

    const targetY = carRender.y + tuning.camHeight;
    camY += (targetY - camY) * (1 - Math.exp(-dt * 5));
    camera.position.copy(carRender).addScaledVector(camDir, -camDistNow);
    camera.position.y = Math.max(camY, carRender.y + 0.8, 0.6);
    const b = track.bounds;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -b.x, b.x);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -b.z, b.z);
    camera.position.y = Math.min(camera.position.y, b.h);

    look.copy(carRender).addScaledVector(camDir, 2.2); look.y += 0.7;

    // temblor
    trauma = Math.max(0, trauma - dt * 1.6);
    const sh = trauma * trauma;
    if (sh > 0) {
      camera.position.x += sh * 0.6 * noise(time * 31.1);
      camera.position.y += sh * 0.45 * noise(time * 27.3 + 7);
      camera.position.z += sh * 0.6 * noise(time * 29.7 + 3);
    }
    camera.lookAt(look);
    camera.rotateZ(sh * 0.06 * noise(time * 21 + 11));
    const fov = 60 + Math.min(Math.max(car.fwdSpeed, 0), 45) * 0.32;
    camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 3));
    camera.updateProjectionMatrix();
  }

  // ---------- Efectos por paso ----------
  const side = new THREE.Vector3();
  function stepEffects(dt) {
    side.set(1, 0, 0).applyQuaternion(car.currQuat);
    let maxSlip = 0;
    for (let i = 0; i < 4; i++) {
      const w = car.wheelState[i];
      const rear = i >= 2;
      const launching = rear && car.throttle > 0 && car.fwdSpeed < 6 && car.fwdSpeed > -1 && w.contact;
      const braking = car.braking && car.speed > 10 && w.contact;
      const slip = w.slip;
      if (w.contact) maxSlip = Math.max(maxSlip, slip);
      let mark = 0;
      if (w.contact && slip > 3.5) mark = (slip - 3) / 6;
      if (braking) mark = Math.max(mark, 0.35);
      if (launching) mark = Math.max(mark, 0.25);
      skids.add(i, w.point, side, mark);

      const smokeAmt = (w.contact ? Math.max(0, (slip - 4.5) / 8) : 0) + (launching ? 0.35 : 0) + (car.drifting && rear && w.contact ? 0.4 : 0);
      if (smokeAmt > 0 && Math.random() < smokeAmt) {
        const v = car.velocity;
        smoke.emit(w.point.x, w.point.y + 0.25, w.point.z, v.x * 0.15 + rnd(1), 0.8 + Math.random() * 0.8, v.z * 0.15 + rnd(1), {
          life: 0.9 + Math.random() * 0.7, size: 0.7, size1: 3 + Math.random() * 1.5, alpha: 0.35, color: [0.9, 0.9, 0.92], drag: 2,
        });
      }
    }
    sfx.update(car.speed || 0, car.throttle, Math.max(0, maxSlip - 3) + (car.braking && car.speed > 8 ? 4 : 0));

    for (const e of car.events) {
      if (e.type === 'land') {
        trauma = Math.min(1, trauma + e.strength * 0.7);
        sfx.hit(e.strength * 0.7);
        const n = 10 + Math.round(e.strength * 16);
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2, sp = 3 + Math.random() * 4 * e.strength;
          smoke.emit(e.pos.x + Math.cos(a) * 0.8, 0.2, e.pos.z + Math.sin(a) * 0.8, Math.cos(a) * sp, 0.4 + Math.random(), Math.sin(a) * sp, {
            life: 0.7 + Math.random() * 0.5, size: 0.6, size1: 2.4, alpha: 0.4, color: [0.82, 0.76, 0.66], drag: 3.5,
          });
        }
      } else if (e.type === 'hit') {
        trauma = Math.min(1, trauma + e.strength * 0.9);
        sfx.hit(e.strength);
        vibrate(20 + e.strength * 40);
        const n = 8 + Math.round(e.strength * 24);
        for (let k = 0; k < n; k++) {
          const sp = 6 + Math.random() * 10;
          sparks.emit(e.pos.x, e.pos.y, e.pos.z,
            e.dir.x * sp * 0.3 + rnd(sp * 0.7), 3 + Math.random() * 7, e.dir.z * sp * 0.3 + rnd(sp * 0.7),
            { life: 0.35 + Math.random() * 0.35, size: 0.3, size1: 0.05, alpha: 1, color: [1, 0.65 + Math.random() * 0.3, 0.25], grav: 30, drag: 1 });
        }
        for (let k = 0; k < 4; k++) {
          smoke.emit(e.pos.x, e.pos.y, e.pos.z, rnd(2), 1 + Math.random(), rnd(2), { life: 0.6, size: 0.5, size1: 2, alpha: 0.3, color: [0.8, 0.8, 0.8], drag: 3 });
        }
      }
    }
    car.events.length = 0;

    // recolocar automáticamente si vuelca o se sale
    const p = car.currPos;
    if (car.upsideTime > 1.4 || p.y < -4 || Math.abs(p.x) > track.bounds.x + 2 || Math.abs(p.z) > track.bounds.z + 2) doReset();
  }

  // ---------- Bucle ----------
  const hudSpeed = document.getElementById('speed');
  const hudFps = document.getElementById('fps');
  let last = performance.now(), acc = 0, fpsT = 0, fpsN = 0, lowFps = 0, time = 0;

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    smoke.setViewport(h * pixelRatio); sparks.setViewport(h * pixelRatio);
  }
  addEventListener('resize', resize);
  resize();

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now; time += dt;

    if (running) {
      const input = controls.read(dt);
      acc += dt;
      let steps = 0;
      while (acc >= FIXED && steps < 5) {
        car.step(FIXED, input);
        world.step();
        car.afterStep(FIXED);
        stepEffects(FIXED);
        acc -= FIXED; steps++;
      }
      if (steps === 5) acc = 0;
    }
    car.render(running ? acc / FIXED : 1);
    smoke.update(dt); sparks.update(dt);
    updateCamera(dt, time);

    sun.target.position.copy(car.model.position);
    sun.position.copy(car.model.position).add(sunOffset);

    renderer.render(scene, camera);

    hudSpeed.textContent = Math.round(Math.abs(car.fwdSpeed || 0) * 3);
    fpsN++; fpsT += dt;
    if (fpsT > 0.5) {
      const fps = fpsN / fpsT;
      hudFps.textContent = `${fps.toFixed(0)} fps · ${pixelRatio.toFixed(2)}x`;
      // calidad adaptativa
      if (fps < 42 && pixelRatio > 1) { if (++lowFps >= 3) { pixelRatio = Math.max(1, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); resize(); lowFps = 0; } }
      else lowFps = 0;
      fpsN = 0; fpsT = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // acceso para pruebas automáticas
  window.__game = { renderer, scene, car, controls, track, world, tuning, camera, get running() { return running; } };
}

function rnd(a) { return (Math.random() * 2 - 1) * a; }
function noise(x) { return Math.sin(x) * 0.6 + Math.sin(x * 2.3 + 1.7) * 0.3 + Math.sin(x * 5.1 + 0.3) * 0.1; }
function vibrate(ms) { try { navigator.vibrate?.(ms); } catch { /* nada */ } }

init().catch((err) => {
  console.error(err);
  document.getElementById('loading').innerHTML = `<p>Error al cargar: ${err.message}</p>`;
});
