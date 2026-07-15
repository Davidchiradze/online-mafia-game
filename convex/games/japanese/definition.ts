/**
 * The Japanese Mafia game definition (docs/game-types.md §2.1).
 *
 * Phase-1 note: this ASSEMBLES the definition from the current module
 * locations (`convex/lib/*`) rather than owning copies. It introduces the
 * abstraction with zero behavior change and zero `api.*` churn. The physical
 * move of these modules into `convex/games/japanese/*` (P1-T2/T3/T7) is a
 * separate, mechanical step; when it happens, only the import paths below
 * change — never the values (guarded by tests/game/gameDefinition.test.ts).
 */

import {
  GAME_PHASES,
  JAPANESE_MAFIA_ROLE_DISTRIBUTION,
  MAFIA_TEAM_ROLES,
  YAKUZA_TEAM_ROLES,
} from "../../lib/constants";
import { roleToFaction } from "../../lib/roles";
import { decideWinner } from "../../lib/winConditions";
import type { Faction, GameDefinition, Role } from "../core/types";
import { JAPANESE_NIGHT_MODEL } from "./nightModel";
import { japaneseNextPhase } from "./phases";

/**
 * Every role Japanese can assign (mirrors `JAPANESE_MAFIA_ROLES` in
 * `src/lib/constants/game.ts`, pinned by tests/game/phases.test.ts).
 * MAFIA_RIGHT_HAND is included though it is not in the initial deck — it is
 * promoted in-game during `don_chooses_right_hand`.
 */
const JAPANESE_ROLES: readonly Role[] = [
  "DON",
  "MAFIA",
  "MAFIA_RIGHT_HAND",
  "SHOGUN",
  "YAKUZA",
  "DETECTIVE",
  "CITIZEN",
  "DOCTOR",
];

const JAPANESE_FACTIONS: readonly Faction[] = ["mafia", "yakuza", "citizens"];

export const JAPANESE_DEFINITION: GameDefinition = {
  id: "japanese_mafia",
  seatCount: 12,

  roles: JAPANESE_ROLES,
  roleDistribution: JAPANESE_MAFIA_ROLE_DISTRIBUTION,
  factions: JAPANESE_FACTIONS,
  roleToFaction,
  teams: {
    mafia: MAFIA_TEAM_ROLES,
    yakuza: YAKUZA_TEAM_ROLES,
  },

  phases: GAME_PHASES,
  nextPhase: japaneseNextPhase,

  night: JAPANESE_NIGHT_MODEL,

  decideWinner,

  flags: {
    hasIntroductionPhase: true,
    hasFarewellSpeech: true,
    hasRightHandPromotion: true,
    firstDaySingleNomineeSkipsToNight: false,
    thirdFoulSpeakingBan: false,
  },
};
