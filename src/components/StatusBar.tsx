import { useTranslation } from "react-i18next";
import type { GameClock } from "../game/clock";
import type { GameSettings } from "../game/settings";
import { Button } from "../ui/components";
import { MusicPlayer } from "./MusicPlayer";

interface Props {
  clock: GameClock;
  channelLabel: string;
  settings: GameSettings;
  onTogglePause(): void;
}

export function StatusBar({ clock, channelLabel, settings, onTogglePause }: Props) {
  const { t } = useTranslation();
  return (
    <footer className="df-status">
      <div className="seg">
        <span>{t("status.company")}</span>
        <span>{t("status.tribe")}</span>
        <span>{t("status.active", { channel: channelLabel })}</span>
      </div>
      <div className="seg">
        <MusicPlayer
          paused={clock.isPaused || clock.isDayEnded}
          enabled={settings.musicEnabled}
          volume={settings.musicVolume}
          initialTrackIndex={1}
        />
        <Button size="compact" onClick={onTogglePause} disabled={clock.isDayEnded}>
          {clock.isPaused ? t("status.resume") : t("status.pause")}
        </Button>
      </div>
    </footer>
  );
}
