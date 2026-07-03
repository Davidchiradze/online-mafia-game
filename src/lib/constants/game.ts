export const GAME_TYPES = [
  "traditional",
  "city_mafia",
  "japanese_mafia",
] as const;

export const GAME_STATUSES = ["not_started", "playing", "finished"] as const;

export enum JOIN_REQUEST_STATUSES {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export const GAME_TYPE_LABEL: Record<(typeof GAME_TYPES)[number], string> = {
  traditional: "Traditional",
  city_mafia: "City mafia",
  japanese_mafia: "Japanese",
};

export const GAME_STATUS_LABEL: Record<(typeof GAME_STATUSES)[number], string> =
  {
    not_started: "Not started",
    playing: "Playing",
    finished: "Finished",
  };

export const GAME_TYPE_MAX_PLAYER_NUMBER: Record<
  (typeof GAME_TYPES)[number],
  number
> = {
  traditional: 10,
  city_mafia: 12,
  japanese_mafia: 12,
};

export const JAPANESE_MAFIA_ROLES = [
  "DON",
  "MAFIA",
  "MAFIA_RIGHT_HAND",
  "SHOGUN",
  "YAKUZA",
  "DETECTIVE",
  "CITIZEN",
  "DOCTOR",
] as const;

/** Mafia team roles - can see mafia target selection */
export const MAFIA_TEAM_ROLES = ["DON", "MAFIA_RIGHT_HAND", "MAFIA"] as const;

/** Yakuza team roles - can see yakuza target selection */
export const YAKUZA_TEAM_ROLES = ["YAKUZA", "SHOGUN"] as const;

export const JAPANESE_MAFIA_ROLE_LABEL: Record<
  (typeof JAPANESE_MAFIA_ROLES)[number],
  string
> = {
  DON: "Don",
  MAFIA: "Mafia",
  MAFIA_RIGHT_HAND: "Don's Right Hand",
  SHOGUN: "Shogun",
  YAKUZA: "Yakuza",
  DETECTIVE: "Detective",
  CITIZEN: "Citizen",
  DOCTOR: "Doctor",
};

export const GAME_PHASES = [
  "game_session_started",
  "picking_roles",
  "mafia_meet",
  "don_chooses_right_hand",
  "yakuda_shogun_meet",
  "detective_meet",
  "doctor_meet",
  "introduction_phase",
  "night_phase",
  "mafia_chooses_target",
  "don_checks_for_detective",
  "right_hand_checks_for_yakuza",
  "yakuza_and_shogun_chooses_target",
  "detective_checks_for_mafia",
  "doctor_heals_player",
  "farewell_speech",
  "day_phase",
  "nominated_players_speak",
  "voting",
  "repeat",
  "end_game",
] as const;

/** Human-readable labels for each game phase */
export const GAME_PHASE_LABELS: Record<(typeof GAME_PHASES)[number], string> = {
  game_session_started: "Game Started",
  picking_roles: "Picking Roles",
  mafia_meet: "Mafia Meeting",
  don_chooses_right_hand: "Don Chooses Right Hand",
  yakuda_shogun_meet: "Yakuza & Shogun Meeting",
  detective_meet: "Detective Meeting",
  doctor_meet: "Doctor Meeting",
  introduction_phase: "Introduction",
  night_phase: "Night Phase",
  mafia_chooses_target: "Mafia Chooses Target",
  don_checks_for_detective: "Don Checks for Detective",
  right_hand_checks_for_yakuza: "Right Hand Checks for Yakuza",
  yakuza_and_shogun_chooses_target: "Yakuza & Shogun Choose Target",
  detective_checks_for_mafia: "Detective Checks for Mafia",
  doctor_heals_player: "Doctor Heals",
  farewell_speech: "Farewell Speech",
  day_phase: "Day Phase",
  nominated_players_speak: "Self-Justification",
  voting: "Voting",
  repeat: "Next Round",
  end_game: "Game Over",
};

// Day Phase Speaking Constants
export const DAY_PHASE_SPEAKING = {
  /** Maximum speaking time per player in milliseconds (60 seconds) */
  MAX_SPEAKING_TIME_MS: 60 * 1000,
  /** Maximum speaking time per player in seconds */
  MAX_SPEAKING_TIME_SECONDS: 60,
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
    "introduction_phase",
    "farewell_speech",
    "day_phase",
    "nominated_players_speak",
    "voting",
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

// Game Cleanup Constants
export const GAME_CLEANUP = {
  /**
   * Delay before deleting a finished game and its relations.
   * MUST match `GAME_CLEANUP.DELAY_MS` in `convex/lib/constants.ts` — this
   * client copy drives the "room closes in Ns" countdown in the winner banner.
   */
  DELAY_MS: 90_000,
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
  mafia_meet: 40 * 1000,
  don_chooses_right_hand: 20 * 1000,
  yakuda_shogun_meet: 40 * 1000,
  detective_meet: 15 * 1000,
  doctor_meet: 15 * 1000,
  mafia_chooses_target: 20 * 1000,
  don_checks_for_detective: 15 * 1000,
  right_hand_checks_for_yakuza: 15 * 1000,
  yakuza_and_shogun_chooses_target: 20 * 1000,
  detective_checks_for_mafia: 15 * 1000,
  doctor_heals_player: 15 * 1000,
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
