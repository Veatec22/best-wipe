import type { ActionRequest, ChatMessage } from "../data/messages";
import type { PersonId } from "../data/people";
import type { CampaignEvent, MessageContent } from "./campaign/types";
import { type GameClock, gameTimeToElapsedSeconds } from "./clock";

/**
 * One scheduled chat event for a given in-game day.
 *
 * `message` is either a normal `ChatMessage` (intro / context line) or an
 * `ActionRequest` (a task the player can ACCEPT/REJECT). Both are delivered
 * the same way — just appended to the channel thread when the in-game clock
 * crosses `revealAt`. Action requests retain their existing `id`, so the
 * task registry can resolve `fromActionId` exactly as for hand-authored
 * Day-1 messages in `THREADS`.
 */
export interface ScheduledMessage {
  id: string;
  day: number;
  channelId: string;
  revealAt: string;
  typingLeadSeconds: number;
  message: ChatMessage | ActionRequest;
}

export interface ActiveTyping {
  channelId: string;
  personId: PersonId;
}

/**
 * Day 1 timeline (09:00 → 17:00 in-game).
 *
 * The static `THREADS` already places the first two tasks (Kuba k4 at 09:05,
 * Ola p2 at 09:42). Everything below ramps the workday up: introductions
 * land first, the action_request a couple of minutes later, so the player
 * gets a moment of context before each ACCEPT button shows up.
 *
 * Times are spread across the morning, around lunch, and into the afternoon
 * so different tasks compete for attention — that's the gameplay surface.
 */
export const SCHEDULED_MESSAGES: ScheduledMessage[] = [
  // 10:15 — Ola dorzuca temat #1 (sprzedaż miesięczna).
  {
    id: "day1_pm_ola_1015_intro",
    day: 1,
    channelId: "pm_ola",
    revealAt: "10:15",
    typingLeadSeconds: 6,
    message: {
      id: "pm_ola_1015_intro",
      who: "pm_ola",
      time: "10:15",
      text: "jeszcze jedno, jak skończysz raport — mam wrzutkę numerologiczną do księgi.",
    },
  },
  {
    id: "day1_pm_ola_1018_task",
    day: 1,
    channelId: "pm_ola",
    revealAt: "10:18",
    typingLeadSeconds: 6,
    message: {
      id: "p3",
      kind: "action_request",
      who: "pm_ola",
      time: "10:18",
      text: "Hej, potrzebuję sprzedaż miesięczną od października do kwietnia. Net, tax, gross. Tabelka, bez filozofii.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // 10:50 — Sales Tomek wskakuje pierwszy raz.
  {
    id: "day1_sales_tomek_1050_intro",
    day: 2,
    channelId: "sales_tomek",
    revealAt: "10:50",
    typingLeadSeconds: 5,
    message: {
      id: "st1",
      who: "sales_tomek",
      time: "10:50",
      text: "ej mordo, jesteś tym nowym od sql? mam wrzutkę, klient dyszy.",
    },
  },
  {
    id: "day1_sales_tomek_1055_task",
    day: 2,
    channelId: "sales_tomek",
    revealAt: "10:55",
    typingLeadSeconds: 6,
    message: {
      id: "st2",
      kind: "action_request",
      who: "sales_tomek",
      time: "10:55",
      text: "Mordo, daj top 10 rolek po gross revenue. Klient pyta, które produkty nam robią wynik.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // 11:20 — Marketing Kasia, pierwszy z dwóch jej tematów.
  {
    id: "day1_mkt_kasia_1120_intro",
    day: 2,
    channelId: "mkt_kasia",
    revealAt: "11:20",
    typingLeadSeconds: 5,
    message: {
      id: "mk1",
      who: "mkt_kasia",
      time: "11:20",
      text: "hej, Kasia z Marketingu, mam temat na slajd na sync o 14:00.",
    },
  },
  {
    id: "day1_mkt_kasia_1125_task",
    day: 2,
    channelId: "mkt_kasia",
    revealAt: "11:25",
    typingLeadSeconds: 6,
    message: {
      id: "mk2",
      kind: "action_request",
      who: "mkt_kasia",
      time: "11:25",
      text: "Potrzebuję sprzedaż per kraj. Najlepiej gross i liczba zamówień. Do slajdu na sync.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // 12:10 — Data Platform heads-up + sanity-check task na #data-platform.
  {
    id: "day1_dp_robert_1210_announce",
    day: 3,
    channelId: "data_platform",
    revealAt: "12:10",
    typingLeadSeconds: 5,
    message: {
      id: "dp1",
      who: "dp_robert",
      time: "12:10",
      text: "[heads-up] Widzimy, że w niektórych raportach przeciekają konta testowe. Prosimy o sanity check.",
    },
  },
  {
    id: "day1_dp_robert_1215_task",
    day: 3,
    channelId: "data_platform",
    revealAt: "12:15",
    typingLeadSeconds: 6,
    message: {
      id: "dp2",
      kind: "action_request",
      who: "dp_robert",
      time: "12:15",
      text: "Mały heads-up: testowe konta czasem wpadają do raportów. Sprawdź, ile sprzedaży pochodzi od is_test = true.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // 12:58–13:04 — istniejący wątek Grażyny zostawiamy bez zmian.
  {
    id: "day1_fin_grazyna_1258_001",
    day: 3,
    channelId: "fin_grazyna",
    revealAt: "12:58",
    typingLeadSeconds: 7,
    message: {
      id: "fg1",
      who: "fin_grazyna",
      time: "12:58",
      text: "Hej, Grażyna z księgowości. Masz chwilę na drobną rzecz?",
    },
  },
  {
    id: "day1_fin_grazyna_1301_002",
    day: 3,
    channelId: "fin_grazyna",
    revealAt: "13:01",
    typingLeadSeconds: 6,
    message: {
      id: "fg2",
      who: "fin_grazyna",
      time: "13:01",
      text: "Nie zgadza mi się o 30 groszy na sprzedaży z wczoraj. Pewnie zaokrąglenia, ale CFO już pytał.",
    },
  },
  {
    id: "day1_fin_grazyna_1304_003",
    day: 3,
    channelId: "fin_grazyna",
    revealAt: "13:04",
    typingLeadSeconds: 6,
    message: {
      id: "fg3",
      who: "fin_grazyna",
      time: "13:04",
      text: "Podeślij mi proszę listę transakcji dla refundów i sprzedaży za wczoraj, tylko bez testowych kont. Nie musi być piękne, byle szybko.",
    },
  },

  // 13:35 — Janusz z controllingu (oddzielny człowiek od Grażyny).
  {
    id: "day1_fin_janusz_1335_intro",
    day: 3,
    channelId: "fin_janusz",
    revealAt: "13:35",
    typingLeadSeconds: 5,
    message: {
      id: "fj1",
      who: "fin_janusz",
      time: "13:35",
      text: "Dzień dobry, Janusz z controllingu. Dostaję od CFO pytanie, które od kilku dni odbijam.",
    },
  },
  {
    id: "day1_fin_janusz_1340_task",
    day: 3,
    channelId: "fin_janusz",
    revealAt: "13:40",
    typingLeadSeconds: 6,
    message: {
      id: "fj2",
      kind: "action_request",
      who: "fin_janusz",
      time: "13:40",
      text: "Potrzebuję revenue po refundach. Nie brutto-brutto, tylko po odjęciu zwrotów.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // 14:20 — Kasia wraca z drugim tematem (kampanie).
  {
    id: "day1_mkt_kasia_1420_task",
    day: 4,
    channelId: "mkt_kasia",
    revealAt: "14:20",
    typingLeadSeconds: 6,
    message: {
      id: "mk3",
      kind: "action_request",
      who: "mkt_kasia",
      time: "14:20",
      text: "Które kampanie dowiozły najwięcej gross revenue? Daj ranking kampanii.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // 14:55 — Radek z Productu pojawia się po raz pierwszy.
  {
    id: "day1_pm_radek_1455_intro",
    day: 4,
    channelId: "pm_radek",
    revealAt: "14:55",
    typingLeadSeconds: 5,
    message: {
      id: "pr1",
      who: "pm_radek",
      time: "14:55",
      text: "hej, Radek, Product. Słyszałem od Oli że jesteś nowy — mam jedno małe śledztwo.",
    },
  },
  {
    id: "day1_pm_radek_1500_task",
    day: 4,
    channelId: "pm_radek",
    revealAt: "15:00",
    typingLeadSeconds: 6,
    message: {
      id: "pr2",
      kind: "action_request",
      who: "pm_radek",
      time: "15:00",
      text: "Chcę wiedzieć, które produkty najczęściej wracają jako refund. Podejrzewam, że coś śmierdzi przy premium.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // 15:30 — Magda znów (tym razem support, nie HR).
  {
    id: "day1_hr_magda_1530_intro",
    day: 5,
    channelId: "hr_magda",
    revealAt: "15:30",
    typingLeadSeconds: 5,
    message: {
      id: "hm1",
      who: "hr_magda",
      time: "15:30",
      text: "Cześć! Wiem, że dziś dzień próbny — mam króciutki temat z supportu, jeśli możesz.",
    },
  },
  {
    id: "day1_hr_magda_1535_task",
    day: 5,
    channelId: "hr_magda",
    revealAt: "15:35",
    typingLeadSeconds: 6,
    message: {
      id: "hm2",
      kind: "action_request",
      who: "hr_magda",
      time: "15:35",
      text: "Daj mi userów z największą liczbą reklamacji. Chcę zobaczyć, czy mamy stałych maruderów.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // 16:10 — CEO. Lakonicznie.
  {
    id: "day1_ceo_marek_1610_task",
    day: 6,
    channelId: "ceo_marek",
    revealAt: "16:10",
    typingLeadSeconds: 5,
    message: {
      id: "cm1",
      kind: "action_request",
      who: "ceo_marek",
      time: "16:10",
      text: "AOV. Teraz.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // 16:40 — Kuba na koniec dnia: top miasta.
  {
    id: "day1_lead_kuba_1640_task",
    day: 6,
    channelId: "lead_kuba",
    revealAt: "16:40",
    typingLeadSeconds: 6,
    message: {
      id: "k5",
      kind: "action_request",
      who: "lead_kuba",
      time: "16:40",
      text: "Które miasta robią największy gross? Daj top 10, ale bez kont testowych.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // Day 2 â€” Tomek doklada szybki trend, juz bez rozgrzewki.
  {
    id: "day2_sales_tomek_1520_task",
    day: 2,
    channelId: "sales_tomek",
    revealAt: "15:20",
    typingLeadSeconds: 6,
    message: {
      id: "st3",
      kind: "action_request",
      who: "sales_tomek",
      time: "15:20",
      text: "Jeszcze jedno: daj mi zamowienia dzien po dniu. Nie pozycje, tylko ordery. Klient pyta czy kampania siadla.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // Day 4 â€” Kasia prosi o segmentacje kampanii.
  {
    id: "day4_mkt_kasia_1120_task",
    day: 4,
    channelId: "mkt_kasia",
    revealAt: "11:20",
    typingLeadSeconds: 6,
    message: {
      id: "mk4",
      kind: "action_request",
      who: "mkt_kasia",
      time: "11:20",
      text: "Potrzebuje gross per gender do segmentacji. Bez testowych, bo potem wychodza dziwne persony w decku.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // Day 5 â€” Product wraca do refundow, tym razem przez powody.
  {
    id: "day5_pm_radek_1040_task",
    day: 5,
    channelId: "pm_radek",
    revealAt: "10:40",
    typingLeadSeconds: 6,
    message: {
      id: "pr3",
      kind: "action_request",
      who: "pm_radek",
      time: "10:40",
      text: "Mozesz zrobic ranking powodow refundow? Reason, liczba, kwota. Chce wiedziec czy to produkt czy komunikacja.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // Day 6 â€” Support pyta o reklamacje po miastach.
  {
    id: "day6_hr_magda_1125_task",
    day: 6,
    channelId: "hr_magda",
    revealAt: "11:25",
    typingLeadSeconds: 6,
    message: {
      id: "hm3",
      kind: "action_request",
      who: "hr_magda",
      time: "11:25",
      text: "Masz moze miasta z najwieksza liczba reklamacji? Bez kont testowych, support chce zadzwonic do realnych userow.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },

  // Day 7 â€” finalny tydzienny nacisk z gory.
  {
    id: "day7_ceo_marek_1000_task",
    day: 7,
    channelId: "ceo_marek",
    revealAt: "10:00",
    typingLeadSeconds: 5,
    message: {
      id: "cm2",
      kind: "action_request",
      who: "ceo_marek",
      time: "10:00",
      text: "Net revenue po refundach. Jedna liczba.",
      actionKind: "sql_task",
      acceptLabel: "PRZYJMIJ",
      rejectLabel: "ODRZUC",
    },
  },
  {
    id: "day7_lead_kuba_1630_wrap",
    day: 7,
    channelId: "lead_kuba",
    revealAt: "16:30",
    typingLeadSeconds: 6,
    message: {
      id: "k6",
      who: "lead_kuba",
      time: "16:30",
      text: "Dobra, domykaj co masz. Po dniu 7 robimy review tygodnia i patrzymy, co wybuchlo po drodze.",
    },
  },

  // Korpo ambient events: tylko flavor, bez action_request i bez konsekwencji.
  {
    id: "day1_general_room_rename_1135",
    day: 1,
    channelId: "general",
    revealAt: "11:35",
    typingLeadSeconds: 4,
    message: {
      id: "g_day1_room_rename_1135",
      who: "hr_magda",
      time: "11:35",
      text: "[office] Salka Konferencyjna 2 od dzisiaj nazywa sie Synergia. Prosba, zeby nie mowic juz 'ta przy kuchni', bo recepcja nie wie, gdzie kierowac gosci.",
    },
  },
  {
    id: "day1_general_kudos_1545",
    day: 1,
    channelId: "general",
    revealAt: "15:45",
    typingLeadSeconds: 5,
    message: {
      id: "g_day1_kudos_1545",
      who: "lead_kuba",
      time: "15:45",
      text: "Kudos dla Bartka za ogarniecie builda demo przed standupem. Niby nic, a jednak wszyscy mieli co klikac.",
    },
  },
  {
    id: "day2_general_fruit_thursday_0908",
    day: 2,
    channelId: "general",
    revealAt: "09:08",
    typingLeadSeconds: 4,
    message: {
      id: "g_day2_fruit_thursday_0908",
      who: "hr_magda",
      time: "09:08",
      text: "Dobra wiadomosc: owocowe czwartki wracaja od przyszlego tygodnia. Na start jablka, banany i cos sezonowego, jesli procurement dowiezie.",
    },
  },
  {
    id: "day2_general_parking_reminder_1405",
    day: 2,
    channelId: "general",
    revealAt: "14:05",
    typingLeadSeconds: 4,
    message: {
      id: "g_day2_parking_reminder_1405",
      who: "hr_magda",
      time: "14:05",
      text: "Reminder: miejsca parkingowe z naklejka VISITOR sa dla gosci, nie dla 'tylko na chwile'. Facilities prosilo, zebym napisala to capslockiem, ale sie powstrzymalam.",
    },
  },
  {
    id: "day3_general_product_name_vote_1010",
    day: 3,
    channelId: "general",
    revealAt: "10:10",
    typingLeadSeconds: 5,
    message: {
      id: "g_day3_product_name_vote_1010",
      who: "pm_radek",
      time: "10:10",
      text: "Startuje glosowanie na nazwe nowego produktu papieru toaletowego. Opcje: CloudSoft, QueryRoll, VelvetOps, SprintWipe. Reakcje pod tym postem do 16:00.",
    },
  },
  {
    id: "day3_general_coffee_machine_1540",
    day: 3,
    channelId: "general",
    revealAt: "15:40",
    typingLeadSeconds: 4,
    message: {
      id: "g_day3_coffee_machine_1540",
      who: "jr_bartek",
      time: "15:40",
      text: "Ekspres robi teraz tylko espresso i komunikat DESCALE. Nie jestem ownerem ekspresu, ale tak, probowalem go zrestartowac.",
    },
  },
  {
    id: "day4_general_room_rename_again_0935",
    day: 4,
    channelId: "general",
    revealAt: "09:35",
    typingLeadSeconds: 4,
    message: {
      id: "g_day4_room_rename_again_0935",
      who: "hr_magda",
      time: "09:35",
      text: "Update do salek: Synergia wraca do nazwy Konferencyjna 2, bo system rezerwacji nie przyjal polskich znakow w opisie. Przepraszamy za chaos.",
    },
  },
  {
    id: "day4_general_kudos_finance_1325",
    day: 4,
    channelId: "general",
    revealAt: "13:25",
    typingLeadSeconds: 5,
    message: {
      id: "g_day4_kudos_finance_1325",
      who: "ceo_marek",
      time: "13:25",
      text: "Dobra robota Finance przy zamknieciu miesiaca. Krotko: bylo mniej czerwono niz zwykle.",
    },
  },
  {
    id: "day5_general_all_hands_0920",
    day: 5,
    channelId: "general",
    revealAt: "09:20",
    typingLeadSeconds: 5,
    message: {
      id: "g_day5_all_hands_0920",
      who: "hr_magda",
      time: "09:20",
      text: "All-hands dzisiaj 16:00. Agenda: wyniki kwartalu, culture pulse, oraz 7 minut o tym, dlaczego nie trzymamy jogurtow bez podpisu w lodowce.",
    },
  },
  {
    id: "day5_general_product_vote_result_1510",
    day: 5,
    channelId: "general",
    revealAt: "15:10",
    typingLeadSeconds: 5,
    message: {
      id: "g_day5_product_vote_result_1510",
      who: "pm_radek",
      time: "15:10",
      text: "Wynik glosowania: QueryRoll wygrywa nazwe papieru toaletowego. Legal pyta, czy to naprawde finalna nazwa, wiec traktujmy to jako 'roboczo finalna'.",
    },
  },
  {
    id: "day6_general_desk_policy_1030",
    day: 6,
    channelId: "general",
    revealAt: "10:30",
    typingLeadSeconds: 4,
    message: {
      id: "g_day6_desk_policy_1030",
      who: "hr_magda",
      time: "10:30",
      text: "Hot deski: zostawianie bluzy na krzesle od 08:00 nie rezerwuje miejsca na caly dzien. To jest oficjalna interpretacja polityki biurowej.",
    },
  },
  {
    id: "day6_general_kudos_sales_1445",
    day: 6,
    channelId: "general",
    revealAt: "14:45",
    typingLeadSeconds: 5,
    message: {
      id: "g_day6_kudos_sales_1445",
      who: "sales_tomek",
      time: "14:45",
      text: "Shoutout dla Kasi z Marketingu za deck dla klienta. Byly wykresy, byla narracja, klient powiedzial 'interesting', czyli chyba wygralismy.",
    },
  },
  {
    id: "day7_general_fruit_followup_0915",
    day: 7,
    channelId: "general",
    revealAt: "09:15",
    typingLeadSeconds: 4,
    message: {
      id: "g_day7_fruit_followup_0915",
      who: "hr_magda",
      time: "09:15",
      text: "Owocowe czwartki update: mandarynki jednak dopiero od kolejnego czwartku, bo vendor ma 'incydent logistyczny'. Banany bez zmian.",
    },
  },
  {
    id: "day7_general_week_kudos_1555",
    day: 7,
    channelId: "general",
    revealAt: "15:55",
    typingLeadSeconds: 5,
    message: {
      id: "g_day7_week_kudos_1555",
      who: "lead_kuba",
      time: "15:55",
      text: "Kudos dla wszystkich, ktorzy dowiezli ten tydzien mimo wrzutek, rebriefow i trzech wersji jednej tabelki. Milego weekendu, jak juz do niego dojdziemy.",
    },
  },
];

export function getDueScheduledMessages(
  clock: GameClock,
  deliveredIds: ReadonlySet<string>,
): ScheduledMessage[] {
  const elapsed = clock.elapsedTodaySeconds;
  return SCHEDULED_MESSAGES.filter(event => {
    if (event.day !== clock.day || deliveredIds.has(event.id)) return false;
    return elapsed >= gameTimeToElapsedSeconds(event.revealAt, clock.dayDurationSeconds);
  });
}

export function getActiveTyping(
  clock: GameClock,
  deliveredIds: ReadonlySet<string>,
): ActiveTyping[] {
  const elapsed = clock.elapsedTodaySeconds;
  return SCHEDULED_MESSAGES.flatMap(event => {
    if (event.day !== clock.day || deliveredIds.has(event.id)) return [];
    const revealSecond = gameTimeToElapsedSeconds(event.revealAt, clock.dayDurationSeconds);
    const typingStart = Math.max(0, revealSecond - event.typingLeadSeconds);
    if (elapsed < typingStart || elapsed >= revealSecond) return [];
    return [{ channelId: event.channelId, personId: event.message.who }];
  });
}

export const SCHEDULED_MESSAGE_CONTENT: Record<string, MessageContent> = Object.fromEntries(
  SCHEDULED_MESSAGES.map(event => [
    event.message.id,
    {
      id: event.message.id,
      default: event.message,
    },
  ]),
);

export const SCHEDULED_MESSAGE_EVENTS: CampaignEvent[] = SCHEDULED_MESSAGES.map(event => ({
  id: event.id,
  day: event.day,
  time: event.revealAt,
  effects: [{ type: "post_message", channelId: event.channelId, messageId: event.message.id }],
}));
