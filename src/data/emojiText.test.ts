import { describe, expect, test } from "bun:test";
import { tokenizeEmojiText } from "./emojiText";

const known = (id: string) => ["smile", "warning", "xd"].includes(id);

describe("emoji text", () => {
  test("turns known shortcodes into emoji tokens", () => {
    expect(tokenizeEmojiText("hej :smile: temat :warning:", known)).toEqual([
      { kind: "text", value: "hej " },
      { kind: "emoji", id: "smile", raw: ":smile:", offset: 4 },
      { kind: "text", value: " temat " },
      { kind: "emoji", id: "warning", raw: ":warning:", offset: 18 },
    ]);
  });

  test("leaves unknown shortcodes as text", () => {
    expect(tokenizeEmojiText("hej :not-real: :xd:", known)).toEqual([
      { kind: "text", value: "hej :not-real: " },
      { kind: "emoji", id: "xd", raw: ":xd:", offset: 15 },
    ]);
  });
});
