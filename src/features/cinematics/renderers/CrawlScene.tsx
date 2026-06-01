import type { TFunction } from "i18next";
import type { CSSProperties } from "react";
import type { CrawlSceneDefinition } from "../types";

interface Props {
  scene: CrawlSceneDefinition;
  t: TFunction;
  onComplete(): void;
}

export function CrawlScene({ scene, t, onComplete }: Props) {
  return (
    <main className="df-cinematic df-cinematic-crawl" aria-labelledby={`${scene.id}-title`}>
      <div className="df-cinematic-grid" aria-hidden="true" />
      <div className="df-crawl-viewport">
        <article
          className="df-crawl-content"
          style={{ "--df-crawl-duration": `${scene.durationSeconds}s` } as CSSProperties}
          onAnimationEnd={onComplete}
        >
          <p className="df-crawl-kicker">{t(scene.kickerKey)}</p>
          <h1 id={`${scene.id}-title`}>{t(scene.titleKey)}</h1>
          <h2>{t(scene.subtitleKey)}</h2>
          {scene.bodyKeys.map(key => (
            <p key={key}>{t(key)}</p>
          ))}
        </article>
      </div>
      <button type="button" className="df-cinematic-skip" onClick={onComplete}>
        {t(scene.skipKey)}
      </button>
    </main>
  );
}
