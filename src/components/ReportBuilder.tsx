import { Check } from "pixelarticons/react/Check";
import { Loader } from "pixelarticons/react/Loader";
import { Sparkles } from "pixelarticons/react/Sparkles";
import { forwardRef, useMemo, useRef } from "react";
import Draggable, { type DraggableData, type DraggableEvent } from "react-draggable";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildReportChartRows,
  classifyReportFields,
  getReportColumns,
  isCompleteReportConfig,
} from "../game/reports/reportModel";
import type { ReportChartConfig, ReportChartType } from "../game/reports/reportTypes";
import { getLocalWebGpuAiProvider, useAiStore } from "../services/ai";
import type { QueryResult } from "../services/duckdb/queryRunner";
import { Button } from "../ui/components";

interface Props {
  result: QueryResult;
  config: ReportChartConfig | null;
  taskBrief: string;
  onChange(config: ReportChartConfig): void;
}

const CHART_TYPES: ReportChartType[] = ["bar", "line"];

export function ReportBuilder({ config, onChange, result, taskBrief }: Props) {
  const { t } = useTranslation();
  const columnsShelfRef = useRef<HTMLDivElement>(null);
  const rowsShelfRef = useRef<HTMLDivElement>(null);
  const aiModelId = useAiStore(state => state.modelId);
  const aiUsed = useAiStore(state => state.used);
  const aiTotal = useAiStore(state => state.total);
  const aiStatus = useAiStore(state => state.status);
  const aiProgress = useAiStore(state => state.progress);
  const aiError = useAiStore(state => state.error);
  const aiSuggestion = useAiStore(state => state.lastReportSuggestion);
  const readyModelId = useAiStore(state => state.readyModelId);
  const startLoadingModel = useAiStore(state => state.startLoadingModel);
  const startGenerating = useAiStore(state => state.startGenerating);
  const setAiProgress = useAiStore(state => state.setProgress);
  const markModelReady = useAiStore(state => state.markModelReady);
  const finishReportRequest = useAiStore(state => state.finishReportRequest);
  const failAiRequest = useAiStore(state => state.failRequest);
  const columns = getReportColumns(result);
  const fieldGroups = useMemo(() => classifyReportFields(result), [result]);
  const current = config ?? { chartType: null, xColumn: null, yColumn: null };
  const rows = useMemo(() => buildReportChartRows(result, current), [current, result]);
  const canPreview = isCompleteReportConfig(current) && rows.length > 0;
  const aiBusy = aiStatus === "loading-model" || aiStatus === "generating";
  const askDisabled = aiBusy;

  function update(patch: Partial<ReportChartConfig>) {
    onChange({ ...current, ...patch });
  }

  function handleDrop(field: string, data: DraggableData) {
    const nodeRect = data.node.getBoundingClientRect();
    const centerX = nodeRect.left + nodeRect.width / 2;
    const centerY = nodeRect.top + nodeRect.height / 2;
    const target = getDropTarget(centerX, centerY);
    if (target === "columns") update({ xColumn: field });
    if (target === "rows") update({ yColumn: field });
  }

  function getDropTarget(x: number, y: number): "columns" | "rows" | null {
    if (containsPoint(columnsShelfRef.current, x, y)) return "columns";
    if (containsPoint(rowsShelfRef.current, x, y)) return "rows";
    return null;
  }

  async function handleAskAi() {
    if (!result.ok) return;
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
      const response = await provider.askReportHelp({
        taskBrief,
        columns: result.columns,
        sampleRows: result.rows.slice(0, 5),
        modelId: aiModelId,
      });
      finishReportRequest(response);
    } catch (err) {
      failAiRequest(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="df-report-builder" aria-label={t("report.builderLabel")}>
      <div className="df-report-builder-head">
        <span>{t("report.title")}</span>
        <div className="df-report-head-actions">
          <span>{t("report.sourceColumns", { count: columns.length })}</span>
          <Button onClick={handleAskAi} disabled={askDisabled} size="compact">
            {aiBusy ? (
              <Loader width={14} height={14} aria-hidden="true" />
            ) : (
              <Sparkles width={14} height={14} aria-hidden="true" />
            )}
            <span>
              {aiStatus === "loading-model"
                ? t("ai.loadingModel")
                : aiStatus === "generating"
                  ? t("report.aiGenerating")
                  : t("report.askAi")}
            </span>
          </Button>
        </div>
      </div>

      <div className="df-report-tableau">
        <aside className="df-report-fields">
          <FieldGroup
            title={t("report.dimensions")}
            fields={fieldGroups.dimensions}
            kind="dimension"
            onDrop={handleDrop}
            onQuickPick={field => update({ xColumn: field })}
          />
          <FieldGroup
            title={t("report.measures")}
            fields={fieldGroups.measures}
            kind="measure"
            onDrop={handleDrop}
            onQuickPick={field => update({ yColumn: field })}
          />
        </aside>

        <div className="df-report-workbench">
          <div className="df-report-type-row">
            <span>{t("report.chartType")}</span>
            <div className="df-report-type-buttons">
              {CHART_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  className={current.chartType === type ? "active" : ""}
                  onClick={() => update({ chartType: type })}
                >
                  {t(`report.types.${type}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="df-report-shelves">
            <ReportShelf
              ref={columnsShelfRef}
              label={t("report.columnsShelf")}
              value={current.xColumn}
              placeholder={t("report.dropDimension")}
              onClear={() => update({ xColumn: null })}
            />
            <ReportShelf
              ref={rowsShelfRef}
              label={t("report.rowsShelf")}
              value={current.yColumn}
              placeholder={t("report.dropMeasure")}
              onClear={() => update({ yColumn: null })}
            />
          </div>
        </div>
      </div>

      {(aiProgress || aiError || aiSuggestion) && (
        <div className="df-report-ai">
          {aiProgress && (
            <div className="df-ai-progress">
              <span>{Math.round(aiProgress.progress * 100)}%</span>
              <span>{aiProgress.text}</span>
            </div>
          )}
          {aiError && <div className="df-ai-error">{aiError}</div>}
          {aiSuggestion && (
            <div className="df-ai-suggestion-head">
              <span>
                {t("report.aiSuggestion", {
                  type: t(`report.types.${aiSuggestion.chartType}`),
                  x: aiSuggestion.xColumn,
                  y: aiSuggestion.yColumn,
                })}
              </span>
              <Button
                size="compact"
                onClick={() =>
                  onChange({
                    chartType: aiSuggestion.chartType,
                    xColumn: aiSuggestion.xColumn,
                    yColumn: aiSuggestion.yColumn,
                  })
                }
              >
                <Check width={14} height={14} aria-hidden="true" />
                <span>{t("report.useSuggestion")}</span>
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="df-report-preview">
        {canPreview ? (
          <ResponsiveContainer width="100%" height="100%">
            {current.chartType === "line" ? (
              <LineChart data={rows} margin={{ top: 16, right: 18, bottom: 20, left: 16 }}>
                <CartesianGrid stroke="var(--paper-3)" vertical={false} />
                <XAxis dataKey="x" tickLine={false} stroke="var(--ink)" />
                <YAxis tickLine={false} stroke="var(--ink)" />
                <Tooltip cursor={{ stroke: "var(--ink)" }} />
                <Line type="linear" dataKey="y" stroke="var(--ink)" strokeWidth={2} dot />
              </LineChart>
            ) : (
              <BarChart data={rows} margin={{ top: 16, right: 18, bottom: 20, left: 16 }}>
                <CartesianGrid stroke="var(--paper-3)" vertical={false} />
                <XAxis dataKey="x" tickLine={false} stroke="var(--ink)" />
                <YAxis tickLine={false} stroke="var(--ink)" />
                <Tooltip cursor={{ fill: "var(--paper-2)" }} />
                <Bar dataKey="y" fill="var(--ink)" />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="df-report-empty">{t("report.previewEmpty")}</div>
        )}
      </div>
    </section>
  );
}

interface FieldGroupProps {
  title: string;
  fields: string[];
  kind: "dimension" | "measure";
  onDrop(field: string, data: DraggableData): void;
  onQuickPick(field: string): void;
}

function FieldGroup({ fields, kind, onDrop, onQuickPick, title }: FieldGroupProps) {
  return (
    <section className="df-report-field-group">
      <h4 className="df-report-field-title">{title}</h4>
      <div className="df-report-field-list">
        {fields.map(field => (
          <DraggableField
            key={field}
            field={field}
            kind={kind}
            onDrop={onDrop}
            onQuickPick={onQuickPick}
          />
        ))}
      </div>
    </section>
  );
}

interface DraggableFieldProps {
  field: string;
  kind: "dimension" | "measure";
  onDrop(field: string, data: DraggableData): void;
  onQuickPick(field: string): void;
}

function DraggableField({ field, kind, onDrop, onQuickPick }: DraggableFieldProps) {
  const nodeRef = useRef<HTMLButtonElement>(null);

  function handleStop(_event: DraggableEvent, data: DraggableData) {
    onDrop(field, data);
  }

  return (
    <Draggable nodeRef={nodeRef} position={{ x: 0, y: 0 }} onStop={handleStop}>
      <button
        ref={nodeRef}
        type="button"
        className={`df-report-field-chip ${kind}`}
        onDoubleClick={() => onQuickPick(field)}
        title={field}
      >
        <span>{kind === "measure" ? "#" : "Abc"}</span>
        <strong>{field}</strong>
      </button>
    </Draggable>
  );
}

interface ShelfProps {
  label: string;
  value: string | null;
  placeholder: string;
  onClear(): void;
}

const ReportShelf = forwardRef<HTMLDivElement, ShelfProps>(function ReportShelf(
  { label, onClear, placeholder, value },
  ref,
) {
  return (
    <div ref={ref} className={`df-report-shelf${value ? " filled" : ""}`}>
      <span className="df-report-shelf-label">{label}</span>
      {value ? (
        <button type="button" className="df-report-shelf-pill" onClick={onClear}>
          {value}
        </button>
      ) : (
        <span className="df-report-shelf-placeholder">{placeholder}</span>
      )}
    </div>
  );
});

function containsPoint(element: HTMLElement | null, x: number, y: number): boolean {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
