// Parámetros de conducción ajustables en vivo (se guardan en localStorage).
const KEY = 'reback.tuning.v4';

export const TUNING_DEFS = [
  { key: 'engine',      label: 'Potencia',              min: 40,  max: 400, step: 5,    def: 145 },
  { key: 'maxSpeed',    label: 'Velocidad máx.',        min: 10,  max: 70,  step: 1,    def: 29 },
  { key: 'rearBias',    label: 'Tracción trasera (%)',  min: 0,   max: 100, step: 5,    def: 90 },
  { key: 'brake',       label: 'Freno',                 min: 0.5, max: 12,  step: 0.5,  def: 10 },
  { key: 'steerMax',    label: 'Giro máx. (rad)',       min: 0.2, max: 0.9, step: 0.01, def: 0.3 },
  { key: 'steerSpeed',  label: 'Rapidez de giro',       min: 1,   max: 15,  step: 0.5,  def: 6 },
  { key: 'steerFalloff',label: 'Menos giro a alta vel.',min: 0,   max: 0.1, step: 0.005,def: 0.03 },
  { key: 'gripFront',   label: 'Agarre delantero',      min: 0.5, max: 8,   step: 0.1,  def: 3.0 },
  { key: 'gripRear',    label: 'Agarre trasero',        min: 0.5, max: 8,   step: 0.1,  def: 2.6 },
  { key: 'sideFront',   label: 'Rigidez lateral del.',  min: 0.2, max: 2,   step: 0.05, def: 1.0 },
  { key: 'sideRear',    label: 'Rigidez lateral tras.', min: 0.2, max: 2,   step: 0.05, def: 0.9 },
  { key: 'driftRear',   label: 'Agarre trasero al derrapar', min: 0.05,max: 1, step: 0.05, def: 0.45 },
  { key: 'suspStiff',   label: 'Suspensión dureza',     min: 5,   max: 120, step: 1,    def: 30 },
  { key: 'suspComp',    label: 'Amortig. compresión',   min: 0.5, max: 12,  step: 0.1,  def: 2.2 },
  { key: 'suspRelax',   label: 'Amortig. extensión',    min: 0.5, max: 12,  step: 0.1,  def: 2.8 },
  { key: 'suspRest',    label: 'Recorrido suspensión',  min: 0.1, max: 0.7, step: 0.01, def: 0.36 },
  { key: 'downforce',   label: 'Carga aerodinámica',    min: 0,   max: 0.4, step: 0.01, def: 0.06 },
  { key: 'airControl',  label: 'Control en el aire',    min: 0,   max: 30,  step: 1,    def: 14 },
  { key: 'gravity',     label: 'Gravedad',              min: 9,   max: 50,  step: 1,    def: 22 },
  { key: 'camDist',     label: 'Cámara distancia',      min: 3,   max: 12,  step: 0.1,  def: 6.2 },
  { key: 'camHeight',   label: 'Cámara altura',         min: 1,   max: 6,   step: 0.1,  def: 2.5 },
];

export const tuning = {};
for (const d of TUNING_DEFS) tuning[d.key] = d.def;

try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  for (const d of TUNING_DEFS) if (typeof saved[d.key] === 'number') tuning[d.key] = saved[d.key];
} catch { /* sin almacenamiento */ }

const listeners = new Set();
export function onTuningChange(fn) { listeners.add(fn); }

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(tuning)); } catch { /* nada */ }
  for (const fn of listeners) fn(tuning);
}

export function setupTuningPanel() {
  const panel = document.getElementById('tune-panel');
  const list = document.getElementById('tune-list');
  const inputs = {};

  for (const d of TUNING_DEFS) {
    const row = document.createElement('div');
    row.className = 'tune-row';
    const label = document.createElement('label');
    const name = document.createElement('span');
    name.textContent = d.label;
    const val = document.createElement('span');
    label.append(name, val);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = d.min; input.max = d.max; input.step = d.step;
    input.value = tuning[d.key];
    val.textContent = fmt(tuning[d.key]);
    input.addEventListener('input', () => {
      tuning[d.key] = parseFloat(input.value);
      val.textContent = fmt(tuning[d.key]);
      save();
    });
    inputs[d.key] = { input, val };
    row.append(label, input);
    list.append(row);
  }

  document.getElementById('btn-tune').addEventListener('click', () => panel.classList.toggle('hidden'));
  document.getElementById('tune-close').addEventListener('click', () => panel.classList.add('hidden'));
  document.getElementById('tune-default').addEventListener('click', () => {
    for (const d of TUNING_DEFS) {
      tuning[d.key] = d.def;
      inputs[d.key].input.value = d.def;
      inputs[d.key].val.textContent = fmt(d.def);
    }
    save();
  });
  document.getElementById('tune-copy').addEventListener('click', async (e) => {
    const txt = JSON.stringify(tuning);
    try { await navigator.clipboard.writeText(txt); e.target.textContent = '¡Copiado!'; }
    catch { prompt('Copia estos valores:', txt); }
    setTimeout(() => (e.target.textContent = 'Copiar valores'), 1500);
  });
}

function fmt(v) { return Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2); }
