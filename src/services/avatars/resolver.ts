import type { AvatarGender, AvatarRef } from "../../game/campaign/avatarTypes";
import { initialsDataUrl } from "./initialsFallback";
import { avatarManifest } from "./manifest";

const hashSeed = (seed: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

const pickGeneric = (gender: AvatarGender, idx: number): string | null => {
  const pool = avatarManifest.generic[gender];
  if (pool.length === 0) return null;
  return pool[idx % pool.length];
};

export interface ResolvedAvatar {
  url: string;
  source: "static" | "generic" | "system" | "player" | "initials";
}

const labelOf = (ref: AvatarRef): string => {
  switch (ref.kind) {
    case "static":
    case "system":
    case "player":
      return ref.id;
    case "generic":
      return `${ref.gender}${ref.index}`;
    case "generic-seeded":
      return ref.seed;
    case "initials":
      return ref.label;
  }
};

const fallback = (ref: AvatarRef): ResolvedAvatar => ({
  url: initialsDataUrl(labelOf(ref)),
  source: "initials",
});

export const resolveAvatar = (ref: AvatarRef): ResolvedAvatar => {
  switch (ref.kind) {
    case "static": {
      const url = avatarManifest.static.get(ref.id);
      return url ? { url, source: "static" } : fallback(ref);
    }
    case "system": {
      const url = avatarManifest.system.get(ref.id);
      return url ? { url, source: "system" } : fallback(ref);
    }
    case "player": {
      const url = avatarManifest.player.get(ref.id);
      return url ? { url, source: "player" } : fallback(ref);
    }
    case "generic": {
      const url = pickGeneric(ref.gender, ref.index);
      return url ? { url, source: "generic" } : fallback(ref);
    }
    case "generic-seeded": {
      const url = pickGeneric(ref.gender, hashSeed(ref.seed));
      return url ? { url, source: "generic" } : fallback(ref);
    }
    case "initials":
      return { url: initialsDataUrl(ref.label, ref.tone ?? "paper"), source: "initials" };
  }
};

export interface AvatarAllocator {
  allocate(ref: AvatarRef): ResolvedAvatar;
}

/**
 * Per-run allocator. Avoids assigning the same generic image to two different
 * `generic-seeded` NPCs by bumping the hash on collision. Static / system /
 * player / explicit generic refs are returned as-is.
 */
export const createAvatarAllocator = (): AvatarAllocator => {
  const usedGeneric = new Set<string>();

  const allocate = (ref: AvatarRef): ResolvedAvatar => {
    if (ref.kind !== "generic-seeded") {
      const r = resolveAvatar(ref);
      if (r.source === "generic") usedGeneric.add(r.url);
      return r;
    }
    const pool = avatarManifest.generic[ref.gender];
    if (pool.length === 0) return fallback(ref);
    let bump = 0;
    while (bump < pool.length) {
      const idx = (hashSeed(`${ref.seed}#${bump}`) >>> 0) % pool.length;
      const url = pool[idx];
      if (!usedGeneric.has(url)) {
        usedGeneric.add(url);
        return { url, source: "generic" };
      }
      bump += 1;
    }
    const idx = (hashSeed(ref.seed) >>> 0) % pool.length;
    return { url: pool[idx], source: "generic" };
  };

  return { allocate };
};
