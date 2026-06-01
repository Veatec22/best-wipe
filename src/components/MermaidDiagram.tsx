import mermaid from "mermaid";
import { Expand } from "pixelarticons/react/Expand";
import { Search } from "pixelarticons/react/Search";
import { ZoomIn } from "pixelarticons/react/ZoomIn";
import { ZoomOut } from "pixelarticons/react/ZoomOut";
import {
  type FormEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
  type WheelEvent,
} from "react";

let mermaidInitialized = false;

function ensureMermaidInitialized() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    themeVariables: {
      background: "#f4f1ea",
      primaryColor: "#f4f1ea",
      primaryTextColor: "#0a0a0a",
      primaryBorderColor: "#0a0a0a",
      lineColor: "#0a0a0a",
      secondaryColor: "#e8e4d8",
      tertiaryColor: "#d8d2c1",
      fontSize: "13px",
    },
    flowchart: {
      htmlLabels: true,
      curve: "stepBefore",
      nodeSpacing: 28,
      rankSpacing: 44,
    },
    er: {
      useMaxWidth: true,
      entityPadding: 14,
      stroke: "#0a0a0a",
      fill: "#f4f1ea",
      diagramPadding: 14,
    },
  });
  mermaidInitialized = true;
}

let renderCounter = 0;
function nextRenderId(prefix: string): string {
  renderCounter += 1;
  return `${prefix}-${renderCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  /** Mermaid source code (e.g. "graph TD\n..." or "erDiagram\n..."). */
  chart: string;
  /** Stable prefix for generated render ids — useful when two diagrams coexist. */
  idPrefix?: string;
  /** Accessible label exposed via aria-label on the wrapping div (role=img). */
  ariaLabel: string;
  /** className for the wrapper div. */
  className?: string;
  /** Optional caption shown while the SVG is being rendered. */
  loadingLabel?: string;
  /** Enables drag-to-pan, wheel zoom, and explicit zoom controls. */
  interactiveCanvas?: boolean;
  canvasLabels?: {
    toolbar: string;
    search: string;
    searchPlaceholder: string;
    zoomIn: string;
    zoomOut: string;
    reset: string;
  };
}

const MIN_CANVAS_SCALE = 0.5;
const MAX_CANVAS_SCALE = 2.25;
const CANVAS_SCALE_STEP = 0.1;

function clampScale(scale: number): number {
  return Math.min(MAX_CANVAS_SCALE, Math.max(MIN_CANVAS_SCALE, Number(scale.toFixed(2))));
}

/**
 * Renders a Mermaid diagram into an SVG block. Uses the "loose" security level,
 * so only pass charts built from trusted in-app data, never user input.
 */
export function MermaidDiagram({
  chart,
  idPrefix = "df-mermaid",
  ariaLabel,
  className,
  loadingLabel,
  interactiveCanvas = false,
  canvasLabels,
}: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureMermaidInitialized();
    setError(null);
    setSvg(null);
    setCanvasTransform({ x: 0, y: 0, scale: 1 });
    setSearchQuery("");
    dragRef.current = null;
    const renderId = nextRenderId(idPrefix);
    mermaid
      .render(renderId, chart)
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [chart, idPrefix]);

  const zoomBy = (delta: number) => {
    setCanvasTransform(transform => ({
      ...transform,
      scale: clampScale(transform.scale + delta),
    }));
  };

  const resetCanvas = () => {
    setCanvasTransform({ x: 0, y: 0, scale: 1 });
  };

  const clearSearchHit = () => {
    contentRef.current?.querySelectorAll(".df-mermaid-search-hit").forEach(element => {
      element.classList.remove("df-mermaid-search-hit");
    });
  };

  const focusSearchResult = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) {
      clearSearchHit();
      return;
    }

    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const match = Array.from(content.querySelectorAll("text, tspan")).find(element =>
      element.textContent?.toLocaleLowerCase().includes(query),
    );
    if (!match) {
      clearSearchHit();
      return;
    }

    clearSearchHit();
    const target = match.closest("g") ?? match;
    target.classList.add("df-mermaid-search-hit");

    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetCenterX = targetRect.left + targetRect.width / 2 - viewportRect.left;
    const targetCenterY = targetRect.top + targetRect.height / 2 - viewportRect.top;
    const localCenterX = (targetCenterX - canvasTransform.x) / canvasTransform.scale;
    const localCenterY = (targetCenterY - canvasTransform.y) / canvasTransform.scale;
    const nextScale = clampScale(Math.max(canvasTransform.scale, 1.35));

    setCanvasTransform({
      x: viewportRect.width / 2 - localCenterX * nextScale,
      y: viewportRect.height / 2 - localCenterY * nextScale,
      scale: nextScale,
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactiveCanvas) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setCanvasTransform(transform => ({
      ...transform,
      x: transform.x + deltaX,
      y: transform.y + deltaY,
    }));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!interactiveCanvas) return;
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? CANVAS_SCALE_STEP : -CANVAS_SCALE_STEP);
  };

  if (interactiveCanvas) {
    return (
      <div className={className}>
        {canvasLabels && (
          <div
            className="df-mermaid-canvas-toolbar"
            role="toolbar"
            aria-label={canvasLabels.toolbar}
          >
            <form className="df-mermaid-canvas-search" onSubmit={focusSearchResult}>
              <button type="submit" aria-label={canvasLabels.search}>
                <Search width={14} height={14} aria-hidden="true" />
              </button>
              <input
                type="search"
                aria-label={canvasLabels.search}
                placeholder={canvasLabels.searchPlaceholder}
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
              />
            </form>
            <div className="df-mermaid-canvas-controls">
              <button
                type="button"
                aria-label={canvasLabels.zoomOut}
                onClick={() => zoomBy(-CANVAS_SCALE_STEP)}
              >
                <ZoomOut width={14} height={14} aria-hidden="true" />
              </button>
              <button type="button" aria-label={canvasLabels.reset} onClick={resetCanvas}>
                <Expand width={14} height={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={canvasLabels.zoomIn}
                onClick={() => zoomBy(CANVAS_SCALE_STEP)}
              >
                <ZoomIn width={14} height={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        <div
          ref={viewportRef}
          className="df-mermaid-canvas-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
        >
          <div
            ref={contentRef}
            className="df-mermaid-canvas-content"
            role="img"
            aria-label={ariaLabel}
            style={{
              transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
            }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid produces SVG from trusted in-app strings.
            dangerouslySetInnerHTML={{ __html: svg ?? "" }}
          />
          {!svg && !error && loadingLabel && (
            <p className="muted" style={{ fontSize: 11 }}>
              {loadingLabel}
            </p>
          )}
          {error && <MermaidError message={error} />}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={ariaLabel}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid produces SVG from trusted in-app strings.
        dangerouslySetInnerHTML={{ __html: svg ?? "" }}
      />
      {!svg && !error && loadingLabel && (
        <p className="muted" style={{ fontSize: 11 }}>
          {loadingLabel}
        </p>
      )}
      {error && <MermaidError message={error} />}
    </div>
  );
}

function MermaidError({ message }: { message: string }) {
  return (
    <pre
      style={{
        fontSize: 11,
        color: "var(--err)",
        whiteSpace: "pre-wrap",
        border: "2px solid var(--err)",
        padding: 8,
      }}
    >
      {message}
    </pre>
  );
}
