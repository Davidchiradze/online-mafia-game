/**
 * The Serial Killer Mafia game definition
 * (docs/variants/serial_killer/rules.md).
 *
 * An 11-seat variant shaped like Japanese, with the Yakuza clan replaced by a
 * faction of exactly one player who is hostile to both other sides. Two rules
 * make it more than a re-skin: the mafia's kill is live on night 1 (the
 * inversion of Japanese), and the Serial Killer holds a single shot for the
 * whole game.
 *
 * UNRATED by decision, not by omission (docs/variants/serial_killer/rating.md):
 * there is no `RATING_CONFIG` entry, so `archiveGameLog` skips ELO entirely.
 */

import type { Faction, GameDefinition } from "../core/types";
import {
  SERIAL_KILLER_ROLES,
  SERIAL_KILLER_ROLE_DISTRIBUTION,
  SERIAL_KILLER_MAFIA_TEAM_ROLES,
  serialKillerRoleToFaction,
} from "./roles";
import {
  decideSerialKillerWinner,
  describeSerialKillerWin,
} from "./winConditions";
import { SERIAL_KILLER_NIGHT_MODEL } from "./nightModel";
import { SERIAL_KILLER_PHASES, serialKillerNextPhase } from "./phases";

const SERIAL_KILLER_FACTIONS: readonly Faction[] = [
  "mafia",
  "serial_killer",
  "citizens",
];

export const SERIAL_KILLER_DEFINITION: GameDefinition = {
  id: "serial_killer_mafia",
  seatCount: 11,

  roles: SERIAL_KILLER_ROLES,
  roleDistribution: SERIAL_KILLER_ROLE_DISTRIBUTION,
  factions: SERIAL_KILLER_FACTIONS,
  roleToFaction: serialKillerRoleToFaction,
  // No serial-killer entry: a faction of one has no teammates to reveal, and
  // `getVisible` reads this to answer that question.
  teams: {
    mafia: SERIAL_KILLER_MAFIA_TEAM_ROLES,
  },

  phases: SERIAL_KILLER_PHASES,
  nextPhase: serialKillerNextPhase,

  night: SERIAL_KILLER_NIGHT_MODEL,

  decideWinner: decideSerialKillerWinner,
  describeWin: describeSerialKillerWin,

  // Every flag explicit — one left off is a silent behaviour choice.
  flags: {
    hasIntroductionPhase: true,
    hasFarewellSpeech: true,
    // All three are Sports mechanics; none was requested here
    // (docs/variants/serial_killer/rules.md §6).
    firstDaySingleNomineeSkipsToNight: false,
    thirdFoulSpeakingBan: false,
    hasBestMove: false,
    // The inversion of Japanese: the mafia's night-1 kill is live
    // (docs/variants/serial_killer/rules.md §5.2). The Serial Killer's is not,
    // which is a night-phase guard rather than a flag.
    mafiaKillsOnFirstNight: true,
  },
};
