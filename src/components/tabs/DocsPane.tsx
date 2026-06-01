import { useTranslation } from "react-i18next";

export function DocsPane() {
  const { t } = useTranslation();
  return (
    <article>
      <h3>{t("docs.title")}</h3>
      <p className="muted">{t("docs.intro")}</p>

      <h4 style={{ fontFamily: "var(--font-pixel)", fontSize: 18, marginTop: 18 }}>
        {t("docs.activeUser.heading")}
      </h4>
      <p>{t("docs.activeUser.body")}</p>

      <h4 style={{ fontFamily: "var(--font-pixel)", fontSize: 18, marginTop: 18 }}>
        {t("docs.revenue.heading")}
      </h4>
      <p>{t("docs.revenue.body")}</p>

      <h4 style={{ fontFamily: "var(--font-pixel)", fontSize: 18, marginTop: 18 }}>
        {t("docs.testAccounts.heading")}
      </h4>
      <p>{t("docs.testAccounts.body")}</p>

      <p
        className="muted"
        style={{
          marginTop: 24,
          fontSize: 11,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {t("docs.footer")}
      </p>
    </article>
  );
}
