import { Howl } from "howler";
import { SFX_ASSETS, type SfxId } from "./sfxAssets";

interface SfxConfig {
  volume: number;
}

const SFX_CONFIG = {
  chatNewMessage: {
    volume: 0.45,
  },
  dayEndAlarm: {
    volume: 0.6,
  },
} as const satisfies Record<SfxId, SfxConfig>;

const sounds = new Map<SfxId, Howl>();
let sfxMasterVolume = 1;

export function playSfx(id: SfxId): void {
  getSound(id).play();
}

export function setSfxMasterVolume(volume: number): void {
  sfxMasterVolume = Math.min(1, Math.max(0, volume));
  for (const [id, sound] of sounds) {
    sound.volume(SFX_CONFIG[id].volume * sfxMasterVolume);
  }
}

function getSound(id: SfxId): Howl {
  const existing = sounds.get(id);
  if (existing) return existing;

  const sound = new Howl({
    src: [SFX_ASSETS[id]],
    volume: SFX_CONFIG[id].volume * sfxMasterVolume,
    preload: true,
  });
  sounds.set(id, sound);
  return sound;
}
