import { create } from "zustand";
import type { PersonId } from "../data/people";
import { type ScoringEvent, type Stats, ZERO_STATS } from "../game/scoring/scoringTypes";

/**
 * Persistent store of run-wide hidden stats.
 *
 * Design notes:
 *  - `stats` is the global aggregate; `reputationByPerson` lets validators
 *    later condition on relationship with a specific NPC ("CEO trust low →
 *    different reaction to the same answer").
 *  - `events` is capped (`MAX_EVENTS`) so the localStorage payload stays
 *    bounded over a 30-day run. The full ledger will move to Dexie later.
 *  - Persistence key is versioned; bump it if the shape changes.
 */
const MAX_EVENTS = 50;

interface ScoringState {
  stats: Stats;
  reputationByPerson: Partial<Record<PersonId, number>>;
  events: ScoringEvent[];
  apply(event: ScoringEvent): void;
  replace(input: {
    stats: Stats;
    reputationByPerson: Partial<Record<PersonId, number>>;
    events: ScoringEvent[];
  }): void;
  reset(): void;
}

export const useScoringStore = create<ScoringState>(set => ({
  stats: { ...ZERO_STATS },
  reputationByPerson: {},
  events: [],
  apply: event =>
    set(state => {
      const stats: Stats = {
        accuracy: round1(state.stats.accuracy + event.accuracy),
        speed: round1(state.stats.speed + event.speed),
        reputation: round1(state.stats.reputation + event.reputationGlobal),
      };
      const prevPersonRep = state.reputationByPerson[event.reputationPersonId] ?? 0;
      const reputationByPerson = {
        ...state.reputationByPerson,
        [event.reputationPersonId]: round1(prevPersonRep + event.reputationPerson),
      };
      const events = [event, ...state.events].slice(0, MAX_EVENTS);
      return { stats, reputationByPerson, events };
    }),
  replace: input => set(input),
  reset: () => set({ stats: { ...ZERO_STATS }, reputationByPerson: {}, events: [] }),
}));

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
