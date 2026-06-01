import type { CinematicSceneDefinition, CinematicSceneId } from "./types";

export const CINEMATIC_SCENES = {
  new_game_intro: {
    id: "new_game_intro",
    kind: "crawl",
    kickerKey: "cinematics.newGameIntro.kicker",
    titleKey: "cinematics.newGameIntro.title",
    subtitleKey: "cinematics.newGameIntro.subtitle",
    bodyKeys: [
      "cinematics.newGameIntro.body.line1",
      "cinematics.newGameIntro.body.line2",
      "cinematics.newGameIntro.body.line3",
      "cinematics.newGameIntro.body.line4",
      "cinematics.newGameIntro.body.line5",
    ],
    continueKey: "cinematics.continue",
    skipKey: "cinematics.skip",
    durationSeconds: 16,
  },
} as const satisfies Record<CinematicSceneId, CinematicSceneDefinition>;

export function getCinematicScene(id: CinematicSceneId): CinematicSceneDefinition {
  return CINEMATIC_SCENES[id];
}
