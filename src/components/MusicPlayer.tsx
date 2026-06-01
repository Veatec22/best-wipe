import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const trackUrls = import.meta.glob("../assets/music/*.mp3", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

interface Track {
  name: string;
  url: string;
}

const TRACKS: Track[] = Object.entries(trackUrls)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, url], i) => {
    const file = path.split("/").pop() ?? "";
    const base = file.replace(/\.[^.]+$/, "");
    const pretty = /^untitled_\d+$/i.test(base)
      ? `Track ${(i + 1).toString().padStart(2, "0")}`
      : base.replace(/[_-]+/g, " ");
    return { name: pretty, url };
  });

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

interface Props {
  paused?: boolean;
  enabled?: boolean;
  volume?: number;
  initialTrackIndex?: number;
}

export function MusicPlayer({
  paused = false,
  enabled = true,
  volume = 0.5,
  initialTrackIndex = 0,
}: Props) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pausedByAppRef = useRef(false);
  const playingRef = useRef(false);
  const [index, setIndex] = useState(initialTrackIndex);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [localVolume, setLocalVolume] = useState(volume);
  const [muted, setMuted] = useState(!enabled);

  const track = TRACKS[index];
  playingRef.current = playing;

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : localVolume;
  }, [localVolume, muted]);

  useEffect(() => {
    setMuted(!enabled);
  }, [enabled]);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (paused) {
      if (playing && !audio.paused) {
        audio.pause();
        pausedByAppRef.current = true;
      }
      return;
    }

    if (pausedByAppRef.current) {
      pausedByAppRef.current = false;
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }, [paused, playing]);

  if (TRACKS.length === 0) return null;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      pausedByAppRef.current = false;
      setPlaying(false);
    } else {
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }

  function prev() {
    setTime(0);
    setIndex(i => (i - 1 + TRACKS.length) % TRACKS.length);
  }

  function next() {
    setTime(0);
    setIndex(i => (i + 1) % TRACKS.length);
  }

  function onSeek(e: ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    const audio = audioRef.current;
    if (audio) audio.currentTime = v;
    setTime(v);
  }

  function onVolume(e: ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    setLocalVolume(v);
    if (v > 0 && muted) setMuted(false);
  }

  const volIcon = muted || localVolume === 0 ? "MUTE" : localVolume < 0.5 ? "VOL" : "LOUD";

  return (
    <section className="df-music" aria-label={t("music.label")}>
      {/** biome-ignore lint/a11y/useMediaCaption: instrumental background music */}
      <audio
        ref={audioRef}
        src={track.url}
        preload="metadata"
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={e => {
          setDuration(e.currentTarget.duration || 0);
          if (playingRef.current) {
            void e.currentTarget.play().catch(() => setPlaying(false));
          }
        }}
        onEnded={next}
      />
      <button type="button" className="df-music-btn" onClick={prev} aria-label={t("music.prev")}>
        ⏮
      </button>
      <button
        type="button"
        className="df-music-btn"
        onClick={toggle}
        aria-label={playing ? t("music.pause") : t("music.play")}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <button type="button" className="df-music-btn" onClick={next} aria-label={t("music.next")}>
        ⏭
      </button>
      <span className="df-music-title" title={track.name}>
        {track.name}
      </span>
      <input
        className="df-music-bar"
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(time, duration || 0)}
        onChange={onSeek}
        aria-label={t("music.seek")}
      />
      <span className="df-music-time">
        {fmt(time)} / {fmt(duration)}
      </span>
      <button
        type="button"
        className="df-music-btn"
        onClick={() => setMuted(m => !m)}
        aria-label={muted ? t("music.unmute") : t("music.mute")}
      >
        {volIcon}
      </button>
      <input
        className="df-music-vol"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : localVolume}
        onChange={onVolume}
        aria-label={t("music.volume")}
      />
    </section>
  );
}
