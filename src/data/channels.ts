import type { PersonId } from "./people";

export type ChannelGroup = "CHANNELS" | "DM";

export interface ChannelDef {
  id: string;
  kind: "dm" | "channel";
  label: string;
  group: ChannelGroup;
  with?: PersonId;
  badge?: number;
  urgent?: boolean;
}

// Slack-style ordering: public channels at the top, direct messages below.
export const CHANNELS: ChannelDef[] = [
  // Channels
  { id: "general", kind: "channel", label: "general", group: "CHANNELS" },
  { id: "data_platform", kind: "channel", label: "data-platform", group: "CHANNELS" },

  // Direct messages — order roughly by relevance to the player on Day 1
  {
    id: "lead_kuba",
    kind: "dm",
    label: "kuba-lead",
    group: "DM",
    with: "lead_kuba",
    badge: 1,
    urgent: false,
  },
  {
    id: "pm_ola",
    kind: "dm",
    label: "pm-ola",
    group: "DM",
    with: "pm_ola",
    badge: 1,
    urgent: false,
  },
  {
    id: "jr_bartek",
    kind: "dm",
    label: "junior-bartek",
    group: "DM",
    with: "jr_bartek",
    badge: 1,
    urgent: false,
  },
  {
    id: "fin_grazyna",
    kind: "dm",
    label: "fin-grazyna",
    group: "DM",
    with: "fin_grazyna",
  },
  { id: "sales_tomek", kind: "dm", label: "sales-tomek", group: "DM", with: "sales_tomek" },
  { id: "hr_magda", kind: "dm", label: "support-magda", group: "DM", with: "hr_magda" },
  { id: "mkt_kasia", kind: "dm", label: "mkt-kasia", group: "DM", with: "mkt_kasia" },
  { id: "fin_janusz", kind: "dm", label: "fin-janusz", group: "DM", with: "fin_janusz" },
  { id: "pm_radek", kind: "dm", label: "product-radek", group: "DM", with: "pm_radek" },
  { id: "ceo_marek", kind: "dm", label: "ceo-marek", group: "DM", with: "ceo_marek" },
];

export const CHANNEL_GROUPS: Array<{ name: ChannelGroup; label: string }> = [
  { name: "CHANNELS", label: "KANAŁY" },
  { name: "DM", label: "DIRECT MESSAGES" },
];
