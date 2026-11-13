import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import '@fontsource/russo-one/latin-400.css';
import { Race, FIXED, fmtTime, getBest } from './race.js';
import { TRACKS, trackById, trackFromKey, VARIANTS, variantUnlocked, tracksFor, trackUnlocked, trackNeeds } from './tracks/index.js';
import { DISCS, discById, discUnlocked, carAllowed, MODES, MEDALS, medalLevel, fmtPts } from './disciplines.js';
import { ARENA, battleTime } from './battle.js';
import { CARS, carById, UPGRADES, MAX_LEVEL, carTuning, tractionName, carNeeds, carUnlocked } from './cars.js';
import { carStats } from './carstats.js';
import {
  profile, isOwned, upgradesOf, ownedUpgrades, installedLevel, stepUpgrade, upgradeCost, sellValue, buyCar, sellCar, buyUpgrade, selectCar, raceReward, addMoney,
  onProfileChange, setCupResult, firstWin, takeStar, STAR_PRIZE, checkSecret, starsGot, useDisc, grantStarters, awardMedal,
} from './profile.js';
import { CUPS, cupById, cupUnlocked, cupPrize, cupPayout, addPoints, standings, POINTS, cupsFor } from './cups.js';
import { Showroom } from './showroom.js';
import { Controls } from './controls.js';
import { PadInput } from './gamepad.js';
import { Hud } from './hud.js';
import { Sfx } from './audio.js';
import { tuning } from './tuning.js';
import { DRIFT_DEFS, driftVals, applyDriftTune, resetDriftTune, driftText } from './driftTune.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FAST = params.has('test') ? +(params.get('fast') || 1) : 1;

const SKEY = 'reback.settings.v1';
const settings = { track: 'salon', variant: 'normal', car: 'pulga', laps: 3, rivals: 3, diff: 0.94, quality: 'alta', cam: 'normal', autoGas: false, cup: 'bronce', disc: 'race', trk: {}, lapsD: {}, ...load(SKEY) };
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
// consejos propios de Drift y Obstáculos
const TIPS_D = {
  drift: [
    'Gira y no sueltes el gas: el coche se cruza solo y el gas lo sostiene.',
    'Cuanto más rápido y más cruzado vayas, más puntos por segundo.',
    'El multiplicador sube cada 1,6 s de derrape seguido, hasta ×5.',
    'Enlaza un derrape con el siguiente en menos de 1 s para no perder el multiplicador.',
    'Si tocas un muro o haces un trompo, pierdes el combo que no hayas cobrado.',
    'Suelta el volante un segundo para cobrar el combo antes de una curva difícil.',
    'Con volante y gas a tope el coche se cruza cada vez más: contravolantea para sujetarlo.',
    'Parado, volante a tope y gas: donut. En marcha, gas + freno + volante: trompo de 360º.',
    'Un trompo de 360º sin pararte da muchos puntos y no corta el combo.',
  ],
  obst: [
    'Si te caes de un puente, vuelves a la pista en el último punto. Perder tiempo es el castigo.',
    'Las barreras y las barras siempre se mueven igual: apréndete el ritmo.',
    'El ventilador y la cascada empujan de lado: entra pegado al lado contrario.',
    'Los badenes se pasan mejor rectos y sin frenar a fondo.',
    'En el jabón no gires de golpe: suelta un poco el gas.',
    'Los coches trepadores son lentos, pero no rebotan ni se salen.',
  ],
};

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
  document.querySelectorAll('.app-version').forEach((e) => { e.textContent = __APP_VERSION__ === 'dev' ? 'dev' : 'v' + __APP_VERSION__; }); // la pone el CI

  // ---------- Pantallas ----------
  const screens = ['m-main', 'm-disc', 'm-setup', 'm-settings', 'm-pause', 'm-results', 'm-garage', 'm-cups', 'm-podium', 'm-dtune'];
  const VIEW = { 'm-main': 'main', 'm-disc': 'main', 'm-settings': 'main', 'm-setup': 'car', 'm-garage': 'car', 'm-cups': 'car' };
  function showScreen(id) {
    for (const s of screens) $(s).classList.toggle('hidden', s !== id);
    $('money').classList.toggle('hidden', !['m-main', 'm-disc', 'm-setup', 'm-garage', 'm-results', 'm-cups', 'm-podium'].includes(id));
    if (VIEW[id]) { room.setView(VIEW[id]); room.showCar(id === 'm-garage' ? (gSel ||= profile.selected) : profile.selected); }
    if (id === 'm-garage') buildGarage();
    if (id === 'm-disc') buildDiscs();
    $('btn-dtune').classList.toggle('hidden', disc !== 'drift');
    $('btn-dtune-setup').classList.toggle('hidden', disc !== 'drift' || mode === 'battle');
  }
  let garageReturn = null; // pantalla de origen si el garaje se abrió desde "Más coches" (UX-21)
  const leaveGarage = () => { const r = garageReturn; garageReturn = null; if (r) { r.rebuild(); showScreen(r.screen); } else showScreen('m-main'); };
  let mode = 'race'; // 'race' | 'practice' | 'cup' | 'battle' | 'solo'
  let disc = discUnlocked(settings.disc, profile.cups) ? settings.disc : 'race'; // disciplina en curso (DIS-02)
  let cup = null; // { id, idx, table }
  grantStarters();
  const D = () => discById(disc);
  const modeDef = (m = mode) => MODES[disc].find((x) => x.go === m) || MODES[disc][0];
  const defTrack = { race: 'salon', drift: 'cocina', obst: 'senda' };
  const curTrack = () => { const id = disc === 'race' ? settings.track : settings.trk[disc]; return tracksFor(disc).some((t) => t.id === id || (t.revName && t.id + ':rev' === id)) ? id : defTrack[disc]; }; // CRW-26: 'senda:rev' = bajada como pista propia
  const setTrack = (id) => { if (disc === 'race') settings.track = id; else settings.trk[disc] = id; saveSettings(); };
  const LAPS = { race: [2, 3, 5], drift: [2, 3], obst: [1, 2, 3] };
  const curLaps = () => (disc === 'race' ? settings.laps : trackById(curTrack()).oneWay ? 1 : settings.lapsD[disc] ?? 2);

  // entrar en un modo de una disciplina
  function enter(d, go) {
    disc = d; settings.disc = d; saveSettings();
    useDisc(d);
    if (go === 'cups') { buildCups(); showScreen('m-cups'); return; }
    mode = go;
    $('setup-title').textContent = `${D().icon} ${disc === 'race' ? modeDef().name : D().name + ' · ' + modeDef().name}`;
    $('race-opts').style.display = go === 'race' ? '' : 'none';
    $('m-setup').classList.remove('battle');
    const info = { 'drift:solo': '🎯 2 vueltas tú solo. Ve de lado para sumar puntos y consigue medalla.', 'drift:race': '⚔️ Gana quien más puntos de derrape tenga cuando acabes tus vueltas.', 'obst:solo': '⏱ Una vuelta contra el reloj, con el fantasma de tu mejor tiempo.', 'obst:race': '🏁 Todos a la vez por el recorrido de obstáculos. Sin armas.' }[`${disc}:${go}`];
    $('setup-info').textContent = info || ''; $('setup-info').classList.toggle('hidden', !info);
    $('btn-go').textContent = disc === 'drift' ? '¡A derrapar!' : disc === 'obst' ? '¡Al lío!' : '¡A correr!';
    buildSetup();
    showScreen('m-setup');
  }

  // DIS-01: selector de disciplina, con los modos de cada una
  function buildDiscs() {
    const el = $('discs'); el.innerHTML = '';
    for (const d of DISCS) {
      const open = discUnlocked(d.id, profile.cups);
      const col = document.createElement('div');
      col.className = 'disc-col' + (open ? '' : ' locked') + (d.id === disc ? ' cur' : '');
      col.style.setProperty('--c', d.color);
      col.innerHTML = `<div class="disc-ic">${open ? d.icon : '🔒'}</div><b>${d.name}</b><small>${d.desc}</small>`;
      if (open) {
        for (const m of MODES[d.id]) {
          const b = document.createElement('button');
          b.className = 'big-btn' + (m.go === MODES[d.id][0].go ? '' : ' alt');
          b.innerHTML = `<span>${m.icon}</span>${m.name}`;
          b.addEventListener('click', () => { sfx.play('click'); enter(d.id, m.go); });
          col.append(b);
        }
      } else {
        const p = document.createElement('p'); p.className = 'lock';
        p.innerHTML = `Queda entre los 3 primeros de la <b>${d.needsName}</b> para abrirla.<br>Te regalamos su primer coche.`;
        col.append(p);
      }
      el.append(col);
    }
  }

  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    sfx.play('click');
    const go = b.dataset.go;
    if (go === 'main' && b.closest('#m-garage')) { leaveGarage(); return; }
    if (go === 'battle') {
      mode = go; disc = 'race'; useDisc('race');
      $('setup-title').textContent = 'Batalla de la Estrella';
      $('race-opts').style.display = '';
      $('setup-info').classList.add('hidden');
      $('btn-go').textContent = '¡A correr!';
      $('m-setup').classList.add('battle');
      buildSetup();
      showScreen('m-setup');
    } else if (go === 'back') showScreen(mode === 'battle' ? 'm-main' : 'm-disc');
    else if (go === 'garage') { garageReturn = null; gDisc = disc; gSel = useDisc(gDisc) || profile.selected; showScreen('m-garage'); }
    else showScreen('m-' + go);
  }));
  let lastMoney = profile.money;
  function updateMoney(bump) {
    $('money-n').textContent = profile.money.toLocaleString('es-ES');
    const changed = profile.money !== lastMoney; lastMoney = profile.money;
    if (bump && changed) { $('money').classList.remove('bump'); void $('money').offsetWidth; $('money').classList.add('bump'); }
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
        // UX-29: marca según el valor guardado (si set() redibujó el selector, los botones ya son otros)
        el.querySelectorAll('button').forEach((x, i) => x.classList.toggle('sel', get() === options[i]?.[0]));
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
    for (const d of CARS.filter((x) => isOwned(x.id) && carAllowed(x, disc))) {
      const c = document.createElement('button');
      c.className = 'card' + (profile.selected === d.id ? ' sel' : '');
      const bar = (n, v) => `<div class="bar">${n}<i style="--v:${v * 20}%"></i></div>`;
      const st = carStats(d, disc, upgradesOf(d.id)); // COC-07: medidas reales, con mejoras
      c.innerHTML = `${carPv(d)}<b>${d.name}</b><small>${d.clase} · ${d.motor}</small>` +
        bar('Vel', st.vel) + bar('Ace', st.acel) + bar('Man', st.manejo);
      c.addEventListener('click', () => { selectCar(d.id, disc); sfx.play('click'); room.showCar(d.id); rebuild(); });
      // UX-22: botón para abrir el garaje directamente en este coche
      const g = document.createElement('span');
      g.className = 'gbtn'; g.textContent = '🔧'; g.title = 'Garaje';
      g.addEventListener('click', (e) => {
        e.stopPropagation(); sfx.play('click');
        selectCar(d.id, disc);
        garageReturn = { screen: screens.find((x) => !$(x).classList.contains('hidden')) || 'm-setup', rebuild };
        gDisc = disc; gSel = d.id; showScreen('m-garage');
      });
      c.append(g);
      el.append(c);
    }
    if (CARS.some((x) => !isOwned(x.id) && carAllowed(x, disc) && !x.secret)) {
      const c = document.createElement('button');
      c.className = 'card locked';
      c.innerHTML = '<div class="sw pv more">🔒</div><b>Más coches</b><small>Gana carreras y cómpralos en el Garaje</small>';
      c.addEventListener('click', () => { sfx.play('click'); garageReturn = { screen: screens.find((x) => !$(x).classList.contains('hidden')) || 'm-setup', rebuild }; gDisc = disc; gSel = profile.selected; showScreen('m-garage'); });
      el.append(c);
    }
  }

  const trackKey = () => curTrack().includes(':') ? curTrack() : curTrack() + (settings.variant && settings.variant !== 'normal' && !trackById(curTrack()).oneWay ? ':' + settings.variant : ''); // CRW-18: tramos A→B sin variantes
  const medalIcon = (key) => { const l = profile.medals[key] || 0; return l ? MEDALS[l - 1].icon : ''; };
  function buildSetup() {
    if (!variantUnlocked(settings.variant, profile.cups)) settings.variant = 'normal';
    if (!trackUnlocked(curTrack(), profile.cups)) setTrack(defTrack[disc]); // ECO-11
    const tracks = $('tracks'); tracks.innerHTML = '';
    const cur = curTrack(), vr = trackById(cur).oneWay ? 'normal' : settings.variant || 'normal';
    const entries = tracksFor(disc).flatMap((t) => (t.oneWay && t.revName ? [[t, t.id], [t, t.id + ':rev']] : [[t, t.id]])); // CRW-26
    for (const [t, id] of entries) {
      const key = id.includes(':') ? id : t.id + (vr !== 'normal' ? ':' + vr : '');
      const best = getBest(key);
      const c = document.createElement('button');
      if (!trackUnlocked(t.id, profile.cups)) { // ECO-11: circuito que se abre con una copa
        const cupName = cupById(trackNeeds(t.id)).name;
        c.className = 'card locked';
        c.innerHTML = `${trackPv(t, '')}<b>🔒 ${t.name}</b><small>Queda entre los 3 primeros de la ${cupName}</small>`;
        c.addEventListener('click', () => { sfx.play('click'); toast(`🔒 Queda entre los 3 primeros de la ${cupName}`); });
        tracks.append(c);
        continue;
      }
      c.className = 'card' + (cur === id ? ' sel' : '') + (vr !== 'normal' ? ' v-' + vr : '');
      const star = disc === 'race' && mode === 'practice' && vr === 'normal' ? `<span class="star ${profile.stars[t.id] ? 'got' : ''}">${profile.stars[t.id] ? '⭐' : '☆'}</span>` : '';
      const ghost = (mode === 'practice' || (disc === 'obst' && mode === 'solo')) && hasGhost(key) ? '<span class="ghost-ic">👻</span>' : '';
      const medal = disc !== 'race' && medalIcon(key) ? `<span class="star got">${medalIcon(key)}</span>` : '';
      const rec = disc === 'drift' ? `💨 ${best.score ? fmtPts(best.score) + ' pts' : '— pts'}` : disc === 'obst' ? `⏱ ${fmtTime(best.race)}` : `⏱ ${fmtTime(best.lap)}`;
      c.innerHTML = `${trackPv(t, star + ghost + medal)}<b>${trackFromKey(key).name}</b><small>${id.includes(':') ? t.revDesc || t.desc : t.desc}</small>` +
        `<div class="rec">${rec}${best.wins ? ' · 🏆' + best.wins : ''}</div>`;
      c.addEventListener('click', () => { setTrack(id); sfx.play('click'); buildSetup(); });
      tracks.append(c);
    }
    // sentido: normal, al revés, espejo (UX-13)
    const vEl = $('opt-variant'); vEl.innerHTML = '';
    if (disc === 'obst' && settings.variant === 'mirror') settings.variant = 'normal'; // sin espejo en Obstáculos
    for (const V of VARIANTS) {
      if (disc === 'obst' && V.id === 'mirror') continue;
      if (trackById(cur).oneWay && V.id !== 'normal') continue;
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
    seg('opt-laps', (trackById(cur).oneWay ? [1] : LAPS[disc]).map((n) => [n, String(n)]), curLaps, (v) => { if (disc === 'race') settings.laps = v; else settings.lapsD[disc] = v; saveSettings(); });
    if (mode === 'battle') seg('opt-rivals', [[5, '5'], [10, '10']], () => (settings.bRivals === 10 ? 10 : 5), (v) => { settings.bRivals = v; saveSettings(); }); // UX-28
    else seg('opt-rivals', disc === 'drift' ? [[1, '1'], [2, '2'], [3, '3']] : [[1, '1'], [3, '3'], [5, '5']], () => (disc === 'drift' ? Math.min(3, settings.rivals) : settings.rivals), (v) => { settings.rivals = v; saveSettings(); });
    seg('opt-diff', [[0.86, 'Fácil'], [0.94, 'Normal'], [1.02, 'Difícil']], () => settings.diff, (v) => { settings.diff = v; saveSettings(); });
  }

  // ---------- Campeonato ----------
  function buildCups() {
    const el = $('cups'); el.innerHTML = '';
    const list = cupsFor(disc);
    $('cups-title').textContent = disc === 'race' ? 'Campeonato' : `${D().icon} ${list[0].name}`;
    if (!list.some((c) => c.id === settings.cup) || !cupUnlocked(cupById(settings.cup), profile.cups)) settings.cup = list[0].id;
    for (const c of list) {
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
    for (const id of ['opt-assist', 'opt-assist2']) seg(id, [[true, 'Sí'], [false, 'No']], () => controls.assist, (v) => { controls.setAssist(v); buildSettings(); }); // UX-30
    for (const id of ['opt-sens', 'opt-sens2']) seg(id, [[0.6, '60%'], [0.8, '80%'], [1, '100%'], [1.25, '125%'], [1.5, '150%']], () => controls.sens, (v) => { controls.setSens(v); buildSettings(); }); // UX-29
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
  let gSel = null, gDisc = 'race';
  const statVals = (def, up) => { // COC-07: igual que las tarjetas (medidas reales, 1-5 con decimales)
    const st = carStats(def, gDisc, up);
    return [['Velocidad', st.vel], ['Aceleración', st.acel], ['Manejo', st.manejo]];
  };
  function buildGarage() {
    // DIS-03: pestañas por disciplina
    const tabs = $('g-tabs'); tabs.innerHTML = '';
    for (const dd of DISCS) {
      const open = discUnlocked(dd.id, profile.cups);
      const b = document.createElement('button');
      b.textContent = `${open ? dd.icon : '🔒'} ${dd.name}`;
      b.classList.toggle('sel', gDisc === dd.id); b.classList.toggle('locked', !open);
      b.addEventListener('click', () => {
        sfx.play('click');
        if (!open) { toast(`🔒 Queda entre los 3 primeros de la ${dd.needsName}`); return; }
        gDisc = dd.id; gSel = useDisc(gDisc) || CARS.find((x) => carAllowed(x, gDisc)).id; room.showCar(gSel); buildGarage();
      });
      tabs.append(b);
    }
    if (!gSel || !carAllowed(carById(gSel), gDisc)) gSel = profile.sel[gDisc] && carAllowed(carById(profile.sel[gDisc]), gDisc) ? profile.sel[gDisc] : CARS.find((x) => carAllowed(x, gDisc)).id;
    const inUse = (id) => profile.sel[gDisc] === id;
    const list = $('g-cars'); list.innerHTML = '';
    for (const d of CARS.filter((x) => carAllowed(x, gDisc))) {
      const own = isOwned(d.id), hidden = d.secret && !own;
      const c = document.createElement('button');
      c.className = 'card' + (gSel === d.id ? ' sel' : '') + (own ? '' : ' locked') + (hidden ? ' secret' : '');
      c.innerHTML = hidden
        ? `${carPv(d)}<b>❓ Secreto</b><small>Consigue todas las estrellas</small><div class="price">⭐ ${starsGot()}/${TRACKS.length}</div>`
        : `${carPv(d)}<b>${own ? '' : '🔒 '}${d.name}</b><small>${d.clase}</small>` +
        (own ? `<div class="own">${inUse(d.id) ? '✔ En uso' : 'Tuyo'}</div>` : `<div class="price">🪙 ${coins(d.price)}${carUnlocked(d, profile.cups) ? '' : ' · ' + cupById(carNeeds(d)).icon}</div>`);
      c.addEventListener('click', () => { gSel = d.id; sfx.play('click'); room.showCar(d.id); buildGarage(); });
      list.append(c);
    }
    const d = carById(gSel), own = isOwned(gSel), up = upgradesOf(gSel), raw = ownedUpgrades(gSel); // up = activas, raw = compradas
    $('g-name').textContent = d.name;
    $('g-desc').textContent = d.desc;
    $('g-spec').innerHTML = [
      ['🏷', d.clase], [d.motor === 'Nitro' ? '⛽' : '🔋', d.motor], ['⚙', tractionName(d, tuning.rearBias)],
      ['⚖', `${(d.mass * 0.2).toFixed(1).replace('.', ',')} kg`],
    ].map(([i, t]) => `<span>${i} ${t}</span>`).join('');
    const base = statVals(d, {}), now = statVals(d, up);
    $('g-stats').innerHTML = base.map(([n, v], i) => {
      const b = Math.max(2, Math.min(100, v * 20));
      const u = Math.max(0, Math.min(100 - b, (now[i][1] - v) * 20));
      const num = now[i][1].toFixed(1).replace('.', ',');
      return `<div class="bar"><span>${n}</span><i style="--b:${b}%;--u:${u}%"></i><em>${num}</em></div>`;
    }).join('');
    const act = $('g-actions'); act.innerHTML = '';
    const btn = (label, cls, ok, fn) => { const b = document.createElement('button'); b.innerHTML = label; b.className = cls; b.disabled = !ok; b.onclick = fn; act.append(b); };
    if (d.secret && !own) {
      $('g-name').textContent = '❓ Coche secreto';
      $('g-desc').textContent = `Consigue las ${TRACKS.length} estrellas ocultas en Contrarreloj (llevas ${starsGot()})`;
      btn(`⭐ ${starsGot()}/${TRACKS.length}`, 'buy', false, () => {});
    } else if (!own && !carUnlocked(d, profile.cups)) { // ECO-12
      $('g-desc').textContent = `${d.desc} · 🔒 Queda entre los 3 primeros de la ${cupById(carNeeds(d)).name} para poder comprarlo`;
      btn(`🔒 ${cupById(carNeeds(d)).name} · 🪙 ${coins(d.price)}`, 'buy', false, () => {});
    } else if (!own) {
      btn(`Comprar · 🪙 ${coins(d.price)}`, 'buy', profile.money >= d.price, () => { if (buyCar(d.id, gDisc)) { sfx.play('finish'); buildGarage(); } });
    } else {
      btn(inUse(d.id) ? '✔ En uso' : 'Usar este', 'use', !inUse(d.id), () => { selectCar(d.id, gDisc); sfx.play('click'); if (garageReturn) leaveGarage(); else buildGarage(); });
      const many = Object.keys(profile.owned).length > 1 && !d.starter;
      btn(`Vender · +🪙 ${coins(sellValue(d.id))}`, '', many, () => {
        if (confirm(`¿Vender ${d.name} por ${sellValue(d.id)} monedas?`) && sellCar(d.id)) { sfx.play('pass'); gSel = useDisc(gDisc) || null; buildGarage(); room.showCar(gSel); }
      });
    }
    const ups = $('g-ups'); ups.innerHTML = '';
    for (const u of UPGRADES) {
      const lvl = raw[u.id] || 0, cost = upgradeCost(d.id, u.id), ins = installedLevel(d.id, u.id);
      const row = document.createElement('div'); row.className = 'up-row' + (lvl && !ins ? ' off' : '');
      // ● montado · ◌ comprado pero quitado · ○ sin comprar
      row.innerHTML = `<div class="nm">${u.icon} ${u.name}<small>${u.desc}</small></div><div class="pips">${'●'.repeat(ins)}${'◌'.repeat(lvl - ins)}${'○'.repeat(MAX_LEVEL - lvl)}</div>`;
      if (own && lvl) { // UX-23: quitar / poner un nivel de la mejora ya comprada
        const mk = (txt, d2, ok) => {
          const t = document.createElement('button'); t.className = 'tg'; t.textContent = txt; t.disabled = !ok;
          t.onclick = () => { if (stepUpgrade(d.id, u.id, d2)) { sfx.play('click'); buildGarage(); } };
          row.append(t);
        };
        mk('−', -1, ins > 0); mk('+', 1, ins < lvl);
      }
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
      return { track: c.tracks[cup.idx], laps: c.laps, rivals: c.rivals, diff: c.diff, practice: false, kind: `${c.icon} ${c.name} · Prueba ${cup.idx + 1} de ${c.tracks.length}` };
    }
    if (mode === 'battle') return { track: 'arena', battle: true, laps: 1, rivals: settings.bRivals === 10 ? 10 : 5, diff: settings.diff, practice: false, kind: '⭐ Batalla de la Estrella' };
    if (mode === 'solo') return { track: trackKey(), laps: disc === 'drift' ? 2 : 1, rivals: 0, diff: 1, practice: false, solo: true, kind: `${modeDef().icon} ${D().name} · ${modeDef().name}` };
    if (mode === 'practice') return { track: trackKey(), laps: 3, rivals: 0, diff: 1, practice: true, kind: '⏱ Contrarreloj' };
    return { track: trackKey(), laps: curLaps(), rivals: disc === 'drift' ? Math.min(3, settings.rivals) : settings.rivals, diff: settings.diff, practice: false, kind: disc === 'race' ? '🏁 Carrera rápida' : `${modeDef().icon} ${D().name} · ${modeDef().name}` };
  }
  const medalGoals = (def) => (def.medals ? MEDALS.map((m, i) => `${m.icon} ${def.disc === 'drift' ? fmtPts(def.medals[i]) : fmtTime(def.medals[i])}`).join(' · ') : '');

  function showLoading(def, cfg) {
    $('ld-kind').textContent = cfg.kind;
    $('ld-name').textContent = def.name;
    $('ld-desc').textContent = cfg.solo ? `${def.desc} · ${medalGoals(def)}` : cfg.battle ? `${def.desc} · ${cfg.rivals + 1} coches · reloj de ${battleTime(cfg.rivals + 1)} s` : def.desc + (cfg.practice && def.variant ? '' : cfg.practice ? (profile.stars[def.id] ? ' · ⭐ estrella conseguida' : ' · ☆ busca la estrella') : ` · ${cfg.laps} vueltas · ${cfg.rivals + 1} coches`);
    const tips = TIPS_D[def.disc] || TIPS;
    $('ld-tip').textContent = '💡 ' + tips[Math.floor(Math.random() * tips.length)];
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
        star: cfg.practice && !def.variant && !def.disc ? { taken: !!profile.stars[def.id] } : null,
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
      r.items.warm(true);
      try { await Promise.race([renderer.compileAsync(r.scene, r.camera), wait(4000)]); } catch { /* nada */ }
      r.items.warm(false);
      await wait(Math.max(0, (params.has('test') ? 0 : 1400) - (performance.now() - t0)));
      if (token !== loadToken) { r.dispose(); return; }
      race = r;
      resize();
      $('loading').classList.add('hidden');
      $('hud').classList.remove('hidden');
      sfx.startMusic('race', cfg.battle ? 'batalla' : def.music || def.id);
      sfx.startAmbient(cfg.battle ? 'salon' : def.ambient || def.id);
    }, 30));
  }
  $('btn-go').addEventListener('click', () => { sfx.play('click'); startRace(); });

  // DRI-13: ajuste del handling de drift (solo en la disciplina Drift)
  applyDriftTune();
  let dtBack = 'm-pause';
  function buildDtune() {
    const box = $('dt-list'); box.innerHTML = '';
    let g = null;
    for (const d of DRIFT_DEFS) {
      if (d.g !== g) { g = d.g; const h = document.createElement('h3'); h.textContent = g; box.append(h); }
      const row = document.createElement('div'); row.className = 'dt-row';
      const lab = document.createElement('span'); lab.textContent = d.label;
      const inp = document.createElement('input'); inp.type = 'range'; inp.min = d.min; inp.max = d.max; inp.step = d.step; inp.value = driftVals[d.key];
      const out = document.createElement('output');
      const show = () => { out.textContent = +(+inp.value).toFixed(3); row.classList.toggle('chg', +inp.value !== d.def); };
      show();
      inp.addEventListener('input', () => { driftVals[d.key] = +inp.value; show(); applyDriftTune(); if (race) race.applyTuning(tuning); $('dt-text').textContent = driftText(); });
      row.append(lab, inp, out); box.append(row);
    }
    $('dt-text').textContent = driftText();
  }
  const openDtune = (back) => { dtBack = back; buildDtune(); showScreen('m-dtune'); };
  $('btn-dtune').addEventListener('click', () => { sfx.play('click'); openDtune('m-pause'); });
  $('btn-dtune-setup').addEventListener('click', () => { sfx.play('click'); openDtune('m-setup'); });
  $('dt-back').addEventListener('click', () => { sfx.play('click'); showScreen(dtBack); });
  $('dt-reset').addEventListener('click', () => { sfx.play('click'); resetDriftTune(); if (race) race.applyTuning(tuning); buildDtune(); });
  $('dt-copy').addEventListener('click', () => {
    sfx.play('click');
    try { navigator.clipboard.writeText(driftText()); toast('📋 Valores copiados'); } catch { toast('Mantén pulsado el texto para copiarlo'); }
  });

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
    const def = cfg.battle ? ARENA : trackFromKey(cfg.track), drift = def.disc === 'drift';
    const me = res.find((r) => r.player);
    if (inCup) addPoints(cup, res);
    $('res-kind').textContent = `${cfg.kind} · ${def.name}`;
    let reward = 0, title = me.place === 1 ? '🏆 ¡Has ganado!' : `Has quedado ${me.place}º`;
    if (cfg.solo) { // DEC-01: medalla por puntos (drift) o por tiempo (obstáculos)
      const value = drift ? me.score : me.time, lvl = medalLevel(def, value), got = awardMedal(def.key || def.id, lvl);
      reward = got.reward;
      title = lvl ? `${MEDALS[lvl - 1].icon} ¡Medalla de ${MEDALS[lvl - 1].name.toLowerCase()}!${got.isNew ? '' : ' (repetida)'}` : 'Sin medalla… ¡otra vez!';
    } else reward = raceReward(me.place, res.length, cfg.battle ? 2 : cfg.laps, cfg.diff, def.disc || 'race'); // ECO-02 (la Batalla paga como 2 vueltas)
    $('res-title').textContent = title;
    $('res-table').innerHTML = res.map((r) => `<tr class="${r.player ? 'me' : ''}"><td>${cfg.solo ? '' : r.place + 'º'}</td><td><span class="dot" style="background:${r.color}"></span>${r.name}</td>` +
      (drift ? `<td class="pts">${fmtPts(r.score)} pts</td>` : `<td>${r.finished ? fmtTime(r.time) : '—'}</td>`) +
      `<td>⏱ ${fmtTime(drift ? (r.finished ? r.time : 0) : r.best)}</td>${inCup ? `<td class="pts">+${POINTS[r.place - 1] || 0}</td>` : ''}</tr>`).join('');
    if (reward && !cfg.solo) addMoney(reward);
    const first = !cfg.solo && !cfg.battle && me.place === 1 ? firstWin(def.id, cfg.diff, res.length) : 0; // ECO-13
    $('res-reward').textContent = (reward ? `+ 🪙 ${coins(reward)}` : '') + (first ? ` · 🎯 Primera victoria aquí: + 🪙 ${coins(first)}` : '');
    $('res-cup').classList.toggle('hidden', !inCup);
    document.querySelector('#m-results .res-col').classList.toggle('wide', inCup);
    if (inCup) $('cup-table').innerHTML = standingsRows(standings(cup));
    const best = getBest(cfg.track);
    $('res-best').textContent = cfg.battle ? 'Tiempo = segundos que cada uno llevó la estrella'
      : cfg.solo ? `Tu récord: ${drift ? fmtPts(best.score || 0) + ' pts' : fmtTime(best.race)} · Medallas: ${medalGoals(def)}`
        : drift ? `Tu récord en este circuito: ${fmtPts(best.score || 0)} pts` : `Récord del circuito: vuelta ${fmtTime(best.lap)} · carrera ${fmtTime(best.race)}`;
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
        btn('Siguiente prueba ▶', '', () => { cup.idx++; startRace(); });
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
    const prev = profile.cups[c.id], prize = cupPayout(c, place, prev), repeat = prize && prize < cupPrize(c, place); // ECO-10
    const before = CUPS.map((x) => cupUnlocked(x, profile.cups));
    const closedT = TRACKS.filter((t) => !trackUnlocked(t.id, profile.cups)), closedC = CARS.filter((x) => !carUnlocked(x, profile.cups));
    setCupResult(c.id, place);
    if (prize) addMoney(prize);
    const opened = CUPS.filter((x, i) => !before[i] && cupUnlocked(x, profile.cups));
    const newDiscs = grantStarters(); // DIS-04
    loadToken++;
    if (race) { race.dispose(); race = null; }
    $('hud').classList.add('hidden');
    $('pod-title').textContent = `${c.icon} ${c.name}`;
    $('pod-sub').textContent = place === 1 ? '¡Eres el campeón!' : place <= 3 ? `¡Al podio! Has quedado ${place}º` : `Has quedado ${place}º. ¡La próxima vez!`;
    $('pod-table').innerHTML = standingsRows(table);
    $('pod-reward').textContent = prize ? `Premio de la copa: + 🪙 ${coins(prize)}${repeat ? (place < prev ? ' (por mejorar tu puesto)' : ' (copa repetida)') : ''}` : 'Sin premio: hay que acabar entre los 3 primeros';
    const newT = closedT.filter((t) => trackUnlocked(t.id, profile.cups)), newC = closedC.filter((x) => carUnlocked(x, profile.cups));
    $('pod-unlock').innerHTML = [opened.length ? `🔓 ¡${opened.map((x) => x.name).join(' y ')} desbloqueada!` : '',
      newT.length ? `🗺️ Circuito${newT.length > 1 ? 's' : ''} nuevo${newT.length > 1 ? 's' : ''}: <b>${newT.map((t) => t.name).join(' y ')}</b>` : '',
      newC.length ? `🚗 Ya puedes comprar: <b>${newC.map((x) => x.name).join(' y ')}</b>` : '',
      ...newDiscs.map((d) => `${d.icon} ¡Nueva disciplina: <b>${d.name}</b>! Regalo: ${carById(d.starter).name}`)].filter(Boolean).join('<br>');
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
      for (let k = 1; k < FAST; k++) race.update(0.08); // ?fast=N: acelera las pruebas en Chrome headless
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
    get race() { return race; }, get cup() { return cup; }, get disc() { return disc; }, enter,
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
    if (params.get('variant')) settings.variant = params.get('variant');
    if (params.get('track')) settings.track = params.get('track');
    if (params.get('car')) { profile.owned[params.get('car')] ??= {}; profile.selected = params.get('car'); }
    if (params.has('rivals')) settings.rivals = settings.bRivals = +params.get('rivals');
    if (params.has('laps')) settings.laps = +params.get('laps');
    if (params.has('diff')) settings.diff = +params.get('diff');
    if (params.get('camMode')) settings.cam = params.get('camMode');
    mode = params.has('practice') ? 'practice' : params.has('battle') ? 'battle' : params.has('solo') ? 'solo' : 'race';
    if (params.get('track')) { disc = trackById(params.get('track')).disc || 'race'; settings.trk[disc] = params.get('track'); }
    if (params.get('disc')) disc = params.get('disc');
    if (params.has('unlock')) { profile.cups.bronce = 1; profile.cups.plata = 1; profile.cups.oro = 1; grantStarters(); }
    if (!params.get('car')) useDisc(disc);
    sfx.start();
    if (params.get('cup')) { mode = 'cup'; cup = { id: params.get('cup'), idx: +(params.get('cupIdx') || 0), table: {} }; }
    if (params.get('screen')) { sfx.startMusic('menu'); showScreen(params.get('screen')); if (params.get('screen') === 'm-cups') buildCups(); if (params.get('screen') === 'm-setup') enter(disc, mode === 'solo' ? 'solo' : mode); }
    else startRace();
  }
}

init().catch((err) => {
  console.error(err);
  $('loading').classList.remove('hidden');
  $('loading').innerHTML = `<p>Error al cargar: ${err.message}</p>`;
});
