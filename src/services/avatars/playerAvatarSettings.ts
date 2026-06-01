import { create } from "zustand";

const BLOCK_SIZE_OVERRIDE_KEY = "data_fever.avatar.blockSizeOverride";
const DEFAULT_AVATAR_BLOCK_SIZE = 8;
const MIN_AVATAR_BLOCK_SIZE = 2;
const MAX_AVATAR_BLOCK_SIZE = 32;

interface PlayerAvatarSettingsState {
  envBlockSize: number;
  blockSize: number;
  blockSizeSource: "env" | "admin";
  setBlockSizeOverride(blockSize: number): void;
  resetBlockSizeOverride(): void;
}

export const usePlayerAvatarSettings = create<PlayerAvatarSettingsState>(set => {
  const envBlockSize = getEnvBlockSize();
  const blockSizeOverride = getStoredBlockSizeOverride();

  return {
    envBlockSize,
    blockSize: blockSizeOverride ?? envBlockSize,
    blockSizeSource: blockSizeOverride ? "admin" : "env",
    setBlockSizeOverride(blockSize) {
      const normalized = normalizeBlockSize(blockSize);
      safeLocalStorageSet(BLOCK_SIZE_OVERRIDE_KEY, String(normalized));
      set({
        blockSize: normalized,
        blockSizeSource: "admin",
      });
    },
    resetBlockSizeOverride() {
      safeLocalStorageRemove(BLOCK_SIZE_OVERRIDE_KEY);
      set(state => ({
        blockSize: state.envBlockSize,
        blockSizeSource: "env",
      }));
    },
  };
});

export function normalizeBlockSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_AVATAR_BLOCK_SIZE;
  return Math.min(MAX_AVATAR_BLOCK_SIZE, Math.max(MIN_AVATAR_BLOCK_SIZE, Math.round(value)));
}

function getEnvBlockSize(): number {
  return normalizeBlockSize(Number(import.meta.env.VITE_PLAYER_AVATAR_BLOCK_SIZE));
}

function getStoredBlockSizeOverride(): number | null {
  const raw = safeLocalStorageGet(BLOCK_SIZE_OVERRIDE_KEY);
  if (!raw) return null;
  return normalizeBlockSize(Number(raw));
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage can be unavailable in restricted WebViews.
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // localStorage can be unavailable in restricted WebViews.
  }
}
