// src/services/dataMode.js
// Controls whether the app reads from the local preview-data JSON files
// (VITE_DATA_MODE=preview) or from the real backend (VITE_DATA_MODE=DB).
const mode = (import.meta.env.VITE_DATA_MODE || 'DB').toUpperCase();

export const DATA_MODE = mode === 'PREVIEW' ? 'preview' : 'DB';
export const isPreviewMode = DATA_MODE === 'preview';
