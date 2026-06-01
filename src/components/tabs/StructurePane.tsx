import type React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PEOPLE, type PersonId, TRIBE_LABEL } from "../../data/people";
import { DataGrid } from "../DataGrid";
import { MermaidDiagram } from "../MermaidDiagram";

type StructureView = "diagram" | "table";

function nodeIdFor(id: PersonId): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function escapeLabel(text: string): string {
  return text.replace(/"/g, "#quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildOrgGraph(): string {
  const lines: string[] = ["graph TD"];

  for (const p of Object.values(PEOPLE)) {
    const label = escapeLabel(`${p.name}\n${p.role}`);
    lines.push(`  ${nodeIdFor(p.id)}["${label}"]`);
  }

  for (const p of Object.values(PEOPLE)) {
    if (!p.reportsTo) continue;
    lines.push(`  ${nodeIdFor(p.reportsTo)} --> ${nodeIdFor(p.id)}`);
  }

  lines.push(
    "  classDef you fill:#c6e3b8,stroke:#0a0a0a,stroke-width:2.5px,font-weight:700;",
    "  classDef ceo fill:#0a0a0a,stroke:#0a0a0a,stroke-width:2px,color:#f4f1ea,font-weight:700;",
    "  classDef lead fill:#e8e4d8,stroke:#0a0a0a,stroke-width:2px,font-weight:700;",
  );

  lines.push(`  class ${nodeIdFor("you")} you;`);
  for (const p of Object.values(PEOPLE)) {
    if (p.role === "CEO") lines.push(`  class ${nodeIdFor(p.id)} ceo;`);
    else if (p.role.startsWith("Lead")) lines.push(`  class ${nodeIdFor(p.id)} lead;`);
  }

  return lines.join("\n");
}

export function StructurePane() {
  const { t } = useTranslation();
  const [view, setView] = useState<StructureView>("diagram");
  const graph = useMemo(buildOrgGraph, []);

  return (
    <div className="df-org">
      <h3>{t("structure.title")}</h3>
      <p
        className="muted"
        style={{
          fontSize: 11,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        {t("structure.subtitle")}
      </p>

      <div className="df-structure-tabs" role="tablist" aria-label={t("structure.viewTabsLabel")}>
        <button
          type="button"
          role="tab"
          aria-selected={view === "diagram"}
          className={view === "diagram" ? "active" : ""}
          onClick={() => setView("diagram")}
        >
          {t("structure.views.diagram")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "table"}
          className={view === "table" ? "active" : ""}
          onClick={() => setView("table")}
        >
          {t("structure.views.table")}
        </button>
      </div>

      {view === "diagram" ? (
        <>
          <Legend />
          <MermaidDiagram
            chart={graph}
            idPrefix="df-org-tree"
            className="df-org-tree"
            ariaLabel={t("structure.ariaLabel")}
            loadingLabel={t("structure.loading")}
            interactiveCanvas
            canvasLabels={{
              toolbar: t("structure.canvas.toolbar"),
              search: t("structure.canvas.search"),
              searchPlaceholder: t("structure.canvas.searchPlaceholder"),
              zoomIn: t("structure.canvas.zoomIn"),
              zoomOut: t("structure.canvas.zoomOut"),
              reset: t("structure.canvas.reset"),
            }}
          />
        </>
      ) : (
        <PeopleTable />
      )}
    </div>
  );
}

function Legend() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        fontSize: 11,
        letterSpacing: 0.5,
        marginBottom: 14,
        textTransform: "uppercase",
      }}
    >
      <LegendChip color="#0a0a0a" textColor="#f4f1ea">
        {t("structure.legend.ceo")}
      </LegendChip>
      <LegendChip color="#e8e4d8">{t("structure.legend.lead")}</LegendChip>
      <LegendChip color="#c6e3b8">{t("structure.legend.you")}</LegendChip>
    </div>
  );
}

function LegendChip({
  color,
  textColor = "#0a0a0a",
  children,
}: {
  color: string;
  textColor?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        background: color,
        color: textColor,
        border: "2px solid #0a0a0a",
        padding: "1px 8px",
        fontWeight: 700,
        letterSpacing: 1,
      }}
    >
      {children}
    </span>
  );
}

function PeopleTable() {
  const { t } = useTranslation();
  const rows = useMemo(
    () =>
      Object.values(PEOPLE)
        .sort((a, b) => a.name.localeCompare(b.name, "pl"))
        .map(p => {
          const { firstName, lastName } = splitName(p.name);
          return [
            TRIBE_LABEL[p.tribe],
            firstName,
            lastName,
            p.role,
            p.reportsTo ? PEOPLE[p.reportsTo].name : t("structure.noManager"),
          ];
        }),
    [t],
  );

  return (
    <div className="df-structure-table">
      <DataGrid
        columns={[
          t("structure.table.department"),
          t("structure.table.firstName"),
          t("structure.table.lastName"),
          t("structure.table.role"),
          t("structure.table.reportsTo"),
        ]}
        rows={rows}
        filterPlaceholder={t("structure.table.filterPlaceholder")}
        emptyAfterFilterLabel={t("structure.table.emptyAfterFilter")}
      />
    </div>
  );
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
