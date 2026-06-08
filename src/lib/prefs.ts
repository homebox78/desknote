// Appearance / behavior preferences, persisted to localStorage and applied as
// CSS variables / classes on <html>. Pure client-side; no backend.

export type Tone = "ink" | "graphite" | "steel";
export type Density = "comfortable" | "compact";
export type AutoLock = "off" | "5" | "15" | "30";

export interface Prefs {
  tone: Tone;
  density: Density;
  sidebarWidth: number; // px
  fullWidth: boolean;
  fontScale: number; // percent (90–120)
  autoLock: AutoLock;
  autoBackup: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  tone: "ink",
  density: "comfortable",
  sidebarWidth: 260,
  fullWidth: true,
  fontScale: 100,
  autoLock: "off",
  autoBackup: true,
};

export const TONE_COLORS: Record<Tone, string> = {
  ink: "#161618",
  graphite: "#33353a",
  steel: "#54565c",
};

const KEY = "desknote-prefs";

export function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(p: Prefs): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

/** Apply prefs to the document (CSS vars + classes). */
export function applyPrefs(p: Prefs): void {
  const r = document.documentElement;
  r.style.setProperty("--accent-pick", TONE_COLORS[p.tone] ?? TONE_COLORS.ink);
  r.style.setProperty("--side-w", `${p.sidebarWidth}px`);
  r.style.setProperty("--fs", String(p.fontScale / 100));
  r.classList.toggle("density-compact", p.density === "compact");
  r.classList.toggle("narrow-doc", !p.fullWidth);
}
