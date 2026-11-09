// Parámetros base de conducción (fijos; cada coche los modifica con sus mods y mejoras).

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

// Valores fijos: no hay panel de ajustes en el juego (evita trampas). Se borran ajustes guardados antiguos.
export const tuning = {};
for (const d of TUNING_DEFS) tuning[d.key] = d.def;
Object.freeze(tuning);

try {
  for (const k of ['reback.tuning.v1', 'reback.tuning.v2', 'reback.tuning.v3', 'reback.tuning.v4']) localStorage.removeItem(k);
} catch { /* sin almacenamiento */ }
