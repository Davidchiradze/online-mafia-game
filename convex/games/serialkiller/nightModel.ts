/**
 * Serial Killer Mafia night model — `single-authority`
 * (docs/variants/serial_killer/rules.md §4).
 *
 * Structurally Japanese's: one kill authority per hostile side picks one target,
 * the Doctor can save one, and both kills can land. `serialKillerTarget` simply
 * occupies the slot `yakuzaTarget` holds there.
 *
 * Two properties the resolution inherits and both are wanted:
 *
 * - **The Doctor's save suppresses either kill.** A saved Serial Killer target
 *   dies to nobody — but the shot still counts as SPENT, because "already fired"
 *   is derived from the recorded target, not from the resulting death
 *   (`isSerialKillerShotSpent`). The bullet left the gun.
 * - **Both sides picking the same seat kills them once.** The dedupe is why the
 *   mafia and the Serial Killer converging on one player is not two deaths.
 */

import type { NightModel } from "../core/types";

export const SERIAL_KILLER_NIGHT_MODEL: NightModel = {
  kind: "single-authority",
  actingRoles: [
    "DON",
    "MAFIA",
    "SERIAL_KILLER",
    "DETECTIVE",
    "DOCTOR",
  ],
  resolveKills({ mafiaTarget, serialKillerTarget, healedPlayer }) {
    const killed: number[] = [];
    if (mafiaTarget !== undefined && mafiaTarget !== healedPlayer) {
      killed.push(mafiaTarget);
    }
    if (
      serialKillerTarget !== undefined &&
      serialKillerTarget !== healedPlayer &&
      !killed.includes(serialKillerTarget)
    ) {
      killed.push(serialKillerTarget);
    }
    return killed;
  },
};
