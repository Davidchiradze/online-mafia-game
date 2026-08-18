/**
 * The Serial Killer frontend UI ruleset — the UI-side counterpart to
 * `convex/games/serialkiller/definition.ts`
 * (docs/engine/variant-architecture.md §2.2).
 *
 * Directory name matches the backend's, which Convex forces to be hyphen-free,
 * so both halves of the variant live under one spelling.
 */

import type { UiRuleset } from "@/features/game-room/variants/core/types";
import { SERIAL_KILLER_VISIBILITY } from "./visibility";
import { serialKillerAdvanceUpdates } from "./phaseFlow";
import { SERIAL_KILLER_PHASE_CONTROLS } from "./phaseControls";
import { serialKillerNightAuthority } from "./nightAuthority";
import { SERIAL_KILLER_SEAT_LAYOUT } from "./seatLayout";
import { useSerialKillerNightSummary } from "./nightSummary";

export const SERIAL_KILLER_UI_RULESET: UiRuleset = {
  visibility: SERIAL_KILLER_VISIBILITY,
  advanceUpdates: serialKillerAdvanceUpdates,
  phaseControls: SERIAL_KILLER_PHASE_CONTROLS,
  useNightSummary: useSerialKillerNightSummary,
  nightAuthority: serialKillerNightAuthority,
  seatLayout: SERIAL_KILLER_SEAT_LAYOUT,
  // Japanese's night model: one picker per killing side, one shared target.
  mafiaNightModel: "single-authority",
  hasSelfJustification: true,
};
