import { AiSettings3 } from "pixelarticons/react/AiSettings3";
import { Music } from "pixelarticons/react/Music";
import { Volume2 } from "pixelarticons/react/Volume2";
import { WindowFrame } from "pixelarticons/react/WindowFrame";
import { type ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import bestWipeLogoUrl from "../assets/brand/best-wipe-logo.png";
import type { GameSettings } from "../game/settings";
import type { Locale } from "../i18n";

interface Props {
  settings: GameSettings;
  onChangeSettings(settings: GameSettings): void;
  onStartMusic(): void;
  onStartStory(): void;
}

export function GameMenu({ settings, onChangeSettings, onStartMusic, onStartStory }: Props) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  function updateSettings(patch: Partial<GameSettings>) {
    onChangeSettings({ ...settings, ...patch });
  }

  async function toggleFullscreen() {
    const nextFullscreen = !settings.fullscreen;
    updateSettings({ fullscreen: nextFullscreen });
    if (nextFullscreen && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => undefined);
    } else if (!nextFullscreen && document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
  }

  function onVolumeChange(key: "musicVolume" | "sfxVolume", event: ChangeEvent<HTMLInputElement>) {
    updateSettings({ [key]: Number(event.target.value) });
  }

  return (
    <div className="df-menu" onPointerDown={onStartMusic}>
      <main className="df-menu-stage">
        <div className="df-menu-kicker">{t("menu.kicker")}</div>
        <div className="df-menu-lockup">
          <img src={bestWipeLogoUrl} alt="" />
          <h1 className="df-menu-logo">
            <span>{t("app.brandLine1")}</span>
            <span>{t("app.brandLine2")}</span>
          </h1>
        </div>
        <div className="df-menu-subtitle">{t("menu.subtitle")}</div>
        <nav className="df-menu-actions" aria-label={t("menu.label")}>
          <button type="button" className="df-menu-action" onClick={onStartStory}>
            {t("menu.story")}
          </button>
          <button type="button" className="df-menu-action is-disabled" disabled>
            {t("menu.challenges")}
          </button>
          <button type="button" className="df-menu-action is-disabled" disabled>
            {t("menu.endless")}
          </button>
        </nav>
      </main>

      <button
        type="button"
        className="df-menu-icon df-menu-settings-toggle"
        onClick={() => setSettingsOpen(true)}
        aria-label={t("menu.settings")}
      >
        <AiSettings3 width={30} height={30} aria-hidden="true" />
      </button>
      <span className="df-menu-version">{t("menu.version")}</span>

      {settingsOpen && (
        <div className="df-modal-backdrop" role="presentation">
          <section className="df-menu-settings" role="dialog" aria-modal="true">
            <header>
              <h2>{t("menu.settings")}</h2>
              <button
                type="button"
                className="df-menu-close"
                onClick={() => setSettingsOpen(false)}
              >
                {t("submission.close")}
              </button>
            </header>
            <label className="df-menu-check">
              <input type="checkbox" checked={settings.fullscreen} onChange={toggleFullscreen} />
              <WindowFrame width={20} height={20} aria-hidden="true" />
              <span>{t("menu.fullscreen")}</span>
            </label>
            <label className="df-menu-check">
              <input
                type="checkbox"
                checked={settings.musicEnabled}
                onChange={event => updateSettings({ musicEnabled: event.currentTarget.checked })}
              />
              <Music width={20} height={20} aria-hidden="true" />
              <span>{t("menu.music")}</span>
            </label>
            <label className="df-menu-slider">
              <span>{t("menu.musicVolume")}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings.musicVolume}
                onChange={event => onVolumeChange("musicVolume", event)}
              />
            </label>
            <label className="df-menu-check">
              <input
                type="checkbox"
                checked={settings.sfxEnabled}
                onChange={event => updateSettings({ sfxEnabled: event.currentTarget.checked })}
              />
              <Volume2 width={20} height={20} aria-hidden="true" />
              <span>{t("menu.sfx")}</span>
            </label>
            <label className="df-menu-slider">
              <span>{t("menu.sfxVolume")}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings.sfxVolume}
                onChange={event => onVolumeChange("sfxVolume", event)}
              />
            </label>
            <label className="df-menu-field">
              <span>{t("menu.language")}</span>
              <select
                value={settings.language}
                onChange={event =>
                  updateSettings({ language: event.currentTarget.value as Locale })
                }
              >
                <option value="pl">Polski</option>
                <option value="en">English</option>
              </select>
            </label>
          </section>
        </div>
      )}
    </div>
  );
}
