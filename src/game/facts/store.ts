import type { SetFactEffect } from "./registry";
import {
  FACTS,
  type FactCondition,
  type FactKey,
  type FactValue,
  type FactValueOf,
} from "./registry";

export type SerializedFacts = Partial<Record<FactKey, FactValue>>;

export interface FactsStore {
  has(key: FactKey): boolean;
  get<K extends FactKey>(key: K): FactValueOf<K> | undefined;
  set<K extends FactKey>(key: K, value: FactValueOf<K>): void;
  apply(effect: SetFactEffect): void;
  restore(snapshot: SerializedFacts): void;
  snapshot(): SerializedFacts;
}

export function createFactsStore(initial?: SerializedFacts): FactsStore {
  const values = new Map<FactKey, FactValue>();
  for (const [key, value] of Object.entries(initial ?? {}) as [FactKey, FactValue][]) {
    values.set(key, value);
  }

  return {
    has: key => values.has(key),
    get: key => values.get(key) as FactValueOf<typeof key> | undefined,
    set: (key, value) => {
      if (FACTS[key].type === "boolean" && value === false) return;
      values.set(key, value);
    },
    apply: effect => {
      if (FACTS[effect.key].type === "boolean" && effect.value === false) return;
      values.set(effect.key, effect.value);
    },
    restore: snapshot => {
      values.clear();
      for (const [key, value] of Object.entries(snapshot) as [FactKey, FactValue][]) {
        values.set(key, value);
      }
    },
    snapshot: () => Object.fromEntries(values.entries()) as SerializedFacts,
  };
}

export function evaluateFactCondition(
  condition: FactCondition | undefined,
  facts: Pick<FactsStore, "get">,
): boolean {
  if (!condition) return true;
  if ("all" in condition) return condition.all.every(child => evaluateFactCondition(child, facts));
  if ("any" in condition) return condition.any.some(child => evaluateFactCondition(child, facts));
  if ("not" in condition) return !evaluateFactCondition(condition.not, facts);
  return facts.get(condition.key) === condition.equals;
}
