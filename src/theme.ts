export type Theme = { color: string }; // base color as hex, e.g., '#4f46e5'

// Global brand default — update these to match your brand.
export const brandTheme: Theme = { color: '#4f46e5' }; // indigo-600

// Optional per-folder overrides. Keys should match album paths like 'images/<folder>'
export const folderThemes: Record<string, Theme> = {
  'images/chiang-mai-dam': { color: '#10b981' }, // emerald-500
  'images/danana-abc': { color: '#f43f5e' },     // rose-500
  'images/life': { color: '#a855f7' },           // violet-500
};

// Runtime overrides (editable via UI). These are not persisted to source by default.
let runtimeBrand: Theme | null = null;
let runtimeThemes: Record<string, Theme> = {};

export function setRuntimeBrand(t: Theme | null) { runtimeBrand = t; }
export function setRuntimeThemes(overrides: Record<string, Theme>) { runtimeThemes = overrides; }
export function getRuntimeThemes(): Record<string, Theme> { return runtimeThemes; }

export function themeForPath(path?: string): Theme {
  if (!path) return runtimeBrand ?? brandTheme;
  // Normalize to parent folder path, e.g., 'images/folder'
  const parts = path.split('/');
  if (parts.length >= 2) {
    const parent = parts.slice(0, -1).join('/');
    if (runtimeThemes[parent]) return runtimeThemes[parent];
    // Try full parent path (e.g., images/foo/bar)
    if (folderThemes[parent]) return folderThemes[parent];
    // Try immediate folder (e.g., images/foo)
    const parent2 = parts.slice(0, 2).join('/');
    if (runtimeThemes[parent2]) return runtimeThemes[parent2];
    if (folderThemes[parent2]) return folderThemes[parent2];
  }
  return runtimeBrand ?? brandTheme;
}

// LocalStorage helpers for overrides
const LS_KEY = 'themeOverrides:v2';
type StoredOverrides = { brand?: Theme; folders?: Record<string, Theme> };

export function loadOverridesFromStorage(): StoredOverrides | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredOverrides;
  } catch { return null; }
}

export function saveOverridesToStorage(data: StoredOverrides) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

// Utilities: generate gradient CSS from a theme color
export function gradientCss(theme: Theme): string {
  const base = hexToRgb(theme.color) ?? { r: 79, g: 70, b: 229 };
  const light = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.75);
  return `linear-gradient(135deg, rgba(${base.r}, ${base.g}, ${base.b}, 0.28) 0%, rgba(${light.r}, ${light.g}, ${light.b}, 0.16) 48%, rgba(${base.r}, ${base.g}, ${base.b}, 0.26) 100%)`;
}

// Overlay for photos: darker at bottom, fade to transparent at top
export function photoOverlayCss(theme: Theme): string {
  const base = hexToRgb(theme.color) ?? { r: 79, g: 70, b: 229 };
  const dark = `rgba(${base.r}, ${base.g}, ${base.b}, 0.55)`;
  const mid = `rgba(0,0,0,0.22)`;
  return `linear-gradient(to top, ${dark} 0%, ${mid} 45%, rgba(0,0,0,0) 100%)`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().toLowerCase().replace('#', '');
  if (m.length === 3) {
    const r = parseInt(m[0] + m[0], 16);
    const g = parseInt(m[1] + m[1], 16);
    const b = parseInt(m[2] + m[2], 16);
    return { r, g, b };
  }
  if (m.length === 6) {
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function mixRgb(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return {
    r: Math.round(a.r * (1 - t) + b.r * t),
    g: Math.round(a.g * (1 - t) + b.g * t),
    b: Math.round(a.b * (1 - t) + b.b * t),
  };
}
