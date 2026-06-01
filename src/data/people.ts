import type { AvatarRef } from "../game/campaign/avatarTypes";

export type PersonId =
  | "you"
  | "lead_kuba"
  | "pm_ola"
  | "ceo_marek"
  | "sales_tomek"
  | "fin_grazyna"
  | "fin_janusz"
  | "hr_magda"
  | "jr_bartek"
  | "mkt_kasia"
  | "pm_radek"
  | "dp_robert";

export type PersonaTag =
  | "you"
  | "lead"
  | "pm"
  | "ceo"
  | "sales"
  | "fin"
  | "hr"
  | "jr"
  | "mkt"
  | "dp"
  | "prod";

export type Tribe =
  | "growth"
  | "data_platform"
  | "sales"
  | "finance"
  | "exec"
  | "hr"
  | "marketing"
  | "product";

export interface Person {
  id: PersonId;
  name: string;
  role: string;
  persona: PersonaTag;
  tribe: Tribe;
  /** Direct manager. CEO has no manager. */
  reportsTo?: PersonId;
  avatar?: AvatarRef;
}

export const PEOPLE: Record<PersonId, Person> = {
  ceo_marek: { id: "ceo_marek", name: "Marek K.", role: "CEO", persona: "ceo", tribe: "exec" },
  lead_kuba: {
    id: "lead_kuba",
    name: "Kuba S.",
    role: "Lead · Growth",
    persona: "lead",
    tribe: "growth",
    reportsTo: "ceo_marek",
    avatar: { kind: "static", id: "lead" },
  },
  pm_ola: {
    id: "pm_ola",
    name: "Ola P.",
    role: "PM · Growth",
    persona: "pm",
    tribe: "growth",
    reportsTo: "lead_kuba",
  },
  jr_bartek: {
    id: "jr_bartek",
    name: "Bartek N.",
    role: "Junior Dev",
    persona: "jr",
    tribe: "growth",
    reportsTo: "lead_kuba",
  },
  you: {
    id: "you",
    name: "ty",
    role: "Junior Data Analyst",
    persona: "you",
    tribe: "growth",
    reportsTo: "lead_kuba",
  },
  fin_grazyna: {
    id: "fin_grazyna",
    name: "Grażyna K.",
    role: "Księgowość",
    persona: "fin",
    tribe: "finance",
    reportsTo: "ceo_marek",
  },
  fin_janusz: {
    id: "fin_janusz",
    name: "Janusz W.",
    role: "Finance · Controlling",
    persona: "fin",
    tribe: "finance",
    reportsTo: "ceo_marek",
  },
  sales_tomek: {
    id: "sales_tomek",
    name: "Tomek S.",
    role: "Sales",
    persona: "sales",
    tribe: "sales",
    reportsTo: "ceo_marek",
  },
  hr_magda: {
    id: "hr_magda",
    name: "Magda L.",
    role: "Support · People Ops",
    persona: "hr",
    tribe: "hr",
    reportsTo: "ceo_marek",
  },
  mkt_kasia: {
    id: "mkt_kasia",
    name: "Kasia M.",
    role: "Marketing",
    persona: "mkt",
    tribe: "marketing",
    reportsTo: "ceo_marek",
  },
  pm_radek: {
    id: "pm_radek",
    name: "Radek J.",
    role: "Product Manager",
    persona: "prod",
    tribe: "product",
    reportsTo: "ceo_marek",
  },
  dp_robert: {
    id: "dp_robert",
    name: "Robert P.",
    role: "Data Platform",
    persona: "dp",
    tribe: "data_platform",
    reportsTo: "ceo_marek",
  },
};

export const TRIBE_LABEL: Record<Tribe, string> = {
  growth: "Growth",
  data_platform: "Data Platform",
  sales: "Sales",
  finance: "Finance",
  exec: "Exec",
  hr: "People",
  marketing: "Marketing",
  product: "Product",
};
