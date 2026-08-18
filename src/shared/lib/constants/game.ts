import { GamePhase } from "@convex/lib/constants";

/**
 * Phase names come from the backend enum and are re-exported here so frontend
 * code keeps importing them from this module. `convex/` may never import from
 * `src/`, so the shared vocabulary has to be declared on that side — this is a
 * pass-through, NOT a second copy.
 */
export { GamePhase };

export const GAME_TYPES = [
  "sports_mafia",
  "city_mafia",
  "japanese_mafia",
  "serial_killer_mafia",
] as const;

export const GAME_STATUSES = ["not_started", "playing", "finished"] as const;

export enum JOIN_REQUEST_STATUSES {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export const GAME_TYPE_LABEL: Record<(typeof GAME_TYPES)[number], string> = {
  sports_mafia: "Sports Mafia",
  city_mafia: "City mafia",
  japanese_mafia: "Japanese",
  serial_killer_mafia: "Serial Killer",
};

export const GAME_STATUS_LABEL: Record<(typeof GAME_STATUSES)[number], string> =
  {
    not_started: "Not started",
    playing: "Playing",
    finished: "Finished",
  };

export const JAPANESE_MAFIA_ROLES = [
  "DON",
  "MAFIA",
  "SHOGUN",
  "YAKUZA",
  "DETECTIVE",
  "CITIZEN",
  "DOCTOR",
] as const;

/**
 * Every role ANY variant can deal — the frontend's role vocabulary.
 *
 * `Role` in `src/shared/lib/game/visibility.ts` is built from this, so a role
 * missing here is not assignable and gets cast away at the boundary instead of
 * type-checked. It was the JAPANESE tuple, which happened to work only because
 * Sports' deck is a strict subset of Japanese's.
 *
 * Not derivable from the registry: that yields runtime values, and this has to
 * be a literal-typed tuple. Composed from the Japanese tuple plus each later
 * variant's additions so the shared roles still have exactly one definition.
 */
export const ALL_ROLES = [...JAPANESE_MAFIA_ROLES, "SERIAL_KILLER"] as const;

/** Mafia team roles - can see mafia target selection */
export const MAFIA_TEAM_ROLES = ["DON", "MAFIA"] as const;

/** Yakuza team roles - can see yakuza target selection */
export const YAKUZA_TEAM_ROLES = ["YAKUZA", "SHOGUN"] as const;

export const JAPANESE_MAFIA_ROLE_LABEL: Record<
  (typeof JAPANESE_MAFIA_ROLES)[number],
  string
> = {
  DON: "Don",
  MAFIA: "Mafia",
  SHOGUN: "Shogun",
  YAKUZA: "Yakuza",
  DETECTIVE: "Detective",
  CITIZEN: "Citizen",
  DOCTOR: "Doctor",
};

/**
 * Every phase the APP knows, in reading order — the Japanese list plus the
 * Sports-only phases the backend `GAME_PHASES` omits.
 *
 * Built from `GamePhase` so the names have exactly one definition; this array
 * only decides ORDER and membership. Nothing reads it positionally, so a phase
 * may be inserted in reading order rather than appended.
 */
export const GAME_PHASES = [
  GamePhase.GAME_SESSION_STARTED,
  GamePhase.PICKING_ROLES,
  GamePhase.MAFIA_MEET,
  GamePhase.DON_MEET,
  GamePhase.YAKUDA_SHOGUN_MEET,
  GamePhase.DETECTIVE_MEET,
  GamePhase.DOCTOR_MEET,
  GamePhase.INTRODUCTION_PHASE,
  GamePhase.NIGHT_PHASE,
  GamePhase.MAFIA_CHOOSES_TARGET,
  GamePhase.DON_CHECKS_FOR_DETECTIVE,
  GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
  GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  GamePhase.DOCTOR_HEALS_PLAYER,
  GamePhase.FAREWELL_SPEECH,
  GamePhase.DAY_PHASE,
  GamePhase.NOMINATED_PLAYERS_SPEAK,
  GamePhase.VOTING,
  GamePhase.REPEAT,
  GamePhase.END_GAME,
  GamePhase.PHASE_TRANSITION,
  GamePhase.BEST_MOVE,
  // Appended, not inserted in reading order: `tests/game/phases.test.ts` pins
  // the first 20 entries against the backend list, so a variant-only phase must
  // land past that prefix.
  GamePhase.SERIAL_KILLER_MEET,
  GamePhase.SERIAL_KILLER_CHOOSES_TARGET,
] as const;

/** Human-readable labels for each game phase */
export const GAME_PHASE_LABELS: Record<GamePhase, string> = {
  [GamePhase.GAME_SESSION_STARTED]: "Game Started",
  [GamePhase.PICKING_ROLES]: "Picking Roles",
  [GamePhase.MAFIA_MEET]: "Mafia Meeting",
  [GamePhase.YAKUDA_SHOGUN_MEET]: "Yakuza & Shogun Meeting",
  [GamePhase.DETECTIVE_MEET]: "Detective Meeting",
  [GamePhase.DOCTOR_MEET]: "Doctor Meeting",
  [GamePhase.INTRODUCTION_PHASE]: "Introduction",
  [GamePhase.NIGHT_PHASE]: "Night Phase",
  [GamePhase.MAFIA_CHOOSES_TARGET]: "Mafia Chooses Target",
  [GamePhase.DON_CHECKS_FOR_DETECTIVE]: "Don Checks for Detective",
  [GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET]: "Yakuza & Shogun Choose Target",
  [GamePhase.DETECTIVE_CHECKS_FOR_MAFIA]: "Detective Checks for Mafia",
  [GamePhase.DOCTOR_HEALS_PLAYER]: "Doctor Heals",
  [GamePhase.FAREWELL_SPEECH]: "Farewell Speech",
  [GamePhase.DAY_PHASE]: "Day Phase",
  [GamePhase.NOMINATED_PLAYERS_SPEAK]: "Self-Justification",
  [GamePhase.VOTING]: "Voting",
  [GamePhase.REPEAT]: "Next Round",
  [GamePhase.END_GAME]: "Game Over",
  [GamePhase.PHASE_TRANSITION]: "Everyone Asleep",
  [GamePhase.DON_MEET]: "Don Meeting",
  [GamePhase.BEST_MOVE]: "Best Move",
  [GamePhase.SERIAL_KILLER_MEET]: "Serial Killer Meeting",
  [GamePhase.SERIAL_KILLER_CHOOSES_TARGET]: "Serial Killer Chooses Target",
};

// Day Phase Speaking Constants
export const DAY_PHASE_SPEAKING = {
  /** Maximum speaking time per player in milliseconds (60 seconds) */
  MAX_SPEAKING_TIME_MS: 60 * 1000,
  /** Maximum speaking time per player in seconds */
  MAX_SPEAKING_TIME_SECONDS: 60,
  /**
   * Sports final-day carve-out (docs/variants/sports/rules.md §4.2): on the last day
   * phase (≤ 4 alive) a 3rd-foul-banned player still speaks, but for 30 seconds
   * instead of 60. See `hasShortenedFinalDaySpeech` in `lib/game/speakingBan`.
   */
  FINAL_DAY_BANNED_TIME_MS: 30 * 1000,
  /** Same, in seconds. */
  FINAL_DAY_BANNED_TIME_SECONDS: 30,
} as const;

/**
 * Speaking State Markers for current_speaker_index
 *
 * - null → not started
 * - positive seat (1-12) → in progress (speaker unmuted)
 * - negative seat (-1 to -12) → paused, last speaker was abs(value)
 * - COMPLETED (-99) → speaking round completed
 */
export const SPEAKING_STATE = {
  /** Marker value indicating speaking round is completed */
  COMPLETED: -99,
  /** Check if a value represents a paused state (negative seat number, not COMPLETED) */
  isPaused: (value: number | null): boolean =>
    value !== null && value < 0 && value !== -99,
  /** Check if a value represents an active speaker */
  isActive: (value: number | null): boolean => value !== null && value >= 1,
  /** Check if a value represents completed state */
  isCompleted: (value: number | null): boolean => value === -99,
  /** Get the last speaker seat from a paused state value */
  getLastSpeakerFromPaused: (value: number): number => Math.abs(value),
  /** Convert a seat number to paused state value */
  toPausedValue: (seatNumber: number): number => -seatNumber,
} as const;

// Nominated Players Speaking Constants (Self-justification phase)
export const NOMINATED_PLAYERS_SPEAKING = {
  /** Maximum speaking time per nominated player in milliseconds (30 seconds) */
  MAX_SPEAKING_TIME_MS: 30 * 1000,
  /** Maximum speaking time per nominated player in seconds */
  MAX_SPEAKING_TIME_SECONDS: 30,
} as const;

// Foul Constants
export const FOULS = {
  /** Maximum fouls before warning (3 fouls shows warning, 4th eliminates) */
  MAX_FOULS: 3,
  /** Foul count that triggers elimination (4th foul eliminates player) */
  ELIMINATION_THRESHOLD: 4,
  /** Duration in milliseconds for foul speaking (5 seconds) */
  FOUL_SPEAK_DURATION_MS: 5 * 1000,
  /** Duration in seconds for foul speaking */
  FOUL_SPEAK_DURATION_SECONDS: 5,
  /** Phases where fouls can be given and foul speaking is allowed */
  ALLOWED_PHASES: [
    GamePhase.INTRODUCTION_PHASE,
    GamePhase.FAREWELL_SPEECH,
    GamePhase.DAY_PHASE,
    GamePhase.NOMINATED_PLAYERS_SPEAK,
    GamePhase.VOTING,
  ] as const,
} as const;

// Farewell Speech Constants (for players killed at night)
export const FAREWELL_SPEECH = {
  /** Maximum speaking time for farewell speech in milliseconds (60 seconds) */
  MAX_SPEAKING_TIME_MS: 60 * 1000,
  /** Maximum speaking time in seconds */
  MAX_SPEAKING_TIME_SECONDS: 60,
} as const;

// Voting Phase Constants
export const VOTING = {
  /** Duration of voting window in milliseconds (5 seconds) */
  VOTE_WINDOW_MS: 3 * 1000,
  /** Duration of voting window in seconds */
  VOTE_WINDOW_SECONDS: 3,
  /** Tie-break self-justification time in milliseconds (30 seconds) */
  TIE_BREAK_SPEAKING_TIME_MS: 30 * 1000,
  /** Tie-break self-justification time in seconds */
  TIE_BREAK_SPEAKING_TIME_SECONDS: 30,
  /** Minimum percentage for "both leave" vote to pass (>50%) */
  BOTH_LEAVE_THRESHOLD: 0.5,
} as const;

/**
 * Per-phase decision countdown durations (milliseconds).
 *
 * Visual-only pressure indicator: when the timer hits 0 nothing auto-advances —
 * the host still clicks the phase's End button. Shown only to the acting role(s)
 * for that phase (see `getAwakeRoles` in `src/lib/game/visibility.ts`) plus the
 * host; never to spectators.
 *
 * Speaking/voting phases are intentionally omitted — they already have their
 * own per-speaker timers (`useSpeakingProgress`, voting timer).
 */
export const PHASE_TIMERS: Partial<
  Record<(typeof GAME_PHASES)[number], number>
> = {
  [GamePhase.MAFIA_MEET]: 60 * 1000,
  [GamePhase.YAKUDA_SHOGUN_MEET]: 40 * 1000,
  [GamePhase.DETECTIVE_MEET]: 15 * 1000,
  [GamePhase.DOCTOR_MEET]: 15 * 1000,
  [GamePhase.MAFIA_CHOOSES_TARGET]: 20 * 1000,
  [GamePhase.DON_CHECKS_FOR_DETECTIVE]: 15 * 1000,
  [GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET]: 20 * 1000,
  [GamePhase.DETECTIVE_CHECKS_FOR_MAFIA]: 15 * 1000,
  [GamePhase.DOCTOR_HEALS_PLAYER]: 15 * 1000,
  // Sports best move (§6.3): shown to all living players + the host, since the
  // whole table watches the victim's clock. Visual only — the host advances.
  [GamePhase.BEST_MOVE]: 30 * 1000,
} as const;

// Sports Mafia night constants (mirrors convex/lib/constants.ts SPORTS).
export const SPORTS = {
  /** Duration of the host-opened mafia kill-selection window (§5.3). */
  MAFIA_TARGET_WINDOW_MS: 5 * 1000,
  /** Same, in whole seconds. */
  MAFIA_TARGET_WINDOW_SECONDS: 5,
  /** Best move (§6): the first-night victim names exactly this many suspects. */
  BEST_MOVE_SUSPECT_COUNT: 3,
  /** Visual-only best-move countdown (§6.3) — nothing auto-advances at 0. */
  BEST_MOVE_WINDOW_MS: 30 * 1000,
  /** Same, in whole seconds. */
  BEST_MOVE_WINDOW_SECONDS: 30,
} as const;

// Card-picking phase constants
export const CARD_PICK = {
  /** Per-pick timeout in milliseconds (15 seconds) */
  TIMEOUT_MS: 15 * 1000,
  /** Per-pick timeout in seconds */
  TIMEOUT_SECONDS: 15,
} as const;

// Spectator Constants
export const SPECTATOR = {
  /** Maximum number of spectators allowed per game */
  MAX_SPECTATORS_PER_GAME: 7,
} as const;
