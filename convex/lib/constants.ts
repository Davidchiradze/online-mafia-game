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

export const JAPANESE_MAFIA_ROLE_DISTRIBUTION = [
  "DON",
  "MAFIA",
  "MAFIA_RIGHT_HAND",
  "SHOGUN",
  "YAKUZA",
  "DETECTIVE",
  "DOCTOR",
  "CITIZEN",
  "CITIZEN",
  "CITIZEN",
  "CITIZEN",
  "CITIZEN",
] as const;

export const MAFIA_TEAM_ROLES = ["DON", "MAFIA_RIGHT_HAND", "MAFIA"] as const;
export const YAKUZA_TEAM_ROLES = ["YAKUZA", "SHOGUN"] as const;

export const VOTING = {
  VOTE_WINDOW_MS: 3 * 1000,
  BOTH_LEAVE_THRESHOLD: 0.5,
} as const;

export const SPECTATOR = {
  MAX_SPECTATORS_PER_GAME: 7,
} as const;
