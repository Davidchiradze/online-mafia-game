/**
 * The Japanese frontend UI ruleset — the UI-side counterpart to
 * `convex/games/japanese/definition.ts`. Assembles the pieces the shared UI
 * consults (visibility + host-advance flow) into one object resolved by the
 * registry (docs/game-types.md §2.2).
 */

import type { UiRuleset } from "@/features/game-room/variants/core/types";
import { JAPANESE_VISIBILITY } from "./visibility";
import { advanceUpdates } from "./phaseFlow";
import { JAPANESE_PHASE_CONTROLS } from "./phaseControls";
import { japaneseNightAuthority } from "./nightAuthority";
import { JAPANESE_SEAT_LAYOUT } from "./seatLayout";
import JapaneseNightActionsDisplay from "./nightActionsDisplay";

export const JAPANESE_UI_RULESET: UiRuleset = {
  visibility: JAPANESE_VISIBILITY,
  advanceUpdates,
  phaseControls: JAPANESE_PHASE_CONTROLS,
  nightActionsDisplay: JapaneseNightActionsDisplay,
  nightAuthority: japaneseNightAuthority,
  seatLayout: JAPANESE_SEAT_LAYOUT,
  mafiaNightModel: "single-authority",
  hasSelfJustification: true,
};
