import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import '@fontsource/russo-one/latin-400.css';
import { Race, FIXED, fmtTime, getBest } from './race.js';
import { TRACKS, trackById, trackFromKey, VARIANTS, variantUnlocked } from './tracks/index.js';
import { ARENA } from './battle.js';
import { CARS, carById, UPGRADES, MAX_LEVEL, carTuning, tractionName } from './cars.js';
import {
  profile, isOwned, upgradesOf, upgradeCost, sellValue, buyCar, sellCar, buyUpgrade, selectCar, raceReward, addMoney,
  onProfileChange, setCupResult, takeStar, STAR_PRIZE, checkSecret, starsGot,
} from './profile.js';
import { CUPS, cupById, cupUnlocked, cupPrize, addPoints, standings, POINTS } from './cups.js';
import { Showroom } from './showroom.js';
import { Controls } from './controls.js';
import { PadInput } from './gamepad.js';
import { Hud } from './hud.js';
import { Sfx } from './audio.js';
import { tuning } from './tuning.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SKEY = 'reback.settings.v1';
const settings = { track: 'salon', variant: 'normal', car: 'rayo', laps: 3, rivals: 3, diff: 0.94, quality: 'alta', cam: 'normal', autoGas: false, cup: 'bronce', ...load(SKEY) };
function saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch { /* nada */ } }
function load(k) { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } }

const QUALITY = { alta: { pr: 2, shadow: true }, media: { pr: 1.5, shadow: true }, baja: { pr: 1, shadow: false } };
const CAMS = [['normal', 'Normal'], ['far', 'Lejos'], ['bumper', 'Parachoques']];
const TIPS = [
  'Frena y gira a la vez para derrapar en las curvas cerradas.',
  'Las cajas de energía dan un arma al azar: pasa por encima para cogerla.',
  'Si te quedas volcado o atascado, pulsa ↺ para volver a la pista.',
  'Pasa las placas de turbo por el centro para salir disparado.',
  'En el aire, el gas y el freno inclinan el coche: aterriza recto.',
  'Los golpes fuertes estropean el coche. La llave 🔧 lo arregla.',
  'En Contrarreloj hay una estrella escondida en el salto de cada circuito.',
  'El pulso eléctrico deja sin motor a los coches que tengas cerca.',
  'La bomba se pasa tocando a otro coche: ¡no te la quedes!',
  'Cambia de cámara con 🎥: normal, lejos o parachoques.',
  'Las zonas brillantes resbalan: suelta un poco el gas al entrar.',
  'Los coches pesados empujan más; los ligeros aceleran y giran mejor.',
  'Queda entre los 3 primeros de una copa para abrir la siguiente.',
  'Con mando: gatillo derecho acelera, el izquierdo frena y X dispara.',
  'En la Batalla, dispara al que lleva la estrella para que la suelte.',
  'Mantén 👀 (o LB) para mirar atrás.',
];

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
  controls.autoGas = !!settings.autoGas;
  const pad = new PadInput(controls);
  pad.onMove = () => sfx.play('click');
  const hud = new Hud();

  // Taller 3D detrás de los menús
  const room = new Showroom(envMap);

  // ---------- Pantallas ----------
  const screens = ['m-main', 'm-setup', 'm-settings', 'm-pause', 'm-results', 'm-garage', 'm-cups', 'm-podium'];
  const VIEW = { 'm-main': 'main', 'm-settings': 'main', 'm-setup': 'car', 'm-garage': 'car', 'm-cups': 'car' };
  function showScreen(id) {
    for (const s of screens) $(s).classList.toggle('hidden', s !== id);
    $('money').classList.toggle('hidden', !['m-main', 'm-setup', 'm-garage', 'm-results', 'm-cups', 'm-podium'].includes(id));
    if (VIEW[id]) { room.setView(VIEW[id]); room.showCar(id === 'm-garage' ? (gSel ||= profile.selected) : profile.selected); }
    if (id === 'm-garage') buildGarage();
  }
  let mode = 'race'; // 'race' | 'practice' | 'cup'
  let cup = null; // { id, idx, table }
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    sfx.play('click');
    const go = b.dataset.go;
    if (go === 'race' || go === 'practice' || go === 'battle') {
      mode = go;
      $('setup-title').textContent = go === 'race' ? 'Carrera rápida' : go === 'battle' ? 'Batalla de la Estrella' : 'Contrarreloj';
      $('race-opts').style.display = go === 'practice' ? 'none' : '';
      $('m-setup').classList.toggle('battle', go === 'battle');
      buildSetup();
      showScreen('m-setup');
    } else if (go === 'cups') { buildCups(); showScreen('m-cups'); }
    else showScreen('m-' + go);
  }));
  function updateMoney(bump) {
    $('money-n').textContent = profile.money.toLocaleString('es-ES');
    if (bump) { $('money').classList.remove('bump'); void $('money').offsetWidth; $('money').classList.add('bump'); }
  }
  onProfileChange(() => updateMoney(true));
  checkSecret();
  updateMoney();

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
  const coins = (n) => n.toLocaleString('es-ES');
  function toast(text) { const el = $('pad-toast'); el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  const hasGhost = (key) => { try { return !!localStorage.getItem('reback.ghost.' + key); } catch { return false; } };
  // Foto de la tarjeta (UX-10); si no carga, se ve el color de siempre
  const PV = import.meta.env.BASE_URL + 'previews/';
  const carPv = (d) => `<div class="sw pv car" style="--c:${d.color};background-image:url(${PV}car-${d.id}.webp),radial-gradient(ellipse at 50% 75%,${d.color}88,#0000 70%),linear-gradient(135deg,#ffffff1a,#0003)"></div>`;
  const trackPv = (t, inner = '') => `<div class="sw pv track" style="background-image:url(${PV}track-${t.id}.webp),linear-gradient(135deg,${t.color},#0003)">${inner}</div>`;

  // Tarjetas de los coches que tienes (preparar carrera y campeonato)
  function carCards(el, rebuild) {
    el.innerHTML = '';
    for (const d of CARS.filter((x) => isOwned(x.id))) {
      const c = document.createElement('button');
      c.className = 'card' + (profile.selected === d.id ? ' sel' : '');
      const bar = (n, v) => `<div class="bar">${n}<i style="--v:${v * 20}%"></i></div>`;
      c.innerHTML = `${carPv(d)}<b>${d.name}</b><small>${d.clase} · ${d.motor}</small>` +
        bar('Vel', d.stats.vel) + bar('Ace', d.stats.acel) + bar('Man', d.stats.manejo);
      c.addEventListener('click', () => { selectCar(d.id); sfx.play('click'); room.showCar(d.id); rebuild(); });
      el.append(c);
    }
    if (CARS.some((x) => !isOwned(x.id))) {
      const c = document.createElement('button');
      c.className = 'card locked';
      c.innerHTML = '<div class="sw pv more">🔒</div><b>Más coches</b><small>Gana carreras y cómpralos en el Garaje</small>';
      c.addEventListener('click', () => { sfx.play('click'); showScreen('m-garage'); });
      el.append(c);
    }
  }

  const trackKey = () => settings.track + (settings.variant && settings.variant !== 'normal' ? ':' + settings.variant : '');
  function buildSetup() {
    if (!variantUnlocked(settings.variant, profile.cups)) settings.variant = 'normal';
    const tracks = $('tracks'); tracks.innerHTML = '';
    const vr = settings.variant || 'normal';
    for (const t of TRACKS) {
      const key = t.id + (vr !== 'normal' ? ':' + vr : '');
      const best = getBest(key);
      const c = document.createElement('button');
      c.className = 'card' + (settings.track === t.id ? ' sel' : '') + (vr !== 'normal' ? ' v-' + vr : '');
      const star = mode === 'practice' && vr === 'normal' ? `<span class="star ${profile.stars[t.id] ? 'got' : ''}">${profile.stars[t.id] ? '⭐' : '☆'}</span>` : '';
      const ghost = mode === 'practice' && hasGhost(key) ? '<span class="ghost-ic">👻</span>' : '';
      c.innerHTML = `${trackPv(t, star + ghost)}<b>${trackFromKey(key).name}</b><small>${t.desc}</small>` +
        `<div class="rec">⏱ ${fmtTime(best.lap)}${best.wins ? ' · 🏆' + best.wins : ''}</div>`;
      c.addEventListener('click', () => { settings.track = t.id; saveSettings(); sfx.play('click'); buildSetup(); });
      tracks.append(c);
    }
    // sentido: normal, al revés, espejo (UX-13)
    const vEl = $('opt-variant'); vEl.innerHTML = '';
    for (const V of VARIANTS) {
      const open = variantUnlocked(V.id, profile.cups);
      const b = document.createElement('button');
      b.textContent = (open ? '' : '🔒 ') + V.name + (V.icon ? ' ' + V.icon : '');
      b.classList.toggle('sel', vr === V.id); b.classList.toggle('locked', !open);
      b.addEventListener('click', () => {
        sfx.play('click');
        if (!open) { toast(`🔒 Queda entre los 3 primeros de la Copa ${V.needs === 'plata' ? 'Plata' : 'Oro'}`); return; }
        settings.variant = V.id; saveSettings(); buildSetup();
      });
      vEl.append(b);
    }
    carCards($('cars'), buildSetup);
    seg('opt-laps', [[2, '2'], [3, '3'], [5, '5']], () => settings.laps, (v) => { settings.laps = v; saveSettings(); });
    seg('opt-rivals', [[1, '1'], [3, '3'], [5, '5']], () => settings.rivals, (v) => { settings.rivals = v; saveSettings(); });
    seg('opt-diff', [[0.86, 'Fácil'], [0.94, 'Normal'], [1.02, 'Difícil']], () => settings.diff, (v) => { settings.diff = v; saveSettings(); });
  }

  // ---------- Campeonato ----------
  function buildCups() {
    const el = $('cups'); el.innerHTML = '';
    if (!cupUnlocked(cupById(settings.cup), profile.cups)) settings.cup = 'bronce';
    for (const c of CUPS) {
      const open = cupUnlocked(c, profile.cups), best = profile.cups[c.id];
      const b = document.createElement('button');
      b.className = 'card cup' + (settings.cup === c.id ? ' sel' : '') + (open ? '' : ' locked');
      const route = c.tracks.map((id) => trackFromKey(id).short).join(' → ');
      b.innerHTML = `<div class="cup-ic" style="--c:${c.color}">${open ? c.icon : '🔒'}</div><b>${c.name}</b>` +
        `<small>${c.diffName} · ${c.laps} vueltas · ${c.rivals + 1} coches<br>${route}</small>` +
        `<div class="price">Premio 🪙 ${coins(c.prize)}</div>` +
        (open ? (best ? `<div class="own">${best <= 3 ? '🏆' : ''} Tu mejor: ${best}º</div>` : '<div class="own new">¡Nueva!</div>')
          : `<div class="lock">Queda entre los 3 primeros de la ${cupById(c.needs).name}</div>`);
      b.addEventListener('click', () => {
        sfx.play('click');
        if (!open) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
        settings.cup = c.id; saveSettings(); buildCups();
      });
      el.append(b);
    }
    carCards($('cup-cars'), buildCups);
  }
  $('btn-cup-go').addEventListener('click', () => {
    sfx.play('click');
    mode = 'cup';
    cup = { id: settings.cup, idx: 0, table: {} };
    startRace();
  });

  function standingsRows(list) {
    return list.map((e, i) => `<tr class="${e.player ? 'me' : ''}"><td>${i + 1}º</td><td><span class="dot" style="background:${e.color}"></span>${e.name}</td>` +
      `<td class="pts">${e.pts} pts</td></tr>`).join('');
  }

  function buildSettings() {
    seg('opt-sound', [[false, 'Sí'], [true, 'No']], () => sfx.muted, (v) => sfx.setMuted(v));
    seg('opt-music', [[true, 'Sí'], [false, 'No']], () => sfx.musicOn, (v) => { sfx.setMusic(v); buildSettings(); });
    seg('opt-music2', [[true, 'Sí'], [false, 'No']], () => sfx.musicOn, (v) => { sfx.setMusic(v); buildSettings(); });
    seg('opt-steer', [['buttons', 'Botones'], ['tilt', 'Inclinar']], () => controls.mode, (v) => controls.setMode(v));
    seg('opt-autogas', [[true, 'Sí'], [false, 'No']], () => !!settings.autoGas, (v) => { settings.autoGas = v; controls.autoGas = v; saveSettings(); });
    seg('opt-cam', CAMS, () => settings.cam, (v) => setCam(v));
    seg('opt-quality', [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']], () => settings.quality, (v) => { settings.quality = v; saveSettings(); applyQuality(); });
  }
  buildSettings();

  function setCam(v, announce) {
    settings.cam = v; saveSettings();
    if (race) race.camMode = v;
    if (announce) hud.message('🎥 ' + CAMS.find((c) => c[0] === v)[1], 0.9);
    buildSettings();
  }
  const nextCam = () => { const i = CAMS.findIndex((c) => c[0] === settings.cam); setCam(CAMS[(i + 1) % CAMS.length][0], true); };
  $('btn-cam').addEventListener('click', nextCam);
  controls.onCamera = () => race && nextCam();

  // ---------- Garaje ----------
  let gSel = null;
  const statVals = (def, up) => {
    const t = carTuning({ engine: 1, maxSpeed: 1, gripFront: 1, gripRear: 1, steerMax: 1, steerSpeed: 1, suspStiff: 1, rearBias: 90 }, def, 1, up);
    return [['Velocidad', t.maxSpeed, 0.85, 1.25], ['Aceleración', t.engine, 0.9, 1.6], ['Agarre', t.gripFront, 0.9, 1.4], ['Giro', t.steerMax, 0.85, 1.4]];
  };
  function buildGarage() {
    const list = $('g-cars'); list.innerHTML = '';
    for (const d of CARS) {
      const own = isOwned(d.id), hidden = d.secret && !own;
      const c = document.createElement('button');
      c.className = 'card' + (gSel === d.id ? ' sel' : '') + (own ? '' : ' locked') + (hidden ? ' secret' : '');
      c.innerHTML = hidden
        ? `${carPv(d)}<b>❓ Secreto</b><small>Consigue todas las estrellas</small><div class="price">⭐ ${starsGot()}/${TRACKS.length}</div>`
        : `${carPv(d)}<b>${own ? '' : '🔒 '}${d.name}</b><small>${d.clase}</small>` +
        (own ? `<div class="own">${profile.selected === d.id ? '✔ En uso' : 'Tuyo'}</div>` : `<div class="price">🪙 ${coins(d.price)}</div>`);
      c.addEventListener('click', () => { gSel = d.id; sfx.play('click'); room.showCar(d.id); buildGarage(); });
      list.append(c);
    }
    const d = carById(gSel), own = isOwned(gSel), up = upgradesOf(gSel);
    $('g-name').textContent = d.name;
    $('g-desc').textContent = d.desc;
    $('g-spec').innerHTML = [
      ['🏷', d.clase], [d.motor === 'Nitro' ? '⛽' : '🔋', d.motor], ['⚙', tractionName(d, tuning.rearBias)],
      ['⚖', `${(d.mass * 0.2).toFixed(1).replace('.', ',')} kg`],
    ].map(([i, t]) => `<span>${i} ${t}</span>`).join('');
    const base = statVals(d, {}), now = statVals(d, up);
    $('g-stats').innerHTML = base.map(([n, v, lo, hi], i) => {
      const b = Math.max(4, Math.min(100, ((v - lo) / (hi - lo)) * 100));
      const u = Math.max(0, Math.min(100 - b, ((now[i][1] - v) / (hi - lo)) * 100));
      return `<div class="bar"><span>${n}</span><i style="--b:${b}%;--u:${u}%"></i></div>`;
    }).join('');
    const act = $('g-actions'); act.innerHTML = '';
    const btn = (label, cls, ok, fn) => { const b = document.createElement('button'); b.innerHTML = label; b.className = cls; b.disabled = !ok; b.onclick = fn; act.append(b); };
    if (d.secret && !own) {
      $('g-name').textContent = '❓ Coche secreto';
      $('g-desc').textContent = `Consigue las ${TRACKS.length} estrellas ocultas en Contrarreloj (llevas ${starsGot()})`;
      btn(`⭐ ${starsGot()}/${TRACKS.length}`, 'buy', false, () => {});
    } else if (!own) {
      btn(`Comprar · 🪙 ${coins(d.price)}`, 'buy', profile.money >= d.price, () => { if (buyCar(d.id)) { sfx.play('finish'); buildGarage(); } });
    } else {
      btn(profile.selected === d.id ? '✔ En uso' : 'Usar este', 'use', profile.selected !== d.id, () => { selectCar(d.id); sfx.play('click'); buildGarage(); });
      const many = Object.keys(profile.owned).length > 1;
      btn(`Vender · +🪙 ${coins(sellValue(d.id))}`, '', many, () => {
        if (confirm(`¿Vender ${d.name} por ${sellValue(d.id)} monedas?`) && sellCar(d.id)) { sfx.play('pass'); gSel = profile.selected; room.showCar(gSel); buildGarage(); }
      });
    }
    const ups = $('g-ups'); ups.innerHTML = '';
    for (const u of UPGRADES) {
      const lvl = up[u.id] || 0, cost = upgradeCost(d.id, u.id);
      const row = document.createElement('div'); row.className = 'up-row';
      row.innerHTML = `<div class="nm">${u.icon} ${u.name}<small>${u.desc}</small></div><div class="pips">${'●'.repeat(lvl)}${'○'.repeat(MAX_LEVEL - lvl)}</div>`;
      const b = document.createElement('button');
      b.textContent = cost === null ? 'MÁX' : `🪙 ${coins(cost)}`;
      b.disabled = !own || cost === null || profile.money < cost;
      b.onclick = () => { if (buyUpgrade(d.id, u.id)) { sfx.play('pickup'); buildGarage(); } };
      row.append(b); ups.append(row);
    }
  }

  // ---------- Carrera ----------
  let race = null, loadToken = 0;
  function raceConfig() {
    if (mode === 'cup') {
      const c = cupById(cup.id);
      return { track: c.tracks[cup.idx], laps: c.laps, rivals: c.rivals, diff: c.diff, practice: false, kind: `${c.icon} ${c.name} · Carrera ${cup.idx + 1} de ${c.tracks.length}` };
    }
    if (mode === 'battle') return { track: 'arena', battle: true, laps: 1, rivals: Math.max(1, settings.rivals), diff: settings.diff, practice: false, kind: '⭐ Batalla de la Estrella' };
    if (mode === 'practice') return { track: trackKey(), laps: 3, rivals: 0, diff: 1, practice: true, kind: '⏱ Contrarreloj' };
    return { track: trackKey(), laps: settings.laps, rivals: settings.rivals, diff: settings.diff, practice: false, kind: '🏁 Carrera rápida' };
  }

  function showLoading(def, cfg) {
    $('ld-kind').textContent = cfg.kind;
    $('ld-name').textContent = def.name;
    $('ld-desc').textContent = cfg.battle ? `${def.desc} · ${cfg.rivals + 1} coches · reloj de 60 s` : def.desc + (cfg.practice && def.variant ? '' : cfg.practice ? (profile.stars[def.id] ? ' · ⭐ estrella conseguida' : ' · ☆ busca la estrella') : ` · ${cfg.laps} vueltas · ${cfg.rivals + 1} coches`);
    $('ld-tip').textContent = '💡 ' + TIPS[Math.floor(Math.random() * TIPS.length)];
    $('loading').style.setProperty('--tc', def.color);
    $('loading').classList.remove('hidden', 'go');
    void $('loading').offsetWidth;
    $('loading').classList.add('go');
  }

  function startRace() {
    const token = ++loadToken;
    if (race) { race.dispose(); race = null; }
    const cfg = raceConfig(), def = cfg.battle ? ARENA : trackFromKey(cfg.track);
    showScreen(null);
    $('hud').classList.add('hidden');
    sfx.stopAmbient();
    showLoading(def, cfg);
    const t0 = performance.now();
    // un fotograma para que se vea la pantalla de carga
    requestAnimationFrame(() => setTimeout(async () => {
      if (token !== loadToken) return;
      controls.releaseAll();
      const q = QUALITY[settings.quality] || QUALITY.alta;
      const r = new Race({
        renderer, envMap, sfx, controls, hud,
        trackDef: def, carDef: carById(profile.selected), carUpgrades: { ...upgradesOf(profile.selected) },
        laps: cfg.laps, rivals: cfg.rivals, difficulty: cfg.diff, practice: cfg.practice,
        baseTuning: tuning, onFinish: showResults, camMode: settings.cam,
        star: cfg.practice && !def.variant ? { taken: !!profile.stars[def.id] } : null,
        battle: !!cfg.battle,
        onStar: () => {
          const got = takeStar(def.id) ? STAR_PRIZE : 0;
          if (checkSecret()) setTimeout(() => { hud.message('🚀 ¡Coche secreto desbloqueado: Cometa!', 3.5, 'big'); sfx.play('cup'); }, 2600);
          return got;
        },
      });
      r.sun.castShadow = q.shadow;
      if (params.get('cam')) r.debugCam = params.get('cam');
      if (params.has('auto')) r.autoPlayer = true;
      r.resize(innerWidth, innerHeight, pixelRatio);
      // compilar los shaders aquí y no a mitad de carrera
      try { await Promise.race([renderer.compileAsync(r.scene, r.camera), wait(4000)]); } catch { /* nada */ }
      await wait(Math.max(0, (params.has('test') ? 0 : 1400) - (performance.now() - t0)));
      if (token !== loadToken) { r.dispose(); return; }
      race = r;
      resize();
      $('loading').classList.add('hidden');
      $('hud').classList.remove('hidden');
      sfx.startMusic('race', cfg.battle ? 'batalla' : def.id);
      sfx.startAmbient(cfg.battle ? 'salon' : def.id);
    }, 30));
  }
  $('btn-go').addEventListener('click', () => { sfx.play('click'); startRace(); });

  function pause(on) {
    if (!race || race.phase === 'done') return;
    race.paused = on;
    controls.releaseAll();
    showScreen(on ? 'm-pause' : null);
    if (on) { sfx.stopEngine(); sfx.duckAmbient(true); } else sfx.duckAmbient(false);
  }
  controls.onPause = () => pause(!race?.paused);
  $('btn-pause').addEventListener('click', () => pause(true));
  $('btn-resume').addEventListener('click', () => pause(false));
  $('btn-restart').addEventListener('click', () => startRace());
  function quit() {
    loadToken++;
    if (race) { race.dispose(); race = null; }
    if (mode === 'cup') { cup = null; mode = 'race'; }
    $('hud').classList.add('hidden');
    $('loading').classList.add('hidden');
    sfx.stopAmbient();
    sfx.startMusic('menu');
    showScreen('m-main');
  }
  $('btn-quit').addEventListener('click', () => { if (mode !== 'cup' || confirm('¿Abandonar la copa? Perderás los puntos.')) quit(); });
  $('btn-reset').addEventListener('click', () => race && race.respawn(race.player));
  controls.onReset = () => race && race.respawn(race.player);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });

  function showResults(res) {
    if (!race) return;
    const cfg = raceConfig(), inCup = mode === 'cup';
    const me = res.find((r) => r.player);
    if (inCup) addPoints(cup, res);
    $('res-kind').textContent = `${cfg.kind} · ${cfg.battle ? ARENA.name : trackFromKey(cfg.track).name}`;
    $('res-title').textContent = me.place === 1 ? '🏆 ¡Has ganado!' : `Has quedado ${me.place}º`;
    $('res-table').innerHTML = res.map((r) => `<tr class="${r.player ? 'me' : ''}"><td>${r.place}º</td><td><span class="dot" style="background:${r.color}"></span>${r.name}</td>` +
      `<td>${r.finished ? fmtTime(r.time) : '—'}</td><td>⏱ ${fmtTime(r.best)}</td>${inCup ? `<td class="pts">+${POINTS[r.place - 1] || 0}</td>` : ''}</tr>`).join('');
    const reward = raceReward(me.place, res.length, cfg.laps, cfg.diff);
    if (reward) addMoney(reward);
    $('res-reward').textContent = reward ? `+ 🪙 ${coins(reward)}` : '';
    $('res-cup').classList.toggle('hidden', !inCup);
    document.querySelector('#m-results .res-col').classList.toggle('wide', inCup);
    if (inCup) $('cup-table').innerHTML = standingsRows(standings(cup));
    const best = getBest(cfg.track);
    $('res-best').textContent = cfg.battle ? 'Tiempo = segundos que cada uno llevó la estrella' : `Récord del circuito: vuelta ${fmtTime(best.lap)} · carrera ${fmtTime(best.race)}`;
    const btns = $('res-btns'); btns.innerHTML = '';
    const btn = (label, cls, fn) => {
      const b = document.createElement('button');
      b.className = 'big-btn ' + cls; b.innerHTML = label;
      b.addEventListener('click', () => { sfx.play('click'); fn(); });
      btns.append(b);
    };
    if (inCup) {
      if (cup.idx >= cupById(cup.id).tracks.length - 1) btn('Ver el podio 🏆', '', showPodium);
      else {
        btn('Siguiente carrera ▶', '', () => { cup.idx++; startRace(); });
        btn('Abandonar', 'alt', () => { if (confirm('¿Abandonar la copa? Perderás los puntos.')) quit(); });
      }
    } else {
      btn('↻ Otra vez', '', () => startRace());
      btn('Menú', 'alt', quit);
    }
    if (race.canReplay) btn('🎬 Repetición', 'alt', playReplay);
    showScreen('m-results');
  }

  // ---------- Repetición (UX-12) ----------
  function playReplay() {
    if (!race || !race.startReplay(endReplayUi)) return;
    showScreen(null);
    $('hud').classList.add('hidden');
    $('replay-ui').classList.remove('hidden');
  }
  function endReplayUi() {
    $('replay-ui').classList.add('hidden');
    $('hud').classList.remove('hidden');
    showScreen('m-results');
  }
  $('btn-replay-skip').addEventListener('click', (e) => { e.stopPropagation(); race?.endReplay(); });
  $('replay-ui').addEventListener('click', () => race?.endReplay());

  function showPodium() {
    const c = cupById(cup.id), table = standings(cup);
    const place = table.findIndex((e) => e.player) + 1;
    const prize = cupPrize(c, place);
    const before = CUPS.map((x) => cupUnlocked(x, profile.cups));
    setCupResult(c.id, place);
    if (prize) addMoney(prize);
    const opened = CUPS.filter((x, i) => !before[i] && cupUnlocked(x, profile.cups));
    loadToken++;
    if (race) { race.dispose(); race = null; }
    $('hud').classList.add('hidden');
    $('pod-title').textContent = `${c.icon} ${c.name}`;
    $('pod-sub').textContent = place === 1 ? '¡Eres el campeón!' : place <= 3 ? `¡Al podio! Has quedado ${place}º` : `Has quedado ${place}º. ¡La próxima vez!`;
    $('pod-table').innerHTML = standingsRows(table);
    $('pod-reward').textContent = prize ? `Premio de la copa: + 🪙 ${coins(prize)}` : 'Sin premio: hay que acabar entre los 3 primeros';
    $('pod-unlock').textContent = opened.length ? `🔓 ¡${opened.map((x) => x.name).join(' y ')} desbloqueada!` : '';
    room.showPodium(table);
    room.setView('podium');
    sfx.stopAmbient();
    sfx.startMusic('menu');
    sfx.play(place <= 3 ? 'cup' : 'pass');
    cup = null; mode = 'race';
    showScreen('m-podium');
  }
  $('btn-pod-menu').addEventListener('click', () => { sfx.play('click'); showScreen('m-main'); });

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
  const hudFps = $('fps'), loadingEl = $('loading');
  let last = performance.now(), fpsT = 0, fpsN = 0, lowFps = 0;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    room.resize(w, h);
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
    last = now;
    pad.update(dt, { racing: !!race && !race.paused && race.phase !== 'done' && !$('m-results').offsetParent });
    if (race) {
      race.update(dt);
      race.render(race.acc / FIXED, dt);
      sfx.updateRivals(race);
    } else if (loadingEl.classList.contains('hidden')) room.render(renderer, dt); // con la carga delante no hace falta dibujar
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

  window.__game = {
    renderer, controls, pad, sfx, settings, room, profile, showScreen, startRace, quit,
    get race() { return race; }, get cup() { return cup; },
    startCup(id) { mode = 'cup'; cup = { id, idx: 0, table: {} }; startRace(); },
    // fotos para las tarjetas (tests/previews.mjs)
    carPreviews: () => import('./previews.js').then((m) => m.carPreviews()),
    trackShot(opts) {
      race.debugCam = 'preview'; race.previewCam = opts || {};
      race.render(1, 0);
      return renderer.domElement.toDataURL('image/webp', 0.85);
    },
  };

  // modo prueba: salta los menús
  if (params.has('test')) {
    $('start').classList.add('hidden');
    if (params.get('track')) settings.track = params.get('track');
    if (params.get('car')) { profile.owned[params.get('car')] ??= {}; profile.selected = params.get('car'); }
    if (params.has('rivals')) settings.rivals = +params.get('rivals');
    if (params.has('laps')) settings.laps = +params.get('laps');
    if (params.has('diff')) settings.diff = +params.get('diff');
    if (params.get('camMode')) settings.cam = params.get('camMode');
    mode = params.has('practice') ? 'practice' : params.has('battle') ? 'battle' : 'race';
    sfx.start();
    if (params.get('cup')) { mode = 'cup'; cup = { id: params.get('cup'), idx: +(params.get('cupIdx') || 0), table: {} }; }
    if (params.get('screen')) { sfx.startMusic('menu'); showScreen(params.get('screen')); if (params.get('screen') === 'm-cups') buildCups(); }
    else startRace();
  }
}

init().catch((err) => {
  console.error(err);
  $('loading').classList.remove('hidden');
  $('loading').innerHTML = `<p>Error al cargar: ${err.message}</p>`;
});
