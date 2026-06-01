import { create } from "zustand";
import type { CampaignEffect } from "../game/campaign/types";
import {
  createFactsStore,
  type FactKey,
  type FactValueOf,
  type SerializedFacts,
} from "../game/facts";

interface FactsState {
  values: SerializedFacts;
  get<K extends FactKey>(key: K): FactValueOf<K> | undefined;
  applyCampaignEffects(effects: readonly CampaignEffect[]): void;
  replace(values: SerializedFacts): void;
  reset(): void;
}

export const useFactsStore = create<FactsState>((set, get) => ({
  values: {},
  get: key => get().values[key] as FactValueOf<typeof key> | undefined,
  applyCampaignEffects: effects =>
    set(state => {
      const factEffects = effects.filter(effect => effect.type === "set_fact");
      if (factEffects.length === 0) return state;
      const facts = createFactsStore(state.values);
      for (const effect of factEffects) facts.apply(effect);
      return { values: facts.snapshot() };
    }),
  replace: values => set({ values }),
  reset: () => set({ values: {} }),
}));
