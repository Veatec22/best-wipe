import type { TFunction } from "i18next";
import type { StillSceneDefinition } from "../types";

interface Props {
  scene: StillSceneDefinition;
  t: TFunction;
  onComplete(): void;
}

export function StillScene({ scene, t, onComplete }: Props) {
  const panel = scene.panels[0];

  return (
    <main className="df-cinematic df-cinematic-still" aria-labelledby={`${scene.id}-title`}>
      <section className="df-still-frame">
        {panel && <img src={panel.imageUrl} alt={t(panel.altKey)} />}
        <div className="df-still-caption">
          <h1 id={`${scene.id}-title`}>{t(scene.titleKey)}</h1>
          {panel?.captionKeys.map(key => (
            <p key={key}>{t(key)}</p>
          ))}
        </div>
      </section>
      <button type="button" className="df-cinematic-skip" onClick={onComplete}>
        {t(scene.continueKey)}
      </button>
    </main>
  );
}
