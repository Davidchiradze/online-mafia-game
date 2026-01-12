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
  "day_phase",
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
