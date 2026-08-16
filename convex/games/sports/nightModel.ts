/**
 * Sports Mafia night model — `unanimous-vote` (docs/variants/sports/rules.md §5).
 *
 * Every living mafia privately picks one target within a 5s window. A kill
 * happens iff EVERY living mafia submitted a selection AND all chose the same
 * target. There is no Doctor, so nothing saves the target. A lone mafia may
 * abstain (→ no kill); if the lone mafia selects, that is trivially unanimous.
 *
 * `resolveKills` is pure. It reads `state.mafiaTargetSelections` (per-mafia
 * picks recorded during the window) and `context.livingMafiaSeats` (the roster
 * fact it can't derive itself), deduping to one target per mafia seat (last
 * write wins) and restricting to living-mafia seats.
 *
 * Phase-2 note: this is the pure resolution only. The DB fields
 * (`mafiaTargetSelections`, the 5s window scheduler) and the per-mafia
 * selection mutation are wired in Phase 3; `startFarewellSpeech` will pass
 * `livingMafiaSeats` at dawn.
 */

import type { NightModel } from "../core/types";

export const SPORTS_NIGHT_MODEL: NightModel = {
  kind: "unanimous-vote",
  actingRoles: ["DON", "MAFIA", "DETECTIVE"],
  resolveKills(state, context) {
    const livingMafiaSeats = context?.livingMafiaSeats ?? [];
    if (livingMafiaSeats.length === 0) return [];

    // One target per living-mafia seat (last write wins).
    const byMafiaSeat = new Map<number, number>();
    for (const sel of state.mafiaTargetSelections ?? []) {
      if (livingMafiaSeats.includes(sel.mafiaSeat)) {
        byMafiaSeat.set(sel.mafiaSeat, sel.targetSeat);
      }
    }

    // Every living mafia must have selected, and all on the same target.
    if (byMafiaSeat.size !== livingMafiaSeats.length) return [];
    const targets = new Set(byMafiaSeat.values());
    if (targets.size !== 1) return [];
    return [[...targets][0]];
  },
};
