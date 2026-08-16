import { makeFunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";

// ============================================================================
// SHARED TYPES
// ============================================================================

type GamePlayer = {
  _id: Id<"gamePlayers">;
  _creationTime: number;
  gameId: Id<"games">;
  playerId: Id<"profiles">;
  nickname: string;
  seatNumber?: number;
  isAlive: boolean;
  fouls: number;
  foulSpeakStartedAt?: number;
  foulSpeakingBanRound?: number;
  state?: string;
  isReady?: boolean;
};

type GameSessionDoc = {
  _id: Id<"gameSessions">;
  _creationTime: number;
  gameId: Id<"games">;
  gamePhase: string;
  nextPhase?: string;
  isFinished: boolean;
  currentNightNumber: number;
  currentSpeakerIndex?: number;
  dayRoundOpenerIndex?: number;
  foulEliminationOccurred?: boolean;
  nominatedPlayers: number[];
  speakerStartedAt?: string;
  speakingOrder: number[];
  winner?: "mafia" | "yakuza" | "citizens";
} | null;

type NightPhaseSessionDoc = {
  _id: Id<"nightPhaseSessions">;
  _creationTime: number;
  gameId: Id<"games">;
  nightNumber: number;
  mafiaTarget?: number;
  yakuzaTarget?: number;
  healedPlayer?: number;
  // Sports unanimous-vote window (§5). `mafiaTargetSelections` is intentionally
  // omitted from the client shape — it is private per mafia (§5.4).
  mafiaTargetWindowActive?: boolean;
  mafiaTargetWindowStartedAt?: string;
} | null;

type VotingSessionDoc = {
  _id: Id<"votingSessions">;
  _creationTime: number;
  gameId: Id<"games">;
  roundNumber: number;
  candidates: number[];
  currentCandidateIndex?: number;
  votingActive?: boolean;
  votingStartedAt?: string;
  isTieBreak?: boolean;
  tieBreakRound?: number;
  previousTiedCandidates?: number[];
  bothLeaveVoteActive?: boolean;
  playersWhoVoted?: number[];
} | null;

type VoteDoc = {
  _id: Id<"votes">;
  _creationTime: number;
  votingSessionId: Id<"votingSessions">;
  voterSeat: number;
  seatNumber?: number;
  isAutoVote: boolean;
  isBothLeave: boolean;
};

type VisibleRoles = {
  viewerRole: string | null;
  roles: Array<{ playerId: Id<"profiles">; role: string | null }>;
};

type AuthorityCheck = {
  hasAuthority: boolean;
  role: string | null;
};

type DoctorAuthorityCheck = AuthorityCheck & {
  healedPlayers: number[];
};

type GameType = "sports_mafia" | "city_mafia" | "japanese_mafia";
type GameStatus = "not_started" | "playing" | "finished";

type GameWithRelations = {
  _id: Id<"games">;
  _creationTime: number;
  code: string;
  name: string;
  hostId: Id<"profiles">;
  gameType: GameType;
  gameStatus: GameStatus;
  maxPlayers: number;
  isPrivate: boolean;
  players: GamePlayer[];
  spectators: Array<{
    _id: Id<"gameSpectators">;
    _creationTime: number;
    gameId: Id<"games">;
    userId: Id<"profiles">;
    nickname: string;
  }>;
};

// ============================================================================
// GAME SESSIONS
// ============================================================================

type GameSessionUpdates = {
  gamePhase?: string;
  nextPhase?: string | null;
  isFinished?: boolean;
  currentNightNumber?: number;
  currentSpeakerIndex?: number | null;
  dayRoundOpenerIndex?: number | null;
  foulEliminationOccurred?: boolean;
  nominatedPlayers?: number[];
  speakerStartedAt?: string | null;
  speakingOrder?: number[];
};

export const gameSessions = {
  get: makeFunctionReference<"query", { gameId: Id<"games"> }, GameSessionDoc>(
    "games/core/sessions:get",
  ),
  create: makeFunctionReference<"mutation", { gameId: Id<"games"> }, Id<"gameSessions">>(
    "games/core/sessions:create",
  ),
  update: makeFunctionReference<
    "mutation",
    { sessionId: Id<"gameSessions">; updates: GameSessionUpdates },
    null
  >("games/core/sessions:update"),
  startGame: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; withoutSelfJustification?: boolean },
    Id<"gameSessions">
  >("games/core/sessions:startGame"),
  finishGame: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/sessions:finishGame",
  ),
  assignRandomRoles: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/sessions:assignRandomRoles",
  ),
};

// ============================================================================
// GAME BROADCASTS (room notifications)
// ============================================================================

type GameBroadcast = {
  _id: Id<"gameBroadcasts">;
  kind: "staff" | "system" | "news";
  text: string;
  title?: string;
  senderNickname?: string;
  senderRole?: string;
  createdAt: number;
};

export const gameBroadcasts = {
  recent: makeFunctionReference<"query", { gameId: Id<"games"> }, GameBroadcast[]>(
    "games/core/broadcasts:recent",
  ),
  // Staff-only room message. `push` (system notifications) is internal-only and
  // is invoked via `internal.game.broadcasts.push`, not through a ref.
  send: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; text: string },
    null
  >("games/core/broadcasts:send"),
};

// ============================================================================
// GAME PLAYERS
// ============================================================================

export const gamePlayers = {
  listByGame: makeFunctionReference<"query", { gameId: Id<"games"> }, GamePlayer[]>(
    "games/core/players:listByGame",
  ),
  isPlayer: makeFunctionReference<
    "query",
    { gameId: Id<"games"> },
    { isPlayer: boolean; player: GamePlayer | null }
  >("games/core/players:isPlayer"),
  join: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { playerId: Id<"gamePlayers">; game: GameWithRelations }
  >("games/core/players:join"),
  leave: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/players:leave",
  ),
  setReady: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; ready: boolean },
    null
  >("games/core/players:setReady"),
  kill: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetPlayerId: Id<"profiles"> },
    null
  >("games/core/players:kill"),
};

// ============================================================================
// GAME SPECTATORS
// ============================================================================

export const gameSpectators = {
  listByGame: makeFunctionReference<
    "query",
    { gameId: Id<"games"> },
    Array<{
      _id: Id<"gameSpectators">;
      _creationTime: number;
      gameId: Id<"games">;
      userId: Id<"profiles">;
      nickname: string;
    }>
  >("games/core/spectators:listByGame"),
  isSpectator: makeFunctionReference<
    "query",
    { gameId: Id<"games"> },
    { isSpectator: boolean; spectator: unknown }
  >("games/core/spectators:isSpectator"),
  join: makeFunctionReference<"mutation", { gameId: Id<"games"> }, Id<"gameSpectators">>(
    "games/core/spectators:join",
  ),
  leave: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/spectators:leave",
  ),
};

// ============================================================================
// PLAYER ROLES
// ============================================================================

export const gameRoles = {
  getVisible: makeFunctionReference<
    "query",
    { gameId: Id<"games">; revealAll?: boolean },
    VisibleRoles
  >("games/core/roles:getVisible"),
  assign: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; playerId: Id<"profiles">; role: string },
    null
  >("games/core/roles:assign"),
  /**
   * Don-only single-shot promotion of a MAFIA player to MAFIA_RIGHT_HAND
   * during the `don_chooses_right_hand` phase. See `roles.ts` for full
   * validation rules.
   */
  promoteToRightHand: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetPlayerId: Id<"profiles"> },
    null
  >("games/core/roles:promoteToRightHand"),
};

// ============================================================================
// NIGHT PHASE
// ============================================================================

export const nightPhase = {
  getCurrent: makeFunctionReference<"query", { gameId: Id<"games"> }, NightPhaseSessionDoc>(
    "games/core/nightPhase:getCurrent",
  ),
  getHealedPlayers: makeFunctionReference<"query", { gameId: Id<"games"> }, number[]>(
    "games/core/nightPhase:getHealedPlayers",
  ),
  checkMafiaAuthority: makeFunctionReference<"query", { gameId: Id<"games"> }, AuthorityCheck>(
    "games/core/nightPhase:checkMafiaAuthority",
  ),
  checkYakuzaAuthority: makeFunctionReference<"query", { gameId: Id<"games"> }, AuthorityCheck>(
    "games/core/nightPhase:checkYakuzaAuthority",
  ),
  checkDoctorAuthority: makeFunctionReference<"query", { gameId: Id<"games"> }, DoctorAuthorityCheck>(
    "games/core/nightPhase:checkDoctorAuthority",
  ),
  enterNight: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/nightPhase:enterNight",
  ),
  selectMafiaTarget: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetSeatNumber: number },
    null
  >("games/core/nightPhase:selectMafiaTarget"),
  selectYakuzaTarget: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetSeatNumber: number },
    null
  >("games/core/nightPhase:selectYakuzaTarget"),
  healPlayer: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetSeatNumber: number },
    null
  >("games/core/nightPhase:healPlayer"),
};

// ============================================================================
// SPORTS NIGHT PHASE (unanimous-vote kill model — docs/variants/sports/rules.md §5)
// ============================================================================

export const sportsNightPhase = {
  /** Host opens the 5s mafia kill-selection window (during mafia_chooses_target). */
  startMafiaTargetWindow: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    null
  >("games/sports/nightPhase:startMafiaTargetWindow"),
  /** Living mafia privately picks one target (last-write-wins, in-window). */
  selectMafiaTarget: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetSeatNumber: number },
    null
  >("games/sports/nightPhase:selectMafiaTarget"),
  /** The caller's OWN pick only (never other mafia's) — §5.4. */
  getMySelection: makeFunctionReference<
    "query",
    { gameId: Id<"games"> },
    number | null
  >("games/sports/nightPhase:getMySelection"),
  /** Host-only: EVERY living mafia's pick (the host night-actions summary). */
  getHostSelections: makeFunctionReference<
    "query",
    { gameId: Id<"games"> },
    { mafiaSeat: number; targetSeat: number | null }[]
  >("games/sports/nightPhase:getHostSelections"),
};

// ============================================================================
// BEST MOVE (Sports — docs/variants/sports/rules.md §6)
// ============================================================================

export const bestMove = {
  /**
   * Victim-only: mark / un-mark a suspect. Locked once 3 are marked.
   *
   * There is no companion read here on purpose — `bestMoveSeat` /
   * `bestMoveSuspects` are public (§6.6) and already arrive through the reactive
   * `nightPhase.getCurrent` session that `gameRoomContext` exposes as
   * `nightPhaseSession`. The UI reads them there.
   */
  toggleSuspect: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; seatNumber: number },
    null
  >("games/core/bestMove:toggleSuspect"),
};

// ============================================================================
// VOTING
// ============================================================================

export const voting = {
  getSession: makeFunctionReference<"query", { gameId: Id<"games"> }, VotingSessionDoc>(
    "games/core/voting:getSession",
  ),
  getVotes: makeFunctionReference<"query", { votingSessionId: Id<"votingSessions"> }, VoteDoc[]>(
    "games/core/voting:getVotes",
  ),
  createSession: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; candidates: number[] },
    Id<"votingSessions">
  >("games/core/voting:createSession"),
  initializeVoting: makeFunctionReference<"mutation", { gameId: Id<"games"> }, Id<"votingSessions">>(
    "games/core/voting:initializeVoting",
  ),
  startVoteWindow: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/voting:startVoteWindow",
  ),
  endVoteWindow: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/voting:endVoteWindow",
  ),
  castVote: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/voting:castVote",
  ),
  castBothLeaveVote: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/voting:castBothLeaveVote",
  ),
  advanceCandidate: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { allDone: boolean }
  >("games/core/voting:advanceCandidate"),
  processResults: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { result: "winner"; winner: number } | { result: "tie"; tiedCandidates: number[] }
  >("games/core/voting:processResults"),
  startTieBreak: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; tiedCandidates: number[] },
    { bothLeaveVote: boolean }
  >("games/core/voting:startTieBreak"),
  startBothLeaveVote: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/voting:startBothLeaveVote",
  ),
  endBothLeaveVote: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/voting:endBothLeaveVote",
  ),
  processBothLeaveResult: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { allLeave: boolean; candidates: number[]; voteCount: number; totalVoters: number }
  >("games/core/voting:processBothLeaveResult"),
  startVotingFarewell: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; winnerSeatNumber: number },
    null
  >("games/core/voting:startVotingFarewell"),
  startBothLeaveFarewell: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; candidates: number[] },
    null
  >("games/core/voting:startBothLeaveFarewell"),
  skipToNightAfterTie: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/voting:skipToNightAfterTie",
  ),
  deleteSession: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/voting:deleteSession",
  ),
  endVoteWindowInternal: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/voting:endVoteWindowInternal",
  ),
  endBothLeaveVoteInternal: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/voting:endBothLeaveVoteInternal",
  ),
};

// ============================================================================
// DAY PHASE
// ============================================================================

export const dayPhase = {
  enterDayPhase: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/dayPhase:enterDayPhase",
  ),
  enterIntroductionPhase: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/dayPhase:enterIntroductionPhase",
  ),
  startDaySpeaking: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/dayPhase:startDaySpeaking",
  ),
  advanceSpeaker: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/dayPhase:advanceSpeaker",
  ),
  finishCurrentSpeaker: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/dayPhase:finishCurrentSpeaker",
  ),
  nominatePlayer: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; seatNumber: number },
    null
  >("games/core/dayPhase:nominatePlayer"),
  clearNominations: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/dayPhase:clearNominations",
  ),
  startNominatedPlayersSpeaking: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/dayPhase:startNominatedPlayersSpeaking",
  ),
  advanceNominatedSpeaker: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/dayPhase:advanceNominatedSpeaker",
  ),
  finishCurrentNominatedSpeaker: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/dayPhase:finishCurrentNominatedSpeaker",
  ),
  giveFoul: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; seatNumber: number },
    { playerEliminated: boolean }
  >("games/core/dayPhase:giveFoul"),
};

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export const webhookHandler = {
  handleParticipantLeft: makeFunctionReference<
    "action",
    { gameId: string; userId: string },
    null
  >("games/core/webhookHandler:handleParticipantLeft"),
  handleRoomFinished: makeFunctionReference<
    "action",
    { gameId: string },
    null
  >("games/core/webhookHandler:handleRoomFinished"),
};

// ============================================================================
// FAREWELL SPEECH
// ============================================================================

type FarewellState = {
  speakingOrder: number[];
  currentSpeaker: number | null;
  speakerStartedAt: string | null;
  completedSpeakers: number[];
  remainingSpeakers: number[];
} | null;

export const farewellSpeech = {
  getState: makeFunctionReference<"query", { gameId: Id<"games"> }, FarewellState>(
    "games/core/farewellSpeech:getState",
  ),
  startFarewellSpeech: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { skipToDay: boolean }
  >("games/core/farewellSpeech:startFarewellSpeech"),
  grantFarewellTime: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/farewellSpeech:grantFarewellTime",
  ),
  markDeadAndAdvance: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/farewellSpeech:markDeadAndAdvance",
  ),
  advanceFromFarewell: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "games/core/farewellSpeech:advanceFromFarewell",
  ),
};

// ============================================================================
// CARD PICKING
// ============================================================================

type CardPickingCardView = {
  cardId: string;
  claimed: boolean;
  claimedBySeat: number | null;
  role: string | null;
};

type CardPickingState = {
  pickOrder: number[];
  currentPickIndex: number;
  currentSeat: number | null;
  viewerSeat: number | null;
  isMyTurn: boolean;
  currentTurnStartedAt: string | null;
  isComplete: boolean;
  cards: CardPickingCardView[];
} | null;

export const cardPicking = {
  start: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    Id<"cardPickingSessions">
  >("games/core/cardPicking:start"),
  pickCard: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; cardId: string },
    null
  >("games/core/cardPicking:pickCard"),
  /**
   * Internal-only watchdog. Scheduled by `start` and by `applyCardClaim`
   * (after every successful pick) via `ctx.scheduler.runAfter`. Auto-picks
   * a random unclaimed card if the seat at `expectedPickIndex` still hasn't
   * picked when the job fires; otherwise it's a no-op (stale schedule).
   *
   * Not exposed to the client. Mirrors the `endVoteWindowInternal` pattern
   * used elsewhere in this file.
   */
  expireTurnInternal: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; expectedPickIndex: number },
    null
  >("games/core/cardPicking:expireTurnInternal"),
  getState: makeFunctionReference<
    "query",
    { gameId: Id<"games"> },
    CardPickingState
  >("games/core/cardPicking:getState"),
};
