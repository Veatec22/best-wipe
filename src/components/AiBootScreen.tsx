import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getLocalWebGpuAiProvider, useAiStore } from "../services/ai";
import { Button } from "../ui/components";

interface AiBootScreenProps {
  children: ReactNode;
}

const BOOT_TIPS = [
  "RUN oznacza tylko, ze SQL sie wykonal. Nie oznacza, ze stakeholder dostal dobra odpowiedz.",
  "Domyslnie filtruj konta testowe, chyba ze request mowi inaczej.",
  "Korpo to nie kolejka FIFO. Tribe i relacje maja wage.",
  "Saved query moze byc technicznie poprawne i semantycznie stare.",
];

export function AiBootScreen({ children }: AiBootScreenProps) {
  const { t } = useTranslation();
  const modelId = useAiStore(state => state.modelId);
  const status = useAiStore(state => state.status);
  const progress = useAiStore(state => state.progress);
  const error = useAiStore(state => state.error);
  const readyModelId = useAiStore(state => state.readyModelId);
  const startLoadingModel = useAiStore(state => state.startLoadingModel);
  const setProgress = useAiStore(state => state.setProgress);
  const markModelReady = useAiStore(state => state.markModelReady);
  const failRequest = useAiStore(state => state.failRequest);
  const [skipAiBoot, setSkipAiBoot] = useState(() => {
    const flag = import.meta.env.VITE_SKIP_AI?.toLowerCase();
    return flag === "1" || flag === "true" || flag === "yes";
  });
  const tip = useMemo(() => BOOT_TIPS[Math.floor(Math.random() * BOOT_TIPS.length)], []);

  useEffect(() => {
    if (readyModelId === modelId || skipAiBoot) return;
    let cancelled = false;
    startLoadingModel();
    getLocalWebGpuAiProvider()
      .preloadModel(modelId, nextProgress => {
        if (!cancelled) setProgress(nextProgress);
      })
      .then(() => {
        if (!cancelled) markModelReady(modelId);
      })
      .catch(err => {
        if (!cancelled) failRequest(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [
    failRequest,
    markModelReady,
    modelId,
    readyModelId,
    setProgress,
    skipAiBoot,
    startLoadingModel,
  ]);

  if (readyModelId === modelId || skipAiBoot) return children;

  const percent = progress ? Math.round(progress.progress * 100) : 0;
  const isError = status === "error";

  return (
    <div className="df-boot-screen">
      <div className="df-boot-frame">
        <div className="df-boot-kicker">{t("boot.kicker")}</div>
        <h1>{t("boot.title")}</h1>
        <div className="df-boot-model">{modelId}</div>

        <div
          className="df-boot-progress"
          role="progressbar"
          aria-label={t("boot.progressAria", { percent })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div style={{ width: `${percent}%` }} />
        </div>

        <div className="df-boot-status">
          {isError ? t("boot.errorTitle") : t("boot.loading", { percent })}
        </div>
        <p className="df-boot-detail">{isError ? error : formatBootDetail(progress?.text, t)}</p>
        <p className="df-boot-tip">{tip}</p>

        {isError && (
          <Button variant="primary" onClick={() => setSkipAiBoot(true)}>
            {t("boot.continueWithoutAi")}
          </Button>
        )}
      </div>
    </div>
  );
}

function formatBootDetail(rawText: string | undefined, t: TFunction) {
  if (!rawText) return t("boot.detail.preparing");
  const normalized = rawText.toLowerCase();
  if (normalized.includes("cache")) return t("boot.detail.cache");
  if (normalized.includes("fetch") || normalized.includes("download"))
    return t("boot.detail.download");
  if (normalized.includes("warm")) return t("boot.detail.warmup");
  if (normalized.includes("gpu") || normalized.includes("webgpu")) return t("boot.detail.webgpu");
  return t("boot.detail.preparing");
}
