import { toPseudoSpeechText } from "./pseudoSpeechText";
import { playMumbleLine, type MumblePlayback } from "./mumbleSynth";
import type { MumbleVoiceProfile } from "./mumblePlanner";

interface PlayWebSpeechMumbleInput {
  text: string;
  profile: MumbleVoiceProfile;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function playWebSpeechMumble({
  text,
  profile,
  rate,
  pitch,
  volume = 0.78,
}: PlayWebSpeechMumbleInput): MumblePlayback {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return playMumbleLine({ text, profile, volume });
  }

  const synthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(toPseudoSpeechText(text, profile.id));
  utterance.lang = "pl-PL";
  utterance.rate = rate ?? voiceRate(profile);
  utterance.pitch = pitch ?? voicePitch(profile);
  utterance.volume = Math.max(0, Math.min(1, volume));

  const fallbackTimer = window.setTimeout(() => {
    if (!synthesis.speaking && !synthesis.pending) {
      playMumbleLine({ text, profile, volume });
    }
  }, 180);

  utterance.onstart = () => window.clearTimeout(fallbackTimer);
  utterance.onerror = () => {
    window.clearTimeout(fallbackTimer);
    playMumbleLine({ text, profile, volume });
  };
  utterance.onend = () => window.clearTimeout(fallbackTimer);

  synthesis.cancel();
  synthesis.speak(utterance);

  return {
    stop() {
      window.clearTimeout(fallbackTimer);
      synthesis.cancel();
    },
  };
}

function voiceRate(profile: MumbleVoiceProfile): number {
  if (profile.id === "calmLead") return 2.15;
  if (profile.id === "sharpPm") return 2.85;
  if (profile.id === "nervousJunior") return 3.1;
  return 2.5;
}

function voicePitch(profile: MumbleVoiceProfile): number {
  if (profile.id === "calmLead") return 0.55;
  if (profile.id === "sharpPm") return 1.85;
  if (profile.id === "nervousJunior") return 1.35;
  return 1.25;
}
