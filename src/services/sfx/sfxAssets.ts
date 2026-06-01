import dayEndAlarm from "../../assets/sfx/alarm-clock.mp3";
import chatNewMessage from "../../assets/sfx/chat-new-message.mp3";

export const SFX_ASSETS = {
  chatNewMessage,
  dayEndAlarm,
} as const;

export type SfxId = keyof typeof SFX_ASSETS;
