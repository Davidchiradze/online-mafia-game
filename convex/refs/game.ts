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
    "game/sessions:get",
  ),
  create: makeFunctionReference<"mutation", { gameId: Id<"games"> }, Id<"gameSessions">>(
    "game/sessions:create",
  ),
  update: makeFunctionReference<
    "mutation",
    { sessionId: Id<"gameSessions">; updates: GameSessionUpdates },
    null
  >("game/sessions:update"),
  startGame: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; withoutSelfJustification?: boolean },
    Id<"gameSessions">
  >("game/sessions:startGame"),
  finishGame: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/sessions:finishGame",
  ),
  assignRandomRoles: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/sessions:assignRandomRoles",
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
    "game/broadcasts:recent",
  ),
  // Staff-only room message. `push` (system notifications) is internal-only and
  // is invoked via `internal.game.broadcasts.push`, not through a ref.
  send: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; text: string },
    null
  >("game/broadcasts:send"),
};

// ============================================================================
// GAME PLAYERS
// ============================================================================

export const gamePlayers = {
  listByGame: makeFunctionReference<"query", { gameId: Id<"games"> }, GamePlayer[]>(
    "game/players:listByGame",
  ),
  isPlayer: makeFunctionReference<
    "query",
    { gameId: Id<"games"> },
    { isPlayer: boolean; player: GamePlayer | null }
  >("game/players:isPlayer"),
  join: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { playerId: Id<"gamePlayers">; game: GameWithRelations }
  >("game/players:join"),
  leave: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/players:leave",
  ),
  setReady: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; ready: boolean },
    null
  >("game/players:setReady"),
  kill: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetPlayerId: Id<"profiles"> },
    null
  >("game/players:kill"),
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
  >("game/spectators:listByGame"),
  isSpectator: makeFunctionReference<
    "query",
    { gameId: Id<"games"> },
    { isSpectator: boolean; spectator: unknown }
  >("game/spectators:isSpectator"),
  join: makeFunctionReference<"mutation", { gameId: Id<"games"> }, Id<"gameSpectators">>(
    "game/spectators:join",
  ),
  leave: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/spectators:leave",
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
  >("game/roles:getVisible"),
  assign: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; playerId: Id<"profiles">; role: string },
    null
  >("game/roles:assign"),
  /**
   * Don-only single-shot promotion of a MAFIA player to MAFIA_RIGHT_HAND
   * during the `don_chooses_right_hand` phase. See `roles.ts` for full
   * validation rules.
   */
  promoteToRightHand: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetPlayerId: Id<"profiles"> },
    null
  >("game/roles:promoteToRightHand"),
};

// ============================================================================
// NIGHT PHASE
// ============================================================================

export const nightPhase = {
  getCurrent: makeFunctionReference<"query", { gameId: Id<"games"> }, NightPhaseSessionDoc>(
    "game/nightPhase:getCurrent",
  ),
  getHealedPlayers: makeFunctionReference<"query", { gameId: Id<"games"> }, number[]>(
    "game/nightPhase:getHealedPlayers",
  ),
  checkMafiaAuthority: makeFunctionReference<"query", { gameId: Id<"games"> }, AuthorityCheck>(
    "game/nightPhase:checkMafiaAuthority",
  ),
  checkYakuzaAuthority: makeFunctionReference<"query", { gameId: Id<"games"> }, AuthorityCheck>(
    "game/nightPhase:checkYakuzaAuthority",
  ),
  checkDoctorAuthority: makeFunctionReference<"query", { gameId: Id<"games"> }, DoctorAuthorityCheck>(
    "game/nightPhase:checkDoctorAuthority",
  ),
  enterNight: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/nightPhase:enterNight",
  ),
  selectMafiaTarget: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetSeatNumber: number },
    null
  >("game/nightPhase:selectMafiaTarget"),
  selectYakuzaTarget: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetSeatNumber: number },
    null
  >("game/nightPhase:selectYakuzaTarget"),
  healPlayer: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetSeatNumber: number },
    null
  >("game/nightPhase:healPlayer"),
};

// ============================================================================
// SPORTS NIGHT PHASE (unanimous-vote kill model — docs/sports-mafia.md §5)
// ============================================================================

export const sportsNightPhase = {
  /** Host opens the 5s mafia kill-selection window (during mafia_chooses_target). */
  startMafiaTargetWindow: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    null
  >("game/sportsNightPhase:startMafiaTargetWindow"),
  /** Living mafia privately picks one target (last-write-wins, in-window). */
  selectMafiaTarget: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; targetSeatNumber: number },
    null
  >("game/sportsNightPhase:selectMafiaTarget"),
  /** The caller's OWN pick only (never other mafia's) — §5.4. */
  getMySelection: makeFunctionReference<
    "query",
    { gameId: Id<"games"> },
    number | null
  >("game/sportsNightPhase:getMySelection"),
  /** Host-only: EVERY living mafia's pick (the host night-actions summary). */
  getHostSelections: makeFunctionReference<
    "query",
    { gameId: Id<"games"> },
    { mafiaSeat: number; targetSeat: number | null }[]
  >("game/sportsNightPhase:getHostSelections"),
};

// ============================================================================
// VOTING
// ============================================================================

export const voting = {
  getSession: makeFunctionReference<"query", { gameId: Id<"games"> }, VotingSessionDoc>(
    "game/voting:getSession",
  ),
  getVotes: makeFunctionReference<"query", { votingSessionId: Id<"votingSessions"> }, VoteDoc[]>(
    "game/voting:getVotes",
  ),
  createSession: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; candidates: number[] },
    Id<"votingSessions">
  >("game/voting:createSession"),
  initializeVoting: makeFunctionReference<"mutation", { gameId: Id<"games"> }, Id<"votingSessions">>(
    "game/voting:initializeVoting",
  ),
  startVoteWindow: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:startVoteWindow",
  ),
  endVoteWindow: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:endVoteWindow",
  ),
  castVote: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:castVote",
  ),
  castBothLeaveVote: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:castBothLeaveVote",
  ),
  advanceCandidate: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { allDone: boolean }
  >("game/voting:advanceCandidate"),
  processResults: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { result: "winner"; winner: number } | { result: "tie"; tiedCandidates: number[] }
  >("game/voting:processResults"),
  startTieBreak: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; tiedCandidates: number[] },
    { bothLeaveVote: boolean }
  >("game/voting:startTieBreak"),
  startBothLeaveVote: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:startBothLeaveVote",
  ),
  endBothLeaveVote: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:endBothLeaveVote",
  ),
  processBothLeaveResult: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { allLeave: boolean; candidates: number[]; voteCount: number; totalVoters: number }
  >("game/voting:processBothLeaveResult"),
  startVotingFarewell: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; winnerSeatNumber: number },
    null
  >("game/voting:startVotingFarewell"),
  startBothLeaveFarewell: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; candidates: number[] },
    null
  >("game/voting:startBothLeaveFarewell"),
  skipToNightAfterTie: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:skipToNightAfterTie",
  ),
  deleteSession: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:deleteSession",
  ),
  endVoteWindowInternal: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:endVoteWindowInternal",
  ),
  endBothLeaveVoteInternal: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:endBothLeaveVoteInternal",
  ),
};

// ============================================================================
// DAY PHASE
// ============================================================================

export const dayPhase = {
  startDaySpeaking: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/dayPhase:startDaySpeaking",
  ),
  advanceSpeaker: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/dayPhase:advanceSpeaker",
  ),
  finishCurrentSpeaker: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/dayPhase:finishCurrentSpeaker",
  ),
  nominatePlayer: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; seatNumber: number },
    null
  >("game/dayPhase:nominatePlayer"),
  clearNominations: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/dayPhase:clearNominations",
  ),
  startNominatedPlayersSpeaking: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/dayPhase:startNominatedPlayersSpeaking",
  ),
  advanceNominatedSpeaker: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/dayPhase:advanceNominatedSpeaker",
  ),
  finishCurrentNominatedSpeaker: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/dayPhase:finishCurrentNominatedSpeaker",
  ),
  giveFoul: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; seatNumber: number },
    { playerEliminated: boolean }
  >("game/dayPhase:giveFoul"),
};

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export const webhookHandler = {
  handleParticipantLeft: makeFunctionReference<
    "action",
    { gameId: string; userId: string },
    null
  >("game/webhookHandler:handleParticipantLeft"),
  handleRoomFinished: makeFunctionReference<
    "action",
    { gameId: string },
    null
  >("game/webhookHandler:handleRoomFinished"),
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
    "game/farewellSpeech:getState",
  ),
  startFarewellSpeech: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { skipToDay: boolean }
  >("game/farewellSpeech:startFarewellSpeech"),
  grantFarewellTime: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/farewellSpeech:grantFarewellTime",
  ),
  markDeadAndAdvance: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/farewellSpeech:markDeadAndAdvance",
  ),
  advanceFromFarewell: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/farewellSpeech:advanceFromFarewell",
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
  >("game/cardPicking:start"),
  pickCard: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; cardId: string },
    null
  >("game/cardPicking:pickCard"),
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
  >("game/cardPicking:expireTurnInternal"),
  getState: makeFunctionReference<
    "query",
    { gameId: Id<"games"> },
    CardPickingState
  >("game/cardPicking:getState"),
};
