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
  japanese_mafia: "Japanese mafia",
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
  /** Maximum number of fouls a player can receive */
  MAX_FOULS: 3,
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
  VOTE_WINDOW_MS: 5 * 1000,
  /** Duration of voting window in seconds */
  VOTE_WINDOW_SECONDS: 5,
  /** Tie-break self-justification time in milliseconds (30 seconds) */
  TIE_BREAK_SPEAKING_TIME_MS: 30 * 1000,
  /** Tie-break self-justification time in seconds */
  TIE_BREAK_SPEAKING_TIME_SECONDS: 30,
  /** Minimum percentage for "both leave" vote to pass (>50%) */
  BOTH_LEAVE_THRESHOLD: 0.5,
} as const;
