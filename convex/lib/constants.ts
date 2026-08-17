// TYPE-ONLY, and it must stay that way: `lib/roles.ts` imports the team-role
// constants from this file at run time. `import type` is erased, so the cycle
// exists only for the type-checker, which handles it.
import type { Faction } from "./roles";

/**
 * THE SINGLE SOURCE OF TRUTH for phase names — every phase string in the app,
 * across both variants, is a member of this enum. Nothing else may write a
 * phase name as a bare string literal.
 *
 * It lives in `convex/` because `convex/` may never import from `src/`, so the
 * shared vocabulary has to sit on this side of the boundary;
 * `src/shared/lib/constants/game.ts` re-exports it for the frontend.
 *
 * The values are the wire format: they are what `gameSessions.gamePhase`
 * (`v.string()`) stores, so members stay assignable to `string` and a `string`
 * read back from the DB is compared against a member, never cast wholesale.
 *
 * ORDER IS NOT MEANINGFUL HERE — this is a vocabulary, not a sequence. A
 * variant's phase ORDER is its own ordered list (`GAME_PHASES` below for
 * Japanese) and its transition graph is `definition.nextPhase`.
 */
export enum GamePhase {
  GAME_SESSION_STARTED = "game_session_started",
  PICKING_ROLES = "picking_roles",
  MAFIA_MEET = "mafia_meet",
  YAKUDA_SHOGUN_MEET = "yakuda_shogun_meet",
  DETECTIVE_MEET = "detective_meet",
  DOCTOR_MEET = "doctor_meet",
  INTRODUCTION_PHASE = "introduction_phase",
  NIGHT_PHASE = "night_phase",
  MAFIA_CHOOSES_TARGET = "mafia_chooses_target",
  DON_CHECKS_FOR_DETECTIVE = "don_checks_for_detective",
  YAKUZA_AND_SHOGUN_CHOOSES_TARGET = "yakuza_and_shogun_chooses_target",
  DETECTIVE_CHECKS_FOR_MAFIA = "detective_checks_for_mafia",
  DOCTOR_HEALS_PLAYER = "doctor_heals_player",
  FAREWELL_SPEECH = "farewell_speech",
  DAY_PHASE = "day_phase",
  NOMINATED_PLAYERS_SPEAK = "nominated_players_speak",
  VOTING = "voting",
  REPEAT = "repeat",
  END_GAME = "end_game",
  /**
   * Neutral "everyone asleep" buffer inserted between meetings where the awake
   * role changes across teams (and on Doctor→wake exits).
   */
  PHASE_TRANSITION = "phase_transition",
  /** Sports-only: the Don's solo meet, inserted after `mafia_meet`. */
  DON_MEET = "don_meet",
  /**
   * Sports-only: the first-night victim names 3 suspects before their farewell
   * (docs/variants/sports/rules.md §6).
   */
  BEST_MOVE = "best_move",
}

/**
 * Japanese Mafia's ordered phase list (`definition.phases`).
 *
 * A SUBSET of the vocabulary above — it deliberately omits the Sports-only
 * phases. Order is the reading order of a round, not a state machine; the
 * actual transitions are `japaneseNextPhase`.
 */
export const GAME_PHASES = [
  GamePhase.GAME_SESSION_STARTED,
  GamePhase.PICKING_ROLES,
  GamePhase.MAFIA_MEET,
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
] as const;

/**
 * Initial card-pick deck for a 12-player Japanese Mafia game.
 *
 * Every role Japanese can hold is dealt from here — there are no roles reached
 * by in-game promotion. The two MAFIA cards give the mafia team its 3-strong
 * size alongside the DON.
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

/**
 * The mafia faction's roles, and the input to `roleToFaction`.
 *
 * `MAFIA_RIGHT_HAND` is RETIRED — no variant deals it and no live game can
 * produce it — but it stays listed on purpose: finished games persist it in
 * `gameLogPlayers.role` and `playerStats.roleStats`, and dropping it here would
 * silently reclassify those archived rows as citizens. Keeping it costs nothing
 * live (no player holds it, so every count is unchanged) and keeps match
 * history honest.
 */
export const MAFIA_TEAM_ROLES = ["DON", "MAFIA_RIGHT_HAND", "MAFIA"] as const;
export const YAKUZA_TEAM_ROLES = ["YAKUZA", "SHOGUN"] as const;

export const VOTING = {
  VOTE_WINDOW_MS: 3 * 1000,
  BOTH_LEAVE_THRESHOLD: 0.5,
} as const;

export const SPECTATOR = {
  MAX_SPECTATORS_PER_GAME: 10,
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
   * Sports mafia kill-selection window (docs/variants/sports/rules.md §5.3): buttons
   * enable on phase entry and disable after 5s. The scheduler only CLOSES the
   * window (flips a boolean) — it does NOT advance the phase; the host advances
   * manually. Mirrors the voting-window shape.
   */
  MAFIA_TARGET_WINDOW_MS: 5 * 1000,
  MAFIA_TARGET_WINDOW_SECONDS: 5,
  /**
   * Sports "best move" (docs/variants/sports/rules.md §6): the first-night victim names
   * exactly this many suspects. Reaching the cap LOCKS the set — that is the
   * phase's completion signal (there is no confirm button).
   */
  BEST_MOVE_SUSPECT_COUNT: 3,
  /**
   * Visual-only countdown for the best move. Nothing auto-advances at 0 — the
   * host still advances (and may skip early if the victim is AFK, §6.3).
   */
  BEST_MOVE_WINDOW_MS: 30 * 1000,
  BEST_MOVE_WINDOW_SECONDS: 30,
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
    GamePhase.INTRODUCTION_PHASE,
    GamePhase.FAREWELL_SPEECH,
    GamePhase.DAY_PHASE,
    GamePhase.NOMINATED_PLAYERS_SPEAK,
    GamePhase.VOTING,
  ] as const,
} as const;

export type RatingConfig = {
  /** Initial rating on first rated game AND the default read for a missing row. */
  start: number;
  /** Rating never drops below this; the clipped delta is what gets recorded. */
  floor: number;
  /**
   * Base payouts for THIS variant's factions: the K × (S − E) ratios, where E
   * is the faction's win rate **in this variant** (/docs/ranking-system.md
   * §2–§3). Each variant's numbers, and how they were arrived at, live with
   * the variant — /docs/variants/japanese/rating.md is measured from the
   * archive, /docs/variants/sports/rating.md is declared symmetric.
   *
   * PARTIAL because `Faction` is a global union while a faction *set* is
   * per-variant: a two-faction variant must carry no dead third row
   * (/docs/ranking-system.md §13). A type cannot know which factions a
   * definition declares, so exact coverage is a BUILD FAILURE instead —
   * tests/structure/ratedVariants.test.ts checks every rated config against
   * the registry.
   */
  deltas: Partial<Record<Faction, { win: number; loss: number }>>;
  /**
   * Symmetric table-strength term b = clamp(round((T − R) / divisor), ±cap).
   * divisor 20 is kept deliberately loose (a weaker spring than the K-linear
   * value) so skilled players can separate.
   *
   * INVARIANT, checked per rated variant in tests/structure/ratedVariants.test.ts:
   * the cap stays below that variant's smallest base payout, so a win can never
   * pay ≤ 0 and a loss can never turn positive however lopsided the table.
   */
  tableAdjustment: { divisor: number; cap: number };
};

/**
 * The game-type ids rating is keyed by — mirrors the `gameType` validator in
 * `convex/tables/games.ts`. Declared here so `RATING_CONFIG` and
 * `BACKFILL_POLICY` are keyed by the SAME union: adding a variant to the
 * validator without answering both is then a compile error in one of them.
 */
type RatableGameType = "sports_mafia" | "city_mafia" | "japanese_mafia";

/**
 * Per-game-type rating config — each game variant has its own ELO calculation
 * and ladder. A game type absent from this record is UNRATED: `archiveGameLog`
 * skips all rating logic for it.
 *
 * Where an entry's numbers come from is per variant, and it decides whether
 * recalibration applies: Japanese's E values are MEASURED (production data,
 * 2026-07, 269 decided games — re-derive every ~200 decided games), Sports'
 * are DECLARED and fixed. Each variant's rating doc under /docs/variants/ owns
 * the derivation; this file only holds the result.
 */
export const RATING_CONFIG: Partial<Record<RatableGameType, RatingConfig>> = {
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
  // DECLARED, not measured — the one calibration in here that is a rule rather
  // than an observation, and the reason the recalibration cadence above does
  // not apply to it (/docs/variants/sports/rating.md §2). A two-faction game is
  // *defined* as a balanced contest, so E = 0.50 on both sides and K = 80 gives
  // ±40: a win is worth exactly what a loss costs, whichever side the shuffle
  // dealt. No yakuza row — Sports has no yakuza, and a dead row here is a build
  // failure (tests/structure/ratedVariants.test.ts).
  sports_mafia: {
    start: 1000,
    floor: 100,
    deltas: {
      mafia: { win: 40, loss: -40 }, // E = 0.500 (declared)
      citizens: { win: 40, loss: -40 }, // E = 0.500 (declared)
    },
    // Same spring as Japanese, so the two ladders move at the same pace and the
    // shared level brackets stay honest (/docs/variants/sports/rating.md §4).
    tableAdjustment: { divisor: 20, cap: 16 },
  },
};

/**
 * Whether a variant's EXISTING archive may be replayed by
 * `migrations:backfillRatings` (/docs/ranking-system.md §8).
 *
 * Backfilling is a per-variant DECISION, and the migration cannot infer it:
 * "has a rating config" only says the variant is rated from now on, not that
 * games played before it was rated should retroactively count. Sports is the
 * case in point — its archive was played, and shown to players, as unrated
 * (/docs/variants/sports/rating.md §5).
 *
 * TOTAL over `RatableGameType` on purpose: adding a variant is a compile error
 * here until someone answers the question, which is the type-system catch the
 * bare `RATING_CONFIG[gameType]` check never had.
 */
export const BACKFILL_POLICY: Record<RatableGameType, "replay" | "never"> = {
  japanese_mafia: "replay",
  // Played as unrated; the ladder starts empty and fills from the first game
  // finished after the config shipped.
  sports_mafia: "never",
  // No definition registered, so there is no archive and no ladder.
  city_mafia: "never",
};
