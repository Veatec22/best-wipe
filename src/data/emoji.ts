export type EmojiId = string;

export interface EmojiDef {
  id: EmojiId;
  src: string;
}

const modules = import.meta.glob("../assets/emojis/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function idFromPath(path: string): EmojiId {
  const file = path.split("/").pop() ?? "";
  return file.replace(/\.png$/, "");
}

export const EMOJI_LIST: EmojiDef[] = Object.entries(modules)
  .map(([path, src]) => ({ id: idFromPath(path), src }))
  .sort((a, b) => a.id.localeCompare(b.id));

export const EMOJI: Record<EmojiId, EmojiDef> = Object.fromEntries(EMOJI_LIST.map(e => [e.id, e]));

export function isKnownEmoji(id: string): id is EmojiId {
  return id in EMOJI;
}
