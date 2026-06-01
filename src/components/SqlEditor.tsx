import { sql } from "@codemirror/lang-sql";
import { Compartment, EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import { useEffect, useRef } from "react";
import { dataFeverSqlDialect } from "../services/duckdb/sqlDialect";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  schemaTables?: Record<string, string[]>;
};

export function SqlEditor({ value, onChange, onRun, schemaTables }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const langCompartment = useRef(new Compartment());

  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  // biome-ignore lint/correctness/useExhaustiveDependencies: editor mount intentionally happens once; value/schema are synced via separate effects
  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onRunRef.current?.();
              return true;
            },
          },
        ]),
        langCompartment.current.of(
          sql({ dialect: dataFeverSqlDialect, schema: schemaTables, upperCaseKeywords: true }),
        ),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": {
            height: "100%",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            backgroundColor: "var(--paper)",
          },
          ".cm-scroller": {
            fontFamily: "var(--font-mono)",
            lineHeight: "1.5",
          },
          ".cm-gutters": {
            backgroundColor: "var(--paper-2)",
            color: "var(--muted)",
            border: "0",
            borderRight: "2px solid var(--ink)",
          },
          ".cm-activeLine": {
            backgroundColor: "transparent",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "var(--paper-3)",
          },
          ".cm-content": {
            caretColor: "var(--ink)",
          },
          "&.cm-focused": {
            outline: "none",
          },
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external value into the editor when it differs (e.g., template insertion).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  // Reconfigure SQL completion when schema changes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: langCompartment.current.reconfigure(
        sql({ dialect: dataFeverSqlDialect, schema: schemaTables, upperCaseKeywords: true }),
      ),
    });
  }, [schemaTables]);

  return <div ref={hostRef} className="df-sql-editor" />;
}
