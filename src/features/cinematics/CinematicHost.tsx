import { useTranslation } from "react-i18next";
import { CrawlScene } from "./renderers/CrawlScene";
import { StillScene } from "./renderers/StillScene";
import { getCinematicScene } from "./scenes";
import type { CinematicSceneId } from "./types";

interface Props {
  sceneId: CinematicSceneId;
  onComplete(): void;
}

export function CinematicHost({ sceneId, onComplete }: Props) {
  const { t } = useTranslation();
  const scene = getCinematicScene(sceneId);

  if (scene.kind === "crawl") {
    return <CrawlScene scene={scene} t={t} onComplete={onComplete} />;
  }

  return <StillScene scene={scene} t={t} onComplete={onComplete} />;
}
