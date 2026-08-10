/**
 * The Sports Mafia game definition (docs/variants/sports.md).
 *
 * Phase 2 authors this as pure DATA — roles, deck, factions, phase graph, the
 * parity `decideWinner`, the unanimous-vote night model, and flags. Nothing is
 * wired to the UI yet; Sports stays non-creatable (filtered in CreateGameModal)
 * until Phase 5. The DB/UI wiring for the night model + new day-phase mechanics
 * lands in Phases 3–4.
 */

import type { Faction, GameDefinition } from "../core/types";
import {
  SPORTS_MAFIA_ROLES,
  SPORTS_MAFIA_ROLE_DISTRIBUTION,
  SPORTS_MAFIA_TEAM_ROLES,
  sportsRoleToFaction,
} from "./roles";
import { SPORTS_PHASES, sportsNextPhase } from "./phases";
import { decideSportsWinner, describeSportsWin } from "./winConditions";
import { SPORTS_NIGHT_MODEL } from "./nightModel";

const SPORTS_FACTIONS: readonly Faction[] = ["mafia", "citizens"];

export const SPORTS_DEFINITION: GameDefinition = {
  id: "sports_mafia",
  seatCount: 10,

  roles: SPORTS_MAFIA_ROLES,
  roleDistribution: SPORTS_MAFIA_ROLE_DISTRIBUTION,
  factions: SPORTS_FACTIONS,
  roleToFaction: sportsRoleToFaction,
  teams: {
    mafia: SPORTS_MAFIA_TEAM_ROLES,
  },

  phases: SPORTS_PHASES,
  nextPhase: sportsNextPhase,

  night: SPORTS_NIGHT_MODEL,

  decideWinner: decideSportsWinner,
  describeWin: describeSportsWin,

  flags: {
    hasIntroductionPhase: false,
    hasFarewellSpeech: true,
    hasRightHandPromotion: false,
    firstDaySingleNomineeSkipsToNight: true,
    thirdFoulSpeakingBan: true,
    hasBestMove: true,
  },
};
