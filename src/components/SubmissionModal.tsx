import { Cancel } from "pixelarticons/react/Cancel";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getTaskDefinition } from "../game/tasks/registry";
import type { TaskSubmission } from "../game/tasks/taskTypes";
import { IconButton } from "../ui/components";
import { QueryResultTable } from "./QueryResultTable";

type View = "code" | "result";

interface Props {
  submission: TaskSubmission;
  initialView?: View;
  onClose(): void;
}

/**
 * Read-only viewer for what the player actually sent on a given SEND.
 * Two tabs: SQL code, and the result snapshot. Both are rehydrated from the
 * persisted `TaskSubmission` record — independent of any subsequent edits
 * to the task draft.
 */
export function SubmissionModal({ submission, initialView = "code", onClose }: Props) {
  const { t } = useTranslation();
  const [view, setView] = useState<View>(initialView);
  const def = getTaskDefinition(submission.taskId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="df-modal-backdrop" onMouseDown={onClose} role="presentation" aria-hidden="true">
      <div
        className="df-submission-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("submission.title")}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="df-avatar-modal-head">
          <h3>{t("submission.title")}</h3>
          <IconButton variant="framed" label={t("submission.close")} onClick={onClose}>
            <Cancel width={16} height={16} aria-hidden="true" />
          </IconButton>
        </div>

        <div className="df-submission-meta">
          <span className="lbl">{def?.title ?? submission.taskId}</span>
          <span className="lbl">
            {submission.gameTimeLabel ?? new Date(submission.submittedAt).toLocaleString()}
          </span>
          <span className={`df-submission-severity sev-${submission.outcome.severity}`}>
            {t(`submission.severity.${submission.outcome.severity}`)}
          </span>
        </div>

        <div className="df-submission-tabs" role="tablist">
          <button
            type="button"
            className={`df-task-subtab${view === "code" ? " active" : ""}`}
            onClick={() => setView("code")}
            role="tab"
            aria-selected={view === "code"}
          >
            {t("submission.code")}
          </button>
          <button
            type="button"
            className={`df-task-subtab${view === "result" ? " active" : ""}`}
            onClick={() => setView("result")}
            role="tab"
            aria-selected={view === "result"}
          >
            {t("submission.result")}
          </button>
        </div>

        <div className="df-submission-body">
          {view === "code" ? (
            <pre className="df-submission-code">{submission.sql}</pre>
          ) : (
            <div className="df-submission-result">
              <QueryResultTable
                result={submission.result}
                status="idle"
                loadingLabel=""
                runningLabel=""
                idleLabel={t("sql.idle")}
                emptyLabel={t("sql.empty")}
                errorLabel={t("sql.error")}
                filterPlaceholder={t("sql.filterPlaceholder")}
                emptyAfterFilterLabel={t("sql.emptyAfterFilter")}
                rowsLabel={(count, ms) => t("sql.rowsMeta", { count, ms })}
                truncatedLabel={(shown, total) => t("sql.truncated", { shown, total })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
