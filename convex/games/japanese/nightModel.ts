/**
 * Japanese night model — `single-authority` (docs/engine/variant-architecture.md §2.3).
 *
 * One kill authority per team picks one target; the Doctor can save one; the
 * two teams can each kill. State is the scalar `mafiaTarget` / `yakuzaTarget` /
 * `healedPlayer` on the night session.
 *
 * `resolveKills` reproduces, VERBATIM, the kill computation currently inlined in
 * `convex/game/farewellSpeech.ts` → `startFarewellSpeech` (mafia first, then a
 * distinct yakuza target, each suppressed if it equals the healed seat). It is
 * pinned by `tests/game/gameDefinition.test.ts` against the same cases the
 * convex-test kill-resolution suite asserts. When `startFarewellSpeech` is
 * rewired to call this (later in Phase 1), the behavior must stay identical.
 */

import type { NightModel } from "../core/types";

export const JAPANESE_NIGHT_MODEL: NightModel = {
  kind: "single-authority",
  actingRoles: [
    "DON",
    "MAFIA_RIGHT_HAND",
    "MAFIA",
    "SHOGUN",
    "YAKUZA",
    "DETECTIVE",
    "DOCTOR",
  ],
  resolveKills({ mafiaTarget, yakuzaTarget, healedPlayer }) {
    const killed: number[] = [];
    if (mafiaTarget !== undefined && mafiaTarget !== healedPlayer) {
      killed.push(mafiaTarget);
    }
    if (
      yakuzaTarget !== undefined &&
      yakuzaTarget !== healedPlayer &&
      !killed.includes(yakuzaTarget)
    ) {
      killed.push(yakuzaTarget);
    }
    return killed;
  },
};
