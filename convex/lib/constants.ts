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

/**
 * Initial card-pick deck for a 12-player Japanese Mafia game.
 *
 * Note: MAFIA_RIGHT_HAND is intentionally absent from the initial deck.
 * Two MAFIA cards are dealt, and during the `don_chooses_right_hand` phase
 * the Don promotes one of the MAFIA players to MAFIA_RIGHT_HAND.
 */
export const JAPANESE_MAFIA_ROLE_DISTRIBUTION = [
  "DON",
  "MAFIA",
  "MAFIA",
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
  MAX_SPECTATORS_PER_GAME: 0,
} as const;

export const SPEAKING_STATE = {
  COMPLETED: -99,
  isPaused: (value: number | null): boolean =>
    value !== null && value < 0 && value !== -99,
  isActive: (value: number | null): boolean => value !== null && value >= 1,
  isCompleted: (value: number | null): boolean => value === -99,
  getLastSpeakerFromPaused: (value: number): number => Math.abs(value),
  toPausedValue: (seatNumber: number): number => -seatNumber,
} as const;

export const GAME_CLEANUP = {
  /** Delay before deleting a finished game and its relations (1 minute) */
  DELAY_MS: 60_000,
} as const;

export const CARD_PICK = {
  /** Per-pick timeout: server auto-picks a random remaining card on expiry */
  TIMEOUT_MS: 15 * 1000,
  /** Per-pick timeout in seconds */
  TIMEOUT_SECONDS: 15,
} as const;

export const SPORTS = {
  /**
   * Sports mafia kill-selection window (docs/sports-mafia.md §5.3): buttons
   * enable on phase entry and disable after 5s. The scheduler only CLOSES the
   * window (flips a boolean) — it does NOT advance the phase; the host advances
   * manually. Mirrors the voting-window shape.
   */
  MAFIA_TARGET_WINDOW_MS: 5 * 1000,
  MAFIA_TARGET_WINDOW_SECONDS: 5,
} as const;

export const PRESENCE = {
  /**
   * Single site-wide presence room. "Online" means a user is on the site
   * anywhere, not in a specific game/chat room. Heartbeat is 60s; the
   * component marks a session offline after 2.5x the interval of silence
   * (~150s) or on a graceful tab-close disconnect. The site-wide heartbeat is
   * write-only (see `PresenceBootstrap`) — it deliberately does NOT subscribe
   * to `presence.list`, which is read only where a list is actually rendered.
   */
  GLOBAL_ROOM: "global",
  HEARTBEAT_INTERVAL_MS: 60_000,
} as const;

export const COMMUNITY_CHAT = {
  /** Max characters per message (validated server-side after trimming). */
  MAX_MESSAGE_LENGTH: 500,
  /** Minimum gap between a single author's messages — anti-spam throttle. */
  SEND_COOLDOWN_MS: 1_000,
  /** How many recent messages `list` returns (and the prune retention floor). */
  LIST_LIMIT: 100,
  /** Daily prune keeps at most this many most-recent messages. */
  RETENTION_LIMIT: 200,
  /** Generous cap when listing online users for the sidebar. */
  ONLINE_CAP: 1000,
} as const;

export const GAME_BROADCAST = {
  /** Max characters per broadcast (validated server-side after trimming). */
  MAX_MESSAGE_LENGTH: 500,
  /**
   * `recent` only returns broadcasts newer than this. Keeps the reactive query
   * bounded and stops a just-joined client from being toasted with stale
   * announcements from earlier in the game.
   */
  RECENT_WINDOW_MS: 120_000,
  /** Safety cap on how many recent broadcasts `recent` returns. */
  LIST_LIMIT: 10,
} as const;

export const FOULS = {
  MAX_FOULS: 3,
  ELIMINATION_THRESHOLD: 4,
  ALLOWED_PHASES: [
    "introduction_phase",
    "farewell_speech",
    "day_phase",
    "nominated_players_speak",
    "voting",
  ] as const,
} as const;

export type RatingConfig = {
  /** Initial rating on first rated game AND the default read for a missing row. */
  start: number;
  /** Rating never drops below this; the clipped delta is what gets recorded. */
  floor: number;
  /**
   * Faction-calibrated base payouts: the K × (S − E) ratios (E = the faction's
   * observed win rate, see /docs/ranking-system.md §2–§3) scaled 2× — effective
   * K = 80 — to widen level movement given the low games-per-player volume.
   * Wins still pay ~2× losses because the average player wins only ~33.5% of
   * games, and the average per-role EV stays ~zero.
   */
  deltas: Record<
    "mafia" | "citizens" | "yakuza",
    { win: number; loss: number }
  >;
  /**
   * Symmetric table-strength term b = clamp(round((T − R) / divisor), ±cap).
   * divisor 20 is kept deliberately loose (a weaker spring than the K-linear
   * value) so skilled players can separate; the cap scales with the base and
   * stays below the smallest base number (yakuza loss 22) so a win can never
   * pay ≤ 0 and a loss can never turn positive.
   */
  tableAdjustment: { divisor: number; cap: number };
};

/**
 * Per-game-type rating config — each game variant has its own ELO calculation
 * and ladder. A game type absent from this record is UNRATED: `archiveGameLog`
 * skips all rating logic for it. Calibrated from production data (2026-07,
 * 269 decided games); recalibrate E-derived deltas every ~200 decided games.
 */
export const RATING_CONFIG: Partial<
  Record<"sports_mafia" | "city_mafia" | "japanese_mafia", RatingConfig>
> = {
  japanese_mafia: {
    start: 1000,
    floor: 100,
    deltas: {
      mafia: { win: 48, loss: -30 }, // E = 0.387 (2x)
      citizens: { win: 54, loss: -26 }, // E = 0.327 (2x)
      yakuza: { win: 56, loss: -22 }, // E = 0.286 (2x)
    },
    tableAdjustment: { divisor: 20, cap: 16 },
  },
};
