import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import pl from "./locales/pl.json";

export const SUPPORTED_LOCALES = ["pl", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pl";

void i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: pl },
    en: { translation: en },
  },
  lng: DEFAULT_LOCALE,
  // Fall back to PL — design says PL is the canonical voice; EN is a simpler
  // reference. Missing EN keys silently fall through to PL rather than to keys.
  fallbackLng: "pl",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
