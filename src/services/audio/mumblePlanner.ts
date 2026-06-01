export interface MumbleVoiceProfile {
  id: string;
  baseFrequencyHz: number;
  frequencyRangeHz: number;
  syllablesPerSecond: number;
  syllableDurationMs: number;
  pitchJitter: number;
  formantShift?: number;
  brightness?: number;
  breathiness?: number;
  vibratoDepth?: number;
}

export type MumbleVowel = "a" | "e" | "i" | "o" | "u";

export interface MumbleEvent {
  startMs: number;
  durationMs: number;
  frequencyHz: number;
  gain: number;
  vowel: MumbleVowel;
}

export interface MumblePlan {
  events: MumbleEvent[];
  durationMs: number;
}

interface PlanInput {
  text: string;
  profile: MumbleVoiceProfile;
}

const MIN_SYLLABLES = 2;
const MAX_DURATION_MS = 6500;
const BASE_PUNCTUATION_GAP_MS = 180;

export function planMumbleLine({ text, profile }: PlanInput): MumblePlan {
  const tokens = text.match(/[\p{L}\p{N}]+|[.,!?;:]/gu) ?? [];
  const events: MumbleEvent[] = [];
  let cursorMs = 0;
  let syllableIndex = 0;
  const stepMs = Math.max(45, Math.round(1000 / profile.syllablesPerSecond));

  for (const token of tokens) {
    if (cursorMs >= MAX_DURATION_MS) break;

    if (/^[.,!?;:]$/.test(token)) {
      cursorMs += punctuationGap(token);
      continue;
    }

    const syllables = estimateSyllables(token);
    for (let i = 0; i < syllables && cursorMs < MAX_DURATION_MS; i += 1) {
      events.push(createEvent(profile, syllableIndex, cursorMs));
      syllableIndex += 1;
      cursorMs += stepMs;
    }
  }

  while (events.length < MIN_SYLLABLES) {
    events.push(createEvent(profile, syllableIndex, cursorMs));
    syllableIndex += 1;
    cursorMs += stepMs;
  }

  const durationMs = Math.min(
    MAX_DURATION_MS,
    Math.max(cursorMs + profile.syllableDurationMs, events.at(-1)?.startMs ?? 0),
  );

  return { events, durationMs };
}

function createEvent(
  profile: MumbleVoiceProfile,
  syllableIndex: number,
  startMs: number,
): MumbleEvent {
  const wobble = hash01(`${profile.id}:${syllableIndex}`);
  const centered = wobble * 2 - 1;
  const jitterHz = centered * profile.frequencyRangeHz * profile.pitchJitter;
  const steppedHz = (syllableIndex % 3) * profile.frequencyRangeHz * 0.16;

  return {
    startMs,
    durationMs: profile.syllableDurationMs,
    frequencyHz: Math.max(80, Math.round(profile.baseFrequencyHz + steppedHz + jitterHz)),
    gain: 0.13 + hash01(`${profile.id}:gain:${syllableIndex}`) * 0.08,
    vowel: pickVowel(profile.id, syllableIndex),
  };
}

function pickVowel(profileId: string, syllableIndex: number): MumbleVowel {
  const vowels: MumbleVowel[] = ["a", "e", "i", "o", "u"];
  const offset = Math.floor(hash01(`${profileId}:vowels`) * vowels.length);
  return vowels[(syllableIndex + offset) % vowels.length];
}

function estimateSyllables(word: string): number {
  const normalized = word.toLocaleLowerCase("pl-PL");
  const vowelGroups = normalized.match(/[aeiouyąęó]+/g)?.length ?? 0;
  return Math.max(1, Math.min(4, Math.max(vowelGroups, Math.ceil(word.length / 3))));
}

function punctuationGap(token: string): number {
  if (token === "." || token === "!" || token === "?") return BASE_PUNCTUATION_GAP_MS + 120;
  return BASE_PUNCTUATION_GAP_MS;
}

function hash01(seed: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash / 0xffffffff;
}
