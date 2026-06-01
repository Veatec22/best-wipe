import { useTranslation } from "react-i18next";
import { SCHEMA_ERD_DAY1 } from "../../data/schema";
import { MermaidDiagram } from "../MermaidDiagram";

export function SchemaPane() {
  const { t } = useTranslation();
  return (
    <div className="df-schema">
      <h3>{t("schema.title")}</h3>
      <p
        className="muted"
        style={{
          fontSize: 11,
          letterSpacing: 0.5,
          marginBottom: 14,
        }}
      >
        {t("schema.subtitle")}
      </p>
      <MermaidDiagram
        chart={SCHEMA_ERD_DAY1}
        idPrefix="df-schema-erd"
        className="df-schema-diagram"
        ariaLabel={t("schema.ariaLabel")}
        loadingLabel={t("schema.loading")}
        interactiveCanvas
        canvasLabels={{
          toolbar: t("schema.canvas.toolbar"),
          search: t("schema.canvas.search"),
          searchPlaceholder: t("schema.canvas.searchPlaceholder"),
          zoomIn: t("schema.canvas.zoomIn"),
          zoomOut: t("schema.canvas.zoomOut"),
          reset: t("schema.canvas.reset"),
        }}
      />
    </div>
  );
}
