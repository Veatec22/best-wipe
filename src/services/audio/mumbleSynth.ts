import { planMumbleLine, type MumbleVoiceProfile } from "./mumblePlanner";

export interface MumblePlayback {
  stop(): void;
}

interface PlayMumbleInput {
  text: string;
  profile: MumbleVoiceProfile;
  volume?: number;
}

const AudioContextCtor =
  typeof window === "undefined"
    ? undefined
    : window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

let sharedContext: AudioContext | null = null;

const VOWEL_FORMANTS = {
  a: [720, 1240, 2520],
  e: [530, 1840, 2480],
  i: [300, 2200, 3000],
  o: [570, 840, 2410],
  u: [350, 720, 2400],
} as const;

export function playMumbleLine({ text, profile, volume = 0.7 }: PlayMumbleInput): MumblePlayback {
  const context = getAudioContext();
  if (!context) return noopPlayback;

  const plan = planMumbleLine({ text, profile });
  const output = context.createGain();
  output.gain.value = Math.max(0, Math.min(1, volume)) * 0.75;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 24;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.12;
  output.connect(compressor);
  compressor.connect(context.destination);

  const noiseBuffer = createNoiseBuffer(context);
  const nodes: AudioScheduledSourceNode[] = [];
  const startedAt = context.currentTime + 0.025;
  const brightness = profile.brightness ?? 0.55;
  const breathiness = profile.breathiness ?? 0.16;
  const formantShift = profile.formantShift ?? 1;
  const vibratoDepth = profile.vibratoDepth ?? 0.012;

  for (const event of plan.events) {
    const start = startedAt + event.startMs / 1000;
    const end = start + event.durationMs / 1000;
    const attackEnd = start + Math.min(0.035, event.durationMs / 3000);
    const releaseStart = Math.max(attackEnd + 0.01, end - Math.min(0.075, event.durationMs / 1700));

    const oscillator = context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(event.frequencyHz, start);
    oscillator.frequency.linearRampToValueAtTime(event.frequencyHz * (1 + vibratoDepth), (start + end) / 2);
    oscillator.frequency.linearRampToValueAtTime(event.frequencyHz * (1 - vibratoDepth * 0.55), end);

    const toneGain = context.createGain();
    toneGain.gain.setValueAtTime(0.0001, start);
    toneGain.gain.linearRampToValueAtTime(event.gain * 0.72, attackEnd);
    toneGain.gain.setValueAtTime(event.gain * 0.64, releaseStart);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, end);

    const vowelMix = context.createGain();
    vowelMix.gain.value = 0.34 + brightness * 0.22;
    const formants = VOWEL_FORMANTS[event.vowel];
    for (const [index, frequency] of formants.entries()) {
      const formant = context.createBiquadFilter();
      formant.type = "bandpass";
      formant.frequency.setValueAtTime(frequency * formantShift, start);
      formant.Q.setValueAtTime(index === 0 ? 5.5 : 8.5, start);

      const formantGain = context.createGain();
      formantGain.gain.value = [0.9, 0.46, 0.2][index] * (0.85 + brightness * 0.3);
      oscillator.connect(formant);
      formant.connect(formantGain);
      formantGain.connect(vowelMix);
    }
    vowelMix.connect(toneGain);
    toneGain.connect(output);

    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;

    const breathFilter = context.createBiquadFilter();
    breathFilter.type = "bandpass";
    breathFilter.frequency.setValueAtTime(1200 + brightness * 1300, start);
    breathFilter.Q.setValueAtTime(1.7, start);

    const breathGain = context.createGain();
    breathGain.gain.setValueAtTime(0.0001, start);
    breathGain.gain.linearRampToValueAtTime(event.gain * breathiness, attackEnd);
    breathGain.gain.setValueAtTime(event.gain * breathiness * 0.72, releaseStart);
    breathGain.gain.exponentialRampToValueAtTime(0.0001, end);

    noise.connect(breathFilter);
    breathFilter.connect(breathGain);
    breathGain.connect(output);

    oscillator.start(start);
    oscillator.stop(end + 0.04);
    noise.start(start);
    noise.stop(end + 0.04);
    nodes.push(oscillator, noise);
  }

  if (context.state === "suspended") {
    void context.resume().catch(() => undefined);
  }

  const disconnectTimer = window.setTimeout(
    () => output.disconnect(),
    Math.max(100, plan.durationMs + 120),
  );

  return {
    stop() {
      window.clearTimeout(disconnectTimer);
      for (const node of nodes) {
        try {
          node.stop();
        } catch {
          // Already stopped or not started yet.
        }
      }
      output.disconnect();
    },
  };
}

function getAudioContext(): AudioContext | null {
  if (!AudioContextCtor) return null;
  sharedContext ??= new AudioContextCtor();
  return sharedContext;
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * 0.12);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

const noopPlayback: MumblePlayback = {
  stop() {
    return;
  },
};
