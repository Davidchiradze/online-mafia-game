/**
 * The Japanese frontend UI ruleset — the UI-side counterpart to
 * `convex/games/japanese/definition.ts`. Assembles the pieces the shared UI
 * consults (visibility + host-advance flow) into one object resolved by the
 * registry (docs/game-types.md §2.2).
 */

import type { UiRuleset } from "../core/types";
import { JAPANESE_VISIBILITY } from "./visibility";
import { advanceUpdates } from "./phaseFlow";

export const JAPANESE_UI_RULESET: UiRuleset = {
  visibility: JAPANESE_VISIBILITY,
  advanceUpdates,
};
