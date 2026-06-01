import { Check } from "pixelarticons/react/Check";
import { Copy } from "pixelarticons/react/Copy";
import { Loader } from "pixelarticons/react/Loader";
import { Mail } from "pixelarticons/react/Mail";
import { Play } from "pixelarticons/react/Play";
import { Sparkles } from "pixelarticons/react/Sparkles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { canBuildReport, isValidReportConfig } from "../../game/reports/reportModel";
import { getTaskDefinition, TASK_DEFINITIONS } from "../../game/tasks/registry";
import type { TaskInstance } from "../../game/tasks/taskTypes";
import { getLocalWebGpuAiProvider, useAiStore } from "../../services/ai";
import { ensureDatasetLoaded } from "../../services/duckdb/datasetLoader";
import { getDuckDB } from "../../services/duckdb/duckdbClient";
import { runQuery } from "../../services/duckdb/queryRunner";
import { useFactsStore } from "../../store/factsStore";
import { useSqlWorkspaceStore } from "../../store/sqlWorkspaceStore";
import { useTasksStore } from "../../store/tasksStore";
import { Button } from "../../ui/components";
import { QueryResultTable } from "../QueryResultTable";
import { ReportBuilder } from "../ReportBuilder";
import { SqlEditor } from "../SqlEditor";

const SCHEMA_TABLES: Record<string, string[]> = {
  countries: ["id", "country_name"],
  products: ["id", "name", "type", "base_price"],
  campaigns: ["id", "name", "channel", "start_date", "end_date"],
  users: [
    "id",
    "registration_date",
    "name",
    "surname",
    "country_id",
    "is_test",
    "date_of_birth",
    "gender",
    "city",
  ],
  sales: [
    "id",
    "transaction_date",
    "user_id",
    "order_id",
    "product_id",
    "campaign_id",
    "quantity",
    "net",
    "tax",
    "gross",
  ],
  refunds: ["id", "order_id", "product_id", "refund_date", "amount", "reason"],
  complaints: ["id", "user_id", "date", "message"],
};

const GAME_CONTEXT = [
  "Best Wipe / SQL Fever is a single-player corporate survival sim.",
  "The player is a junior data analyst at Best Wipe during probation week 1.",
  "SQL is run locally in DuckDB against the visible schema.",
  "AI may suggest SQL, but deterministic validators and story consequences decide outcomes.",
  "RUN only means the SQL executed; it does not mean the answer is correct.",
].join("\n");

const SCRATCHPAD_TASK_BRIEF = [
  "The player is using the Week 1 scratchpad.",
  "Generate the best read-only SELECT for the current request and visible schema.",
  "If the existing SQL is partial or wrong, replace it with a cleaner proposed SELECT.",
].join("\n");

type Status = "idle" | "loading-runtime" | "running";

interface Props {
  onSubmitTask(taskId: string): void | Promise<void>;
}

export function TasksPane({ onSubmitTask }: Props) {
  const { t } = useTranslation();

  // Scratchpad state (separate store, unchanged behavior).
  const scratchpadSql = useSqlWorkspaceStore(state => state.sql);
  const scratchpadResult = useSqlWorkspaceStore(state => state.result);
  const setScratchpadSql = useSqlWorkspaceStore(state => state.setSql);
  const setScratchpadResult = useSqlWorkspaceStore(state => state.setResult);

  // Task instance state.
  const tasksMap = useTasksStore(state => state.tasks);
  const activeTaskId = useTasksStore(state => state.activeTaskId);
  const setActiveTaskId = useTasksStore(state => state.setActive);
  const setTaskSql = useTasksStore(state => state.setDraftSql);
  const setTaskResult = useTasksStore(state => state.setLastResult);
  const setReportConfig = useTasksStore(state => state.setReportConfig);

  const taskList = useMemo(() => Object.values(tasksMap), [tasksMap]);
  const activeTask: TaskInstance | null = activeTaskId ? (tasksMap[activeTaskId] ?? null) : null;
  const activeDef = activeTask ? getTaskDefinition(activeTask.id) : null;

  // AI state.
  const aiModelId = useAiStore(state => state.modelId);
  const aiUsed = useAiStore(state => state.used);
  const aiTotal = useAiStore(state => state.total);
  const aiStatus = useAiStore(state => state.status);
  const aiProgress = useAiStore(state => state.progress);
  const aiError = useAiStore(state => state.error);
  const aiSuggestion = useAiStore(state => state.lastSuggestion);
  const readyModelId = useAiStore(state => state.readyModelId);
  const startLoadingModel = useAiStore(state => state.startLoadingModel);
  const startGenerating = useAiStore(state => state.startGenerating);
  const setAiProgress = useAiStore(state => state.setProgress);
  const markModelReady = useAiStore(state => state.markModelReady);
  const finishAiRequest = useAiStore(state => state.finishRequest);
  const failAiRequest = useAiStore(state => state.failRequest);

  const [status, setStatus] = useState<Status>("loading-runtime");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportBuilderTaskId, setReportBuilderTaskId] = useState<string | null>(null);

  // Active SQL = either scratchpad or the active task's draft. Keep a ref so
  // RUN / Ask AI handlers always read the latest value.
  const currentSql = activeTask ? activeTask.draftSql : scratchpadSql;
  const sqlRef = useRef(currentSql);
  sqlRef.current = currentSql;

  const setCurrentSql = useCallback(
    (sql: string) => {
      if (activeTask) setTaskSql(activeTask.id, sql);
      else setScratchpadSql(sql);
    },
    [activeTask, setTaskSql, setScratchpadSql],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const handle = await getDuckDB();
        await ensureDatasetLoaded({ handle, day: 1, facts: useFactsStore.getState() });
        if (!cancelled) setStatus("idle");
      } catch (err) {
        if (cancelled) return;
        setStatus("idle");
        const error = {
          ok: false as const,
          error: err instanceof Error ? err.message : String(err),
          durationMs: 0,
        };
        setScratchpadResult(error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runtime is global â€” boot only once.
  }, [setScratchpadResult]);

  const handleRun = useCallback(async () => {
    setStatus("running");
    const next = await runQuery(sqlRef.current);
    if (activeTask) setTaskResult(activeTask.id, next);
    else setScratchpadResult(next);
    setStatus("idle");
  }, [activeTask, setTaskResult, setScratchpadResult]);

  const handleSend = useCallback(async () => {
    if (!activeTask) return;
    setSending(true);
    try {
      await onSubmitTask(activeTask.id);
    } finally {
      setSending(false);
    }
  }, [activeTask, onSubmitTask]);

  const handleAskAi = useCallback(async () => {
    if (aiUsed >= aiTotal) {
      failAiRequest(t("ai.noSlots"));
      return;
    }
    const provider = getLocalWebGpuAiProvider();
    try {
      if (readyModelId !== aiModelId) {
        startLoadingModel();
        await provider.preloadModel(aiModelId, progress => setAiProgress(progress));
        markModelReady(aiModelId);
      }
      startGenerating();
      const taskBrief = activeDef ? activeDef.brief : SCRATCHPAD_TASK_BRIEF;
      const response = await provider.askSqlHelp({
        gameContext: GAME_CONTEXT,
        taskBrief,
        schemaTables: SCHEMA_TABLES,
        userSql: sqlRef.current,
        modelId: aiModelId,
      });
      finishAiRequest(response);
    } catch (err) {
      failAiRequest(err instanceof Error ? err.message : String(err));
    }
  }, [
    activeDef,
    aiModelId,
    aiTotal,
    aiUsed,
    failAiRequest,
    finishAiRequest,
    markModelReady,
    readyModelId,
    setAiProgress,
    startGenerating,
    startLoadingModel,
    t,
  ]);

  const handleCopySuggestion = useCallback(async () => {
    if (!aiSuggestion) return;
    await navigator.clipboard.writeText(aiSuggestion.sql);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [aiSuggestion]);

  const aiBusy = aiStatus === "loading-model" || aiStatus === "generating";
  const askDisabled = aiBusy;

  const currentResult = activeTask ? activeTask.lastResult : scratchpadResult;
  const isReportTask = activeDef?.kind === "sql_report";
  const reportCanBuild = isReportTask && canBuildReport(currentResult);
  const reportBuilderOpen = Boolean(activeTask && reportBuilderTaskId === activeTask.id);
  const reportConfigValid =
    !isReportTask ||
    Boolean(activeTask && isValidReportConfig(currentResult, activeTask.reportConfig));
  const sendDisabled =
    !activeTask ||
    sending ||
    activeTask.status === "submitted_ok" ||
    status !== "idle" ||
    !reportConfigValid;
  const sendLabel = (() => {
    if (sending) return t("tasks.sending");
    if (!activeTask) return t("tasks.send");
    if (activeTask.status === "submitted_ok") return t("tasks.sentOk");
    if (activeTask.status === "submitted_bad") return t("tasks.sendAgain");
    return t("tasks.send");
  })();

  const showSubtabs = taskList.length > 0;

  return (
    <div className="df-sql-pane">
      {showSubtabs && (
        <div className="df-task-subtabs" role="tablist">
          <button
            type="button"
            className={`df-task-subtab${activeTaskId === null ? " active" : ""}`}
            onClick={() => setActiveTaskId(null)}
            role="tab"
            aria-selected={activeTaskId === null}
          >
            {t("tasks.scratchpadTab")}
          </button>
          {taskList.map(ti => {
            const def = TASK_DEFINITIONS[ti.id];
            const label = def?.title ?? ti.id;
            return (
              <button
                key={ti.id}
                type="button"
                className={`df-task-subtab status-${ti.status}${ti.id === activeTaskId ? " active" : ""}`}
                onClick={() => setActiveTaskId(ti.id)}
                role="tab"
                aria-selected={ti.id === activeTaskId}
              >
                <span>{label}</span>
                {ti.status === "submitted_ok" && (
                  <span className="df-task-subtab-badge ok" aria-hidden="true">
                    âś“
                  </span>
                )}
                {ti.status === "submitted_bad" && (
                  <span className="df-task-subtab-badge bad" aria-hidden="true">
                    !
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {activeDef && (
        <div className="df-task-brief">
          <div className="df-task-brief-head">
            <span>TASK</span>
            <strong>{activeDef.title}</strong>
          </div>
          <p>{activeDef.brief}</p>
        </div>
      )}
      <div className="df-sql-bar">
        <span className="df-sql-bar-label">
          {activeDef ? activeDef.title : t("sql.scratchpadLabel")}
        </span>
        <div className="df-sql-bar-actions">
          <Button variant="primary" onClick={handleRun} disabled={status !== "idle"}>
            {status === "idle" ? (
              <Play width={14} height={14} aria-hidden="true" />
            ) : (
              <Loader width={14} height={14} aria-hidden="true" />
            )}
            <span>
              {status === "loading-runtime"
                ? t("sql.runtimeLoading")
                : status === "running"
                  ? t("sql.running")
                  : t("sql.run")}
            </span>
          </Button>
          <Button onClick={handleAskAi} disabled={askDisabled}>
            {aiBusy ? (
              <Loader width={14} height={14} aria-hidden="true" />
            ) : (
              <Sparkles width={14} height={14} aria-hidden="true" />
            )}
            <span>
              {aiStatus === "loading-model"
                ? t("ai.loadingModel")
                : aiStatus === "generating"
                  ? t("ai.generating")
                  : t("header.askAi", { used: aiUsed, total: aiTotal })}
            </span>
          </Button>
        </div>
      </div>
      {(aiProgress || aiError || aiSuggestion) && (
        <div className="df-ai-panel">
          {aiProgress && (
            <div className="df-ai-progress">
              <span>{Math.round(aiProgress.progress * 100)}%</span>
              <span>{aiProgress.text}</span>
            </div>
          )}
          {aiError && <div className="df-ai-error">{aiError}</div>}
          {aiSuggestion && (
            <div className="df-ai-suggestion">
              <div className="df-ai-suggestion-head">
                <span>{t("ai.suggestionTitle", { model: aiSuggestion.modelId })}</span>
                <div className="df-sql-bar-actions">
                  <Button onClick={() => setCurrentSql(aiSuggestion.sql)}>
                    <Check width={14} height={14} aria-hidden="true" />
                    <span>{t("ai.insert")}</span>
                  </Button>
                  <Button onClick={handleCopySuggestion}>
                    <Copy width={14} height={14} aria-hidden="true" />
                    <span>{copied ? t("ai.copied") : t("ai.copy")}</span>
                  </Button>
                </div>
              </div>
              <pre>{aiSuggestion.sql}</pre>
            </div>
          )}
        </div>
      )}
      <div className="df-sql-editor-wrap">
        <SqlEditor
          value={currentSql}
          onChange={setCurrentSql}
          onRun={handleRun}
          schemaTables={SCHEMA_TABLES}
        />
      </div>
      {activeTask && (
        <div className="df-sql-result-bar">
          <span className="df-sql-result-label">{t("sql.resultsLabel")}</span>
          <Button variant="primary" onClick={handleSend} disabled={sendDisabled}>
            {sending ? (
              <Loader width={14} height={14} aria-hidden="true" />
            ) : (
              <Mail width={14} height={14} aria-hidden="true" />
            )}
            <span>{sendLabel}</span>
          </Button>
        </div>
      )}
      <div className="df-sql-result">
        <QueryResultTable
          result={currentResult}
          status={status}
          loadingLabel={t("sql.runtimeLoading")}
          runningLabel={t("sql.running")}
          idleLabel={t("sql.idle")}
          emptyLabel={t("sql.empty")}
          errorLabel={t("sql.error")}
          filterPlaceholder={t("sql.filterPlaceholder")}
          emptyAfterFilterLabel={t("sql.emptyAfterFilter")}
          rowsLabel={(count, ms) => t("sql.rowsMeta", { count, ms })}
          truncatedLabel={(shown, total) => t("sql.truncated", { shown, total })}
        />
      </div>
      {activeTask && isReportTask && (
        <div className="df-report-entry">
          {reportCanBuild ? (
            <>
              {!reportBuilderOpen && (
                <Button onClick={() => setReportBuilderTaskId(activeTask.id)}>
                  <span>{t("report.build")}</span>
                </Button>
              )}
              {reportBuilderOpen && currentResult?.ok && (
                <ReportBuilder
                  result={currentResult}
                  config={activeTask.reportConfig}
                  taskBrief={activeDef.brief}
                  onChange={config => setReportConfig(activeTask.id, config)}
                />
              )}
            </>
          ) : (
            <div className="df-result-status muted">{t("report.runFirst")}</div>
          )}
        </div>
      )}
    </div>
  );
}
