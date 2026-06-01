export type CinematicSceneId = "new_game_intro";

interface CinematicSceneBase {
  id: CinematicSceneId;
  titleKey: string;
  continueKey: string;
  skipKey: string;
}

export interface CrawlSceneDefinition extends CinematicSceneBase {
  kind: "crawl";
  kickerKey: string;
  subtitleKey: string;
  bodyKeys: string[];
  durationSeconds: number;
}

export interface StillScenePanel {
  imageUrl: string;
  altKey: string;
  captionKeys: string[];
}

export interface StillSceneDefinition extends CinematicSceneBase {
  kind: "still";
  panels: StillScenePanel[];
}

export type CinematicSceneDefinition = CrawlSceneDefinition | StillSceneDefinition;
