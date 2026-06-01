import i18n, { type Locale } from "../i18n";
import { setSfxMasterVolume } from "../services/sfx";

export interface GameSettings {
  fullscreen: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  sfxEnabled: boolean;
  sfxVolume: number;
  language: Locale;
}

const SETTINGS_KEY = "data-fever:settings";

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  fullscreen: false,
  musicEnabled: true,
  musicVolume: 0.45,
  sfxEnabled: true,
  sfxVolume: 0.75,
  language: "pl",
};

export function loadGameSettings(): GameSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_GAME_SETTINGS;

  try {
    return normalizeGameSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_GAME_SETTINGS;
  }
}

export function saveGameSettings(settings: GameSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function applyGameSettings(settings: GameSettings): void {
  setSfxMasterVolume(settings.sfxEnabled ? settings.sfxVolume : 0);
  if (i18n.language !== settings.language) void i18n.changeLanguage(settings.language);
}

function normalizeGameSettings(value: unknown): GameSettings {
  if (!value || typeof value !== "object") return DEFAULT_GAME_SETTINGS;
  const source = value as Partial<GameSettings>;
  return {
    fullscreen: Boolean(source.fullscreen),
    musicEnabled: source.musicEnabled ?? DEFAULT_GAME_SETTINGS.musicEnabled,
    musicVolume: clampVolume(source.musicVolume, DEFAULT_GAME_SETTINGS.musicVolume),
    sfxEnabled: source.sfxEnabled ?? DEFAULT_GAME_SETTINGS.sfxEnabled,
    sfxVolume: clampVolume(source.sfxVolume, DEFAULT_GAME_SETTINGS.sfxVolume),
    language: source.language === "en" ? "en" : "pl",
  };
}

function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}
