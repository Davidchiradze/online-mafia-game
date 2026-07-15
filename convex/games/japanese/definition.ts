/**
 * The Japanese Mafia game definition (docs/game-types.md §2.1).
 *
 * This assembles the definition from the variant's own modules where they have
 * been relocated (`./winConditions`, `./nightModel`, `./phases`) and from the
 * still-shared `convex/lib/*` for the pieces not yet moved (constants deck,
 * `roleToFaction`). Each relocation is a pure move: only the import paths change,
 * never the values (guarded by tests/game/gameDefinition.test.ts and the
 * winConditions oracle). The remaining lib-owned pieces (roles, constants) are a
 * separate mechanical step (P1-T2/T3).
 */

import {
  GAME_PHASES,
  JAPANESE_MAFIA_ROLE_DISTRIBUTION,
  MAFIA_TEAM_ROLES,
  YAKUZA_TEAM_ROLES,
} from "../../lib/constants";
import { roleToFaction } from "../../lib/roles";
import type { Faction, GameDefinition, Role } from "../core/types";
import { decideWinner, describeWin } from "./winConditions";
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
  describeWin,

  flags: {
    hasIntroductionPhase: true,
    hasFarewellSpeech: true,
    hasRightHandPromotion: true,
    firstDaySingleNomineeSkipsToNight: false,
    thirdFoulSpeakingBan: false,
  },
};
