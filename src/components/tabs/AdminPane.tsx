import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PEOPLE, type PersonId } from "../../data/people";
import { formatGameTime, type ClockApi } from "../../game/clock";
import {
  getIntegratedWebLlmModelOptions,
  useAiStore,
  type WebLlmModelOption,
} from "../../services/ai";
import {
  normalizeBlockSize,
  usePlayerAvatarSettings,
} from "../../services/avatars/playerAvatarSettings";
import { useScoringStore } from "../../store/scoringStore";
import { Button } from "../../ui/components";

interface Props {
  clockApi: ClockApi;
}

export function AdminPane({ clockApi }: Props) {
  const { t } = useTranslation();
  const { clock, endCurrentDay, fastForwardSeconds, setGameTime, toggleTimeFreeze } = clockApi;
  const envModelId = useAiStore(state => state.envModelId);
  const modelId = useAiStore(state => state.modelId);
  const modelSource = useAiStore(state => state.modelSource);
  const status = useAiStore(state => state.status);
  const progress = useAiStore(state => state.progress);
  const error = useAiStore(state => state.error);
  const aiUsed = useAiStore(state => state.used);
  const aiTotal = useAiStore(state => state.total);
  const setModelOverride = useAiStore(state => state.setModelOverride);
  const resetModelOverride = useAiStore(state => state.resetModelOverride);
  const resetUsage = useAiStore(state => state.resetUsage);
  const avatarEnvBlockSize = usePlayerAvatarSettings(state => state.envBlockSize);
  const avatarBlockSize = usePlayerAvatarSettings(state => state.blockSize);
  const avatarBlockSizeSource = usePlayerAvatarSettings(state => state.blockSizeSource);
  const setAvatarBlockSizeOverride = usePlayerAvatarSettings(state => state.setBlockSizeOverride);
  const resetAvatarBlockSizeOverride = usePlayerAvatarSettings(
    state => state.resetBlockSizeOverride,
  );
  const stats = useScoringStore(state => state.stats);
  const reputationByPerson = useScoringStore(state => state.reputationByPerson);
  const scoringEvents = useScoringStore(state => state.events);
  const resetScoring = useScoringStore(state => state.reset);
  const [modelOptions, setModelOptions] = useState<WebLlmModelOption[]>([]);
  const [debugDay, setDebugDay] = useState(clock.day);
  const [debugTime, setDebugTime] = useState(formatGameTime(clock));

  useEffect(() => {
    let cancelled = false;
    getIntegratedWebLlmModelOptions()
      .then(options => {
        if (!cancelled) setModelOptions(options);
      })
      .catch(() => {
        if (!cancelled) setModelOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDebugDay(clock.day);
    setDebugTime(formatGameTime(clock));
  }, [clock]);

  async function handleResetSave() {
    const confirmed = window.confirm(t("admin.dangerZone.resetConfirm"));
    if (!confirmed) return;
    try {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs.map(
          d =>
            new Promise<void>(resolve => {
              if (!d.name) return resolve();
              const req = indexedDB.deleteDatabase(d.name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            }),
        ),
      );
      Object.keys(localStorage).forEach(k => localStorage.removeItem(k));
    } finally {
      window.location.reload();
    }
  }

  return (
    <div className="df-admin">
      <h3>{t("admin.title")}</h3>
      <p className="muted">{t("admin.subtitle")}</p>

      <section className="df-admin-section">
        <h4>{t("admin.time.title")}</h4>
        <p className="muted">
          {t("admin.time.subtitle", {
            day: clock.day,
            state: t(`admin.time.${timeStateKey(clock)}`),
          })}
        </p>
        <div className="df-admin-actions">
          <Button onClick={toggleTimeFreeze} disabled={clock.isDayEnded}>
            {clock.isTimeFrozen ? t("admin.time.unfreeze") : t("admin.time.freeze")}
          </Button>
          <Button onClick={() => fastForwardSeconds(60)} disabled={clock.isDayEnded}>
            {t("admin.time.plusHour")}
          </Button>
          <Button onClick={() => fastForwardSeconds(180)} disabled={clock.isDayEnded}>
            {t("admin.time.plusThreeHours")}
          </Button>
          <Button variant="primary" onClick={endCurrentDay} disabled={clock.isDayEnded}>
            {t("admin.time.endDay")}
          </Button>
        </div>
        <div className="df-admin-time-jump">
          <label className="df-field-label" htmlFor="df-admin-day">
            {t("admin.time.dayField")}
          </label>
          <input
            id="df-admin-day"
            className="df-select"
            type="number"
            min={1}
            max={7}
            step={1}
            value={debugDay}
            onChange={event => setDebugDay(Number(event.target.value))}
          />
          <label className="df-field-label" htmlFor="df-admin-time">
            {t("admin.time.timeField")}
          </label>
          <input
            id="df-admin-time"
            className="df-select"
            type="time"
            min="09:00"
            max="17:00"
            step={60}
            value={debugTime}
            onChange={event => setDebugTime(event.target.value)}
          />
          <Button onClick={() => setGameTime(debugDay, debugTime)}>
            {t("admin.time.setTime")}
          </Button>
          <Button onClick={() => setGameTime(1, "10:30")}>{t("admin.time.retroStart")}</Button>
          <Button onClick={() => setGameTime(1, "10:40")}>{t("admin.time.retroMiddle")}</Button>
        </div>
      </section>

      <section className="df-admin-section">
        <h4>{t("admin.scoring.title")}</h4>
        <p className="muted">{t("admin.scoring.subtitle")}</p>
        <div className="df-score-grid">
          <ScoreCell label={t("admin.scoring.accuracy")} value={stats.accuracy} />
          <ScoreCell label={t("admin.scoring.speed")} value={stats.speed} />
          <ScoreCell label={t("admin.scoring.reputation")} value={stats.reputation} />
        </div>

        <h5 className="df-admin-subhead">{t("admin.scoring.repByPerson")}</h5>
        <ul className="df-score-rep-list">
          {Object.entries(reputationByPerson).length === 0 && (
            <li className="muted">{t("admin.scoring.repEmpty")}</li>
          )}
          {Object.entries(reputationByPerson).map(([personId, value]) => {
            const person = PEOPLE[personId as PersonId];
            return (
              <li key={personId}>
                <span className="who">{person?.name ?? personId}</span>
                <span className="role muted">{person?.role ?? ""}</span>
                <span className={`val ${value > 0 ? "pos" : value < 0 ? "neg" : ""}`}>
                  {formatSigned(value ?? 0)}
                </span>
              </li>
            );
          })}
        </ul>

        <h5 className="df-admin-subhead">{t("admin.scoring.history")}</h5>
        {scoringEvents.length === 0 ? (
          <p className="muted">{t("admin.scoring.historyEmpty")}</p>
        ) : (
          <table className="df-score-table">
            <thead>
              <tr>
                <th>{t("admin.scoring.col.when")}</th>
                <th>{t("admin.scoring.col.task")}</th>
                <th>{t("admin.scoring.col.severity")}</th>
                <th>{t("admin.scoring.col.speedBucket")}</th>
                <th>Δacc</th>
                <th>Δspd</th>
                <th>Δrep</th>
              </tr>
            </thead>
            <tbody>
              {scoringEvents.map(event => (
                <tr key={event.id}>
                  <td>{event.gameTimeLabel ?? new Date(event.appliedAt).toLocaleTimeString()}</td>
                  <td title={event.reason}>{event.taskTitle}</td>
                  <td>{event.severity}</td>
                  <td>{event.speedBucket}</td>
                  <td className={signClass(event.accuracy)}>{formatSigned(event.accuracy)}</td>
                  <td className={signClass(event.speed)}>{formatSigned(event.speed)}</td>
                  <td className={signClass(event.reputationGlobal)}>
                    {formatSigned(event.reputationGlobal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Button onClick={resetScoring}>{t("admin.scoring.reset")}</Button>
      </section>

      <section className="df-admin-section">
        <label className="df-field-label" htmlFor="df-ai-model-select">
          {t("admin.aiModel")}
        </label>
        <select
          id="df-ai-model-select"
          className="df-select"
          value={modelId}
          onChange={event => setModelOverride(event.target.value)}
        >
          {modelOptions.length === 0 && <option value={modelId}>{modelId}</option>}
          {modelOptions.map(option => (
            <option key={option.id} value={option.id}>
              {formatOption(option.label, option.vramRequiredMb)}
            </option>
          ))}
        </select>
        <div className="df-admin-meta">
          <span>{t("admin.modelSource", { source: t(`admin.modelSources.${modelSource}`) })}</span>
          <span>{t("admin.envModel", { model: envModelId })}</span>
        </div>
        <Button onClick={resetModelOverride}>{t("admin.resetModel")}</Button>
      </section>

      <section className="df-admin-section">
        <label className="df-field-label" htmlFor="df-avatar-block-size">
          {t("admin.avatarBlockSize")}
        </label>
        <input
          id="df-avatar-block-size"
          className="df-select"
          type="number"
          min={2}
          max={32}
          step={1}
          value={avatarBlockSize}
          onChange={event =>
            setAvatarBlockSizeOverride(normalizeBlockSize(Number(event.target.value)))
          }
        />
        <div className="df-admin-meta">
          <span>
            {t("admin.avatarBlockSizeSource", {
              source: t(`admin.modelSources.${avatarBlockSizeSource}`),
            })}
          </span>
          <span>{t("admin.envAvatarBlockSize", { size: avatarEnvBlockSize })}</span>
        </div>
        <p className="muted">{t("admin.avatarGreyscaleForced")}</p>
        <Button onClick={resetAvatarBlockSizeOverride}>{t("admin.resetAvatarBlockSize")}</Button>
      </section>

      <section className="df-admin-section">
        <h4>{t("admin.dangerZone.title")}</h4>
        <p className="muted">{t("admin.dangerZone.subtitle")}</p>
        <Button onClick={handleResetSave}>{t("admin.dangerZone.resetSave")}</Button>
      </section>

      <section className="df-admin-section">
        <h4>{t("admin.webLlmStatus")}</h4>
        <div className="df-admin-meta">
          <span>{t(`admin.status.${status}`)}</span>
          <span>{t("admin.aiUsage", { used: aiUsed, total: aiTotal })}</span>
          {progress && (
            <span>
              {Math.round(progress.progress * 100)}% - {progress.text}
            </span>
          )}
          {error && <span className="df-error-text">{error}</span>}
        </div>
        <Button onClick={resetUsage}>{t("admin.resetAiUsage")}</Button>
      </section>
    </div>
  );
}

function formatOption(label: string, vramRequiredMb?: number): string {
  if (!vramRequiredMb) return label;
  return `${label} - ${Math.round(vramRequiredMb)} MB VRAM`;
}

function timeStateKey(clock: { isDayEnded: boolean; isPaused: boolean; isTimeFrozen: boolean }) {
  if (clock.isDayEnded) return "ended";
  if (clock.isPaused) return "paused";
  if (clock.isTimeFrozen) return "frozen";
  return "running";
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className={`df-score-cell ${signClass(value)}`}>
      <span className="lbl">{label}</span>
      <span className="val">{formatSigned(value)}</span>
    </div>
  );
}

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function signClass(value: number): "pos" | "neg" | "" {
  if (value > 0) return "pos";
  if (value < 0) return "neg";
  return "";
}
