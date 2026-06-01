/// <reference types="vite/client" />

declare module "*.csv?url" {
  const src: string;
  export default src;
}

declare module "howler" {
  export class Howl {
    constructor(options: { src: string[]; volume?: number; preload?: boolean });
    play(): number;
    volume(volume: number): this;
  }
}

declare const __APP_MODE__: "admin" | "player";

interface ImportMetaEnv {
  readonly VITE_WEBLLM_MODEL_ID?: string;
  readonly VITE_AI_DAILY_LIMIT?: string;
  readonly VITE_PLAYER_AVATAR_BLOCK_SIZE?: string;
  readonly VITE_SKIP_AI?: string;
}
