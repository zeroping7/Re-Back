import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Race, FIXED, fmtTime, getBest } from './race.js';
import { TRACKS, trackById } from './tracks/index.js';
import { CARS, carById } from './cars.js';
import { buildCarModel } from './carModel.js';
import { Controls } from './controls.js';
import { Hud } from './hud.js';
import { Sfx } from './audio.js';
import { tuning, setupTuningPanel, onTuningChange } from './tuning.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

const SKEY = 'reback.settings.v1';
const settings = { track: 'salon', car: 'rayo', laps: 3, rivals: 3, diff: 0.94, quality: 'alta', ...load(SKEY) };
function saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch { /* nada */ } }
function load(k) { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } }

const QUALITY = { alta: { pr: 2, shadow: true }, media: { pr: 1.5, shadow: true }, baja: { pr: 1, shadow: false } };

async function init() {
  await RAPIER.init();

  // ---------- Render ----------
  const canvas = $('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let pixelRatio = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const sfx = new Sfx();
  const controls = new Controls();
  const hud = new Hud();
  setupTuningPanel();

  // ---------- Exposición del coche en el menú ----------
  const show = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(40, 1, 0.1, 100) };
  show.scene.background = new THREE.Color('#1c2033');
  show.scene.environment = envMap;
  show.scene.environmentIntensity = 0.6;
  show.scene.add(new THREE.HemisphereLight('#dfe8ff', '#3a2f4a', 0.8));
  const key = new THREE.DirectionalLight('#fff3e0', 3);
  key.position.set(4, 8, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
  show.scene.add(key);
  const rim = new THREE.DirectionalLight('#7fb2ff', 2); rim.position.set(-5, 3, -6); show.scene.add(rim);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.25, 40), new THREE.MeshStandardMaterial({ color: '#2b3150', roughness: 0.4, metalness: 0.3 }));
  plat.position.y = -0.62; plat.receiveShadow = true; show.scene.add(plat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.04, 6, 60), new THREE.MeshBasicMaterial({ color: '#ff8a1f' }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.48; show.scene.add(ring);
  const turntable = new THREE.Group(); show.scene.add(turntable);
  show.camera.position.set(-2.2, 1.6, 5.8);
  let showCarId = null;
  function showCar(id) {
    if (id === showCarId) return;
    showCarId = id;
    turntable.clear();
    const def = carById(id);
    const W = [
      { x: def.wheelX, z: def.wheelZf, front: true }, { x: -def.wheelX, z: def.wheelZf, front: true },
      { x: def.wheelX, z: def.wheelZr, front: false }, { x: -def.wheelX, z: def.wheelZr, front: false },
    ];
    const m = buildCarModel(def, def.color, W, -0.02);
    const hubY = -0.02 - 0.22;
    m.userData.wheels.forEach((w) => { w.position.y = hubY; });
    m.userData.updateSuspension([hubY, hubY, hubY, hubY]);
    m.position.y = -0.5 + def.wheelR - hubY;
    turntable.add(m);
  }

  // ---------- Pantallas ----------
  const screens = ['m-main', 'm-setup', 'm-settings', 'm-pause', 'm-results'];
  function showScreen(id) {
    for (const s of screens) $(s).classList.toggle('hidden', s !== id);
    if (id === 'm-setup' || id === 'm-main' || id === 'm-settings') showCar(settings.car);
  }
  let mode = 'race';
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    sfx.play('click');
    const go = b.dataset.go;
    if (go === 'race' || go === 'practice') {
      mode = go;
      $('setup-title').textContent = go === 'race' ? 'Carrera' : 'Contrarreloj';
      $('race-opts').style.display = go === 'practice' ? 'none' : '';
      buildSetup();
      showScreen('m-setup');
    } else showScreen('m-' + go);
  }));

  function seg(id, options, get, set) {
    const el = $(id);
    el.innerHTML = '';
    for (const [val, label] of options) {
      const b = document.createElement('button');
      b.textContent = label;
      b.classList.toggle('sel', get() === val);
      b.addEventListener('click', () => {
        set(val); sfx.play('click');
        el.querySelectorAll('button').forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
      });
      el.append(b);
    }
  }

  function buildSetup() {
    const tracks = $('tracks'); tracks.innerHTML = '';
    for (const t of TRACKS) {
      const best = getBest(t.id);
      const c = document.createElement('button');
      c.className = 'card' + (settings.track === t.id ? ' sel' : '');
      c.innerHTML = `<div class="sw" style="background:linear-gradient(135deg,${t.color},#0003)"></div><b>${t.name}</b><small>${t.desc}</small>` +
        `<div class="rec">⏱ ${fmtTime(best.lap)}${best.wins ? ' · 🏆' + best.wins : ''}</div>`;
      c.addEventListener('click', () => { settings.track = t.id; saveSettings(); sfx.play('click'); buildSetup(); });
      tracks.append(c);
    }
    const cars = $('cars'); cars.innerHTML = '';
    for (const d of CARS) {
      const c = document.createElement('button');
      c.className = 'card' + (settings.car === d.id ? ' sel' : '');
      const bar = (n, v) => `<div class="bar">${n}<i style="--v:${v * 20}%"></i></div>`;
      c.innerHTML = `<div class="sw" style="background:linear-gradient(135deg,${d.color},#0004)"></div><b>${d.name}</b><small>${d.desc}</small>` +
        bar('Vel', d.stats.vel) + bar('Ace', d.stats.acel) + bar('Man', d.stats.manejo);
      c.addEventListener('click', () => { settings.car = d.id; saveSettings(); sfx.play('click'); showCar(d.id); buildSetup(); });
      cars.append(c);
    }
    seg('opt-laps', [[2, '2'], [3, '3'], [5, '5']], () => settings.laps, (v) => { settings.laps = v; saveSettings(); });
    seg('opt-rivals', [[1, '1'], [3, '3'], [5, '5']], () => settings.rivals, (v) => { settings.rivals = v; saveSettings(); });
    seg('opt-diff', [[0.86, 'Fácil'], [0.94, 'Normal'], [1.02, 'Difícil']], () => settings.diff, (v) => { settings.diff = v; saveSettings(); });
  }

  function buildSettings() {
    seg('opt-sound', [[false, 'Sí'], [true, 'No']], () => sfx.muted, (v) => sfx.setMuted(v));
    seg('opt-music', [[true, 'Sí'], [false, 'No']], () => sfx.musicOn, (v) => { sfx.setMusic(v); buildSettings(); });
    seg('opt-music2', [[true, 'Sí'], [false, 'No']], () => sfx.musicOn, (v) => { sfx.setMusic(v); buildSettings(); });
    seg('opt-steer', [['buttons', 'Botones'], ['tilt', 'Inclinar']], () => controls.mode, (v) => controls.setMode(v));
    seg('opt-quality', [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']], () => settings.quality, (v) => { settings.quality = v; saveSettings(); applyQuality(); });
  }
  buildSettings();
  $('btn-tune2').addEventListener('click', () => $('tune-panel').classList.remove('hidden'));

  // ---------- Carrera ----------
  let race = null;
  function startRace() {
    if (race) { race.dispose(); race = null; }
    const practice = mode === 'practice';
    showScreen(null);
    $('hud').classList.add('hidden');
    $('loading').classList.remove('hidden');
    // un fotograma para que se vea "Cargando…"
    requestAnimationFrame(() => setTimeout(() => {
      controls.releaseAll();
      const q = QUALITY[settings.quality] || QUALITY.alta;
      race = new Race({
        renderer, envMap, sfx, controls, hud,
        trackDef: trackById(settings.track), carDef: carById(settings.car),
        laps: settings.laps, rivals: settings.rivals, difficulty: settings.diff, practice,
        baseTuning: tuning, onFinish: showResults,
      });
      race.sun.castShadow = q.shadow;
      if (params.get('cam')) race.debugCam = params.get('cam');
      if (params.has('auto')) race.autoPlayer = true;
      resize();
      $('loading').classList.add('hidden');
      $('hud').classList.remove('hidden');
      sfx.startMusic('race');
    }, 30));
  }
  $('btn-go').addEventListener('click', () => { sfx.play('click'); startRace(); });

  function pause(on) {
    if (!race || race.phase === 'done') return;
    race.paused = on;
    controls.releaseAll();
    showScreen(on ? 'm-pause' : null);
    if (on) sfx.stopEngine();
  }
  controls.onPause = () => pause(!race?.paused);
  $('btn-pause').addEventListener('click', () => pause(true));
  $('btn-resume').addEventListener('click', () => pause(false));
  $('btn-restart').addEventListener('click', () => startRace());
  function quit() {
    if (race) { race.dispose(); race = null; }
    $('hud').classList.add('hidden');
    $('tune-panel').classList.add('hidden');
    sfx.startMusic('menu');
    showScreen('m-main');
  }
  $('btn-quit').addEventListener('click', quit);
  $('btn-menu').addEventListener('click', quit);
  $('btn-again').addEventListener('click', () => startRace());
  $('btn-reset').addEventListener('click', () => race && race.respawn(race.player));
  controls.onReset = () => race && race.respawn(race.player);
  onTuningChange(() => race && race.applyTuning(tuning));
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });

  function showResults(res) {
    if (!race) return;
    const tb = $('res-table');
    tb.innerHTML = res.map((r) => `<tr class="${r.player ? 'me' : ''}"><td>${r.place}º</td><td><span class="dot" style="background:${r.color}"></span>${r.name}</td>` +
      `<td>${r.finished ? fmtTime(r.time) : '—'}</td><td>⏱ ${fmtTime(r.best)}</td></tr>`).join('');
    const me = res.find((r) => r.player);
    $('res-title').textContent = me.place === 1 ? '🏆 ¡Has ganado!' : `Has quedado ${me.place}º`;
    const best = getBest(settings.track);
    $('res-best').textContent = `Récord del circuito: vuelta ${fmtTime(best.lap)} · carrera ${fmtTime(best.race)}`;
    showScreen('m-results');
  }

  // ---------- Inicio ----------
  const begin = async () => {
    $('start').classList.add('hidden');
    sfx.start();
    try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* nada */ }
    try { await window.screen.orientation?.lock?.('landscape'); } catch { /* nada */ }
    sfx.startMusic('menu');
    showScreen('m-main');
  };
  $('btn-start').addEventListener('click', begin);
  $('loading').classList.add('hidden');

  // ---------- Bucle ----------
  const hudFps = $('fps');
  let last = performance.now(), fpsT = 0, fpsN = 0, lowFps = 0, t = 0;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    show.camera.aspect = w / h;
    show.camera.setViewOffset(w, h, -w * 0.18, 0, w, h);
    show.camera.updateProjectionMatrix();
    if (race) race.resize(w, h, pixelRatio);
  }
  function applyQuality() {
    const q = QUALITY[settings.quality] || QUALITY.alta;
    pixelRatio = Math.min(devicePixelRatio || 1, q.pr);
    renderer.setPixelRatio(pixelRatio);
    renderer.shadowMap.enabled = q.shadow;
    if (race) race.sun.castShadow = q.shadow;
    resize();
  }
  addEventListener('resize', resize);
  applyQuality();

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now; t += dt;
    if (race) {
      race.update(dt);
      race.render(race.acc / FIXED, dt);
    } else {
      turntable.rotation.y = t * 0.5;
      show.camera.lookAt(0, 0, 0);
      renderer.render(show.scene, show.camera);
    }
    fpsN++; fpsT += dt;
    if (fpsT > 0.5) {
      const fps = fpsN / fpsT;
      hudFps.textContent = `${fps.toFixed(0)} fps`;
      if (race && fps < 40 && pixelRatio > 1) {
        if (++lowFps >= 4) { pixelRatio = Math.max(1, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); resize(); lowFps = 0; }
      } else lowFps = 0;
      fpsN = 0; fpsT = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.__game = { renderer, controls, settings, get race() { return race; }, startRace, quit };

  // modo prueba: salta los menús
  if (params.has('test')) {
    $('start').classList.add('hidden');
    if (params.get('track')) settings.track = params.get('track');
    if (params.get('car')) settings.car = params.get('car');
    if (params.has('rivals')) settings.rivals = +params.get('rivals');
    if (params.has('laps')) settings.laps = +params.get('laps');
    mode = params.has('practice') ? 'practice' : 'race';
    sfx.start();
    startRace();
  }
}

init().catch((err) => {
  console.error(err);
  $('loading').innerHTML = `<p>Error al cargar: ${err.message}</p>`;
});
