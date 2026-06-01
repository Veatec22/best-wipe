import type { AvatarGender } from "../../game/campaign/avatarTypes";

const modules = import.meta.glob("../../assets/avatars/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

type Bucket = "static" | "generic" | "system" | "player";

export interface AvatarManifest {
  static: Map<string, string>;
  system: Map<string, string>;
  player: Map<string, string>;
  generic: Record<AvatarGender, string[]>;
}

const ROOT = "../../assets/avatars/";

const isLater = (path: string) => path.includes("/.later/");

const genderFromSegment = (segment: string): AvatarGender | null => {
  if (segment === "male") return "m";
  if (segment === "female") return "f";
  if (segment === "neutral") return "n";
  return null;
};

const fileStem = (file: string) => file.replace(/\.png$/i, "");

const buildManifest = (): AvatarManifest => {
  const out: AvatarManifest = {
    static: new Map(),
    system: new Map(),
    player: new Map(),
    generic: { m: [], f: [], n: [] },
  };

  const genericByGender: Record<AvatarGender, Array<{ name: string; url: string }>> = {
    m: [],
    f: [],
    n: [],
  };

  for (const [absPath, url] of Object.entries(modules)) {
    if (isLater(absPath)) continue;
    const rel = absPath.startsWith(ROOT) ? absPath.slice(ROOT.length) : absPath;
    const parts = rel.split("/");
    const bucket = parts[0] as Bucket;
    if (bucket === "static" || bucket === "system" || bucket === "player") {
      const id = fileStem(parts[parts.length - 1]);
      out[bucket].set(id, url);
      continue;
    }
    if (bucket === "generic" && parts.length === 3) {
      const gender = genderFromSegment(parts[1]);
      if (!gender) continue;
      genericByGender[gender].push({ name: parts[2], url });
    }
  }

  for (const g of ["m", "f", "n"] as const) {
    genericByGender[g].sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
    out.generic[g] = genericByGender[g].map(e => e.url);
  }

  return out;
};

export const avatarManifest: AvatarManifest = buildManifest();
