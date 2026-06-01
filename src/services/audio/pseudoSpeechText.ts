const SYLLABLES = [
  "ba",
  "be",
  "bi",
  "bo",
  "bu",
  "ma",
  "me",
  "mi",
  "mo",
  "mu",
  "ra",
  "re",
  "ri",
  "ro",
  "ru",
  "la",
  "le",
  "li",
  "lo",
  "lu",
  "na",
  "ne",
  "ni",
  "no",
  "nu",
  "ta",
  "te",
  "ti",
  "to",
  "tu",
] as const;

export function toPseudoSpeechText(text: string, seed: string): string {
  const tokens = text.match(/[\p{L}\p{N}]+|[.,!?;:]/gu) ?? [];
  let syllableIndex = Math.floor(hash01(seed) * SYLLABLES.length);

  return tokens
    .map(token => {
      if (/^[.,!?;:]$/.test(token)) return token;

      const count = estimatePseudoSyllableCount(token);
      const syllables: string[] = [];
      for (let i = 0; i < count; i += 1) {
        syllables.push(SYLLABLES[(syllableIndex + i) % SYLLABLES.length]);
      }
      syllableIndex += count + 1;
      return syllables.join("");
    })
    .join(" ")
    .replace(/\s+([.,!?;:])/g, "$1");
}

function estimatePseudoSyllableCount(word: string): number {
  const vowelGroups = word.toLocaleLowerCase("pl-PL").match(/[aeiouyąęó]+/g)?.length ?? 0;
  return Math.max(1, Math.min(4, Math.max(vowelGroups, Math.ceil(word.length / 5))));
}

function hash01(seed: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash / 0xffffffff;
}
