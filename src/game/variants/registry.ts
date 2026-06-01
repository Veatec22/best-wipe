import type { FactCondition } from "../facts";

export const VARIANTS = {
  poll_product_green: {
    activeWhen: { key: "poll_winner_product_id", equals: "green" },
  },
  poll_product_red: {
    activeWhen: { key: "poll_winner_product_id", equals: "red" },
  },
} as const satisfies Record<string, { activeWhen: FactCondition }>;

export type VariantKey = keyof typeof VARIANTS;
