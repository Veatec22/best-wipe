import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TextField } from "../../ui/components";

const STORAGE_KEY = "data_fever:notes:probation_week1";
const AUTOSAVE_DEBOUNCE_MS = 1500;

export function NotesPane() {
  const { t } = useTranslation();
  const [text, setText] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!dirty) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, text);
        setSavedAt(new Date());
        setDirty(false);
      } catch {
        // localStorage may be unavailable in some contexts; fail soft.
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [text, dirty]);

  // Flush on unmount so the last edit always lands.
  useEffect(
    () => () => {
      try {
        localStorage.setItem(STORAGE_KEY, text);
      } catch {
        // ignore
      }
    },
    [text],
  );

  const status = dirty
    ? t("notes.statusSaving")
    : savedAt
      ? t("notes.statusSavedAt", { time: savedAt.toLocaleTimeString("pl-PL") })
      : t("notes.statusIdle");

  return (
    <div className="df-notes">
      <TextField
        multiline
        fill
        value={text}
        placeholder={t("notes.placeholder")}
        onChange={e => {
          setText(e.target.value);
          setDirty(true);
        }}
        spellCheck={false}
      />
      <div className="df-notes-foot">
        <span>{status}</span>
        <span>{t("notes.chars", { count: text.length })}</span>
      </div>
    </div>
  );
}
