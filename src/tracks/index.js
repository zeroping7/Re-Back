import salon from './salon.js';
import superm from './super.js';
import jardin from './jardin.js';

export const TRACKS = [salon, superm, jardin];
export const trackById = (id) => TRACKS.find((t) => t.id === id) || TRACKS[0];
