import { evaluateFactCondition, type FactsStore } from "../facts";
import { VARIANTS, type VariantKey } from "./registry";

export function activeVariantKeys(facts: Pick<FactsStore, "get">): ReadonlySet<VariantKey> {
  const keys: VariantKey[] = [];
  for (const [key, variant] of Object.entries(VARIANTS) as [
    VariantKey,
    (typeof VARIANTS)[VariantKey],
  ][]) {
    if (evaluateFactCondition(variant.activeWhen, facts)) keys.push(key);
  }
  return new Set(keys);
}
