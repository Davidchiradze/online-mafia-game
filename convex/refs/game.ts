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
  state?: string;
};

type GameSessionDoc = {
  _id: Id<"gameSessions">;
  _creationTime: number;
  gameId: Id<"games">;
  gamePhase: string;
  isFinished: boolean;
  currentNightNumber: number;
  currentSpeakerIndex?: number;
  dayRoundOpenerIndex?: number;
  foulEliminationOccurred?: boolean;
  nominatedPlayers: number[];
  speakerStartedAt?: string;
  speakingOrder: number[];
} | null;

type NightPhaseSessionDoc = {
  _id: Id<"nightPhaseSessions">;
  _creationTime: number;
  gameId: Id<"games">;
  nightNumber: number;
  mafiaTarget?: number;
  yakuzaTarget?: number;
  healedPlayer?: number;
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

type GameType = "traditional" | "city_mafia" | "japanese_mafia";
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
  startGame: makeFunctionReference<"mutation", { gameId: Id<"games"> }, Id<"gameSessions">>(
    "game/sessions:startGame",
  ),
  finishGame: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/sessions:finishGame",
  ),
};

// ============================================================================
// GAME PLAYERS
// ============================================================================

export const gamePlayers = {
  listByGame: makeFunctionReference<"query", { gameId: Id<"games"> }, GamePlayer[]>(
    "game/players:listByGame",
  ),
  join: makeFunctionReference<
    "mutation",
    { gameId: Id<"games"> },
    { playerId: Id<"gamePlayers">; game: GameWithRelations }
  >("game/players:join"),
  leave: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/players:leave",
  ),
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
  getVisible: makeFunctionReference<"query", { gameId: Id<"games"> }, VisibleRoles>(
    "game/roles:getVisible",
  ),
  assign: makeFunctionReference<
    "mutation",
    { gameId: Id<"games">; playerId: Id<"profiles">; role: string },
    null
  >("game/roles:assign"),
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
  startNight: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/nightPhase:startNight",
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
  transitionToNightPhase: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:transitionToNightPhase",
  ),
  deleteSession: makeFunctionReference<"mutation", { gameId: Id<"games"> }, null>(
    "game/voting:deleteSession",
  ),
};
