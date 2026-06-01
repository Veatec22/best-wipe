import type { PersonId } from "./people";

export interface ChatMessage {
  id: string;
  who: PersonId;
  time: string;
  text: string;
}

export interface SystemDivider {
  id: string;
  kind: "system";
  text: string;
}

export type ActionStatus = "pending" | "accepted" | "rejected" | "ignored";

export interface ActionRequest {
  id: string;
  kind: "action_request";
  who: PersonId;
  time: string;
  text: string;
  actionKind: "sql_task" | "social_decision" | "tutorial_decision";
  acceptLabel: string;
  rejectLabel: string;
  /** Set after the player clicks ACCEPT/REJECT. Undefined = pending. */
  status?: ActionStatus;
  /** Total real-time seconds since run-start when this request became visible. */
  deliveredAtTotalSeconds?: number;
  /** Hidden timeout used by detectIgnored. Undefined = default timeout. */
  hiddenExpiresAfterSeconds?: number;
  /** Total real-time seconds since run-start when the request became ignored. */
  ignoredAtTotalSeconds?: number;
}

/**
 * Player's "tu masz wynik" message — referenced by submission id so the
 * actual SQL + result table can be looked up at any time, even after the
 * draft SQL has been edited or the run has been re-executed.
 */
export interface TaskSubmissionMessage {
  id: string;
  kind: "task_submission";
  who: PersonId; // always "you" for v1
  time: string;
  /** Short cover line (e.g. "proszę"). The buttons reveal Code / Wynik. */
  text: string;
  submissionId: string;
}

export type ChatItem = ChatMessage | SystemDivider | ActionRequest | TaskSubmissionMessage;

export const THREADS: Record<string, ChatItem[]> = {
  lead_kuba: [
    { id: "k1", kind: "system", text: "── nowy dzień · day 01 ──" },
    {
      id: "k2",
      who: "lead_kuba",
      time: "09:02",
      text: "Hej, witaj w Best Wipe. :smile: Jestem Kuba, twoim leadem. Tribe: Growth.\nNa dziś: spokojny start, spinamy ci dostępy i sprawdzamy czy działa.",
    },
    {
      id: "k3",
      who: "lead_kuba",
      time: "09:04",
      text: "Pierwszy temat poniżej. Jak będziesz miał wątpliwości — pisz. :wink:",
    },
    {
      id: "k4",
      kind: "action_request",
      who: "lead_kuba",
      time: "09:05",
      text: "Daj mi liczbę userów w bazie. Chcę sprawdzić, czy masz spięty dostęp.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUĆ",
    },
  ],
  pm_ola: [
    {
      id: "p1",
      who: "pm_ola",
      time: "09:30",
      text: "Hej! :blush: Słyszałam że dziś zaczynasz. Ola, PM w Growth. Pewnie się jeszcze odezwę z tematem przed boardem :)",
    },
    {
      id: "p2",
      kind: "action_request",
      who: "pm_ola",
      time: "09:42",
      text:
        "Skoro masz juz SQL odpalony, :smile: zrobisz mi mini raport na board? Revenue po kraju usera, jeden wykres wystarczy. " +
        "Nie tabelka, tylko raport, zeby dalo sie wkleic na slajd.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  ],
  jr_bartek: [
    {
      id: "j1",
      who: "jr_bartek",
      time: "09:45",
      text: "hej, jestem bartek, junior dev. jakbyś czegoś nie widział w sql workbenchu to pisz, ja siedzę obok cyfrowo :xd:",
    },
  ],
  fin_grazyna: [],
  fin_janusz: [],
  sales_tomek: [],
  hr_magda: [],
  mkt_kasia: [],
  pm_radek: [],
  ceo_marek: [],
  general: [
    { id: "g1", kind: "system", text: "── #general ──" },
    {
      id: "g2",
      who: "hr_magda",
      time: "08:55",
      text: "Welcome do nowego pracownika w tribe Growth! :touched: Poznajcie się i pomóżcie wdrożyć.",
    },
  ],
  data_platform: [
    { id: "d1", kind: "system", text: "── #data-platform ──" },
    {
      id: "d2",
      who: "lead_kuba",
      time: "08:30",
      text: "Reminder :warning: definicje metryk w Dokumentacji. Aktywny user = ≥1 sesja w danym miesiącu.",
    },
  ],
};
