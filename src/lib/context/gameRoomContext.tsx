"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PropsWithChildren } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import { useQuery, useMutation } from "convex/react";
import { authProfiles, lobbyGames, joinRequests } from "@convex/refs/lobby";
import {
  gameSessions,
  gamePlayers,
  gameRoles,
  nightPhase,
  voting,
  gameSpectators,
} from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useLivekitRoom, useLivekitConnect, useLivekitCleanup } from "@/hooks/livekit";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JoinStatus = "pending" | "accepted" | "rejected" | "none";

type ConvexGamePlayer = {
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

type ConvexGameSession = {
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
};

type ConvexNightPhaseSession = {
  _id: Id<"nightPhaseSessions">;
  _creationTime: number;
  gameId: Id<"games">;
  nightNumber: number;
  mafiaTarget?: number;
  yakuzaTarget?: number;
  healedPlayer?: number;
};

type ConvexVotingSession = {
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
};

type VoteData = {
  votes: Record<string, number[]>;
  playersWhoVoted: number[];
  bothLeaveVoters: number[];
};

type GameData = {
  _id: Id<"games">;
  name: string;
  hostId: Id<"profiles">;
  gameType: string;
  gameStatus: string;
  maxPlayers: number;
  code: string;
};

type GameRoomContextValue = {
  gameId: string;
  userId: string;
  hostUserId: string | null;
  isHost: boolean;
  isSpectator: boolean;
  gameData: GameData | null;
  room: LiveKitRoom;
  maxPlayers: number | null;
  livekitToken: string | null;
  joinStatus: JoinStatus;
  gameSessionState: ConvexGameSession | null;
  setGameSessionState: (state: ConvexGameSession | null) => void;
  startGame: () => Promise<{ ok: boolean; message?: string }>;
  disconnect: () => void;
  isJoiningGame: boolean;
  joinError: string | null;
  players: ConvexGamePlayer[];
  viewerRole: string | null;
  playerRolesMap: Map<string, string | null>;
  getRoleForUser: (targetUserId: string) => string | null;
  nightPhaseSession: ConvexNightPhaseSession | null;
  votingSession: ConvexVotingSession | null;
  setVotingSession: (session: ConvexVotingSession | null) => void;
  voteData: VoteData;
  healedPlayers: number[];
};

const EMPTY_VOTE_DATA: VoteData = {
  votes: {},
  playersWhoVoted: [],
  bothLeaveVoters: [],
};

const GameRoomContext = createContext<GameRoomContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GameRoomProvider({
  gameId,
  isSpectator = false,
  children,
}: PropsWithChildren<{
  gameId: Id<"games">;
  isSpectator?: boolean;
}>) {
  // ---------------------------------------------------------------------------
  // Current user (profile ID is the app-level identity)
  // ---------------------------------------------------------------------------
  const currentProfile = useQuery(authProfiles.currentProfile);
  const currentUserId = currentProfile?._id ?? null;
  const userId = (currentUserId ?? "") as string;

  // ---------------------------------------------------------------------------
  // Convex reactive queries
  // ---------------------------------------------------------------------------
  const game = useQuery(lobbyGames.getById, { gameId });
  const myStatus = useQuery(joinRequests.myStatus, { gameId });
  const playersData = useQuery(gamePlayers.listByGame, { gameId });
  const sessionData = useQuery(gameSessions.get, { gameId });
  const rolesData = useQuery(gameRoles.getVisible, { gameId });
  const nightData = useQuery(nightPhase.getCurrent, { gameId });
  const healedData = useQuery(nightPhase.getHealedPlayers, { gameId });
  const votingData = useQuery(voting.getSession, { gameId });

  const votingSessionId = votingData?._id ?? null;
  const votesData = useQuery(
    voting.getVotes,
    votingSessionId ? { votingSessionId } : "skip",
  );

  // ---------------------------------------------------------------------------
  // Convex mutations
  // ---------------------------------------------------------------------------
  const checkOrRequestMutation = useMutation(joinRequests.checkOrRequest);
  const joinPlayerMutation = useMutation(gamePlayers.join);
  const leavePlayerMutation = useMutation(gamePlayers.leave);
  const leaveSpectatorMutation = useMutation(gameSpectators.leave);
  const startGameMutation = useMutation(gameSessions.startGame);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const hostUserId = game?.hostId ?? null;
  const joinStatus: JoinStatus = myStatus?.status ?? "none";
  const isHost =
    !isSpectator && !!currentUserId && !!game && game.hostId === currentUserId;

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------
  const [hasPlayerRecord, setHasPlayerRecord] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [localVotingSession, setLocalVotingSession] =
    useState<ConvexVotingSession | null>(null);
  const [localSessionState, setLocalSessionState] =
    useState<ConvexGameSession | null>(null);

  const [room] = useState(
    () =>
      new LiveKitRoom({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 320, height: 240 },
          frameRate: 30,
        },
      }),
  );

  // ---------------------------------------------------------------------------
  // Join flow
  // ---------------------------------------------------------------------------
  const [hasRequested, setHasRequested] = useState(false);

  // Step 1: Create join request if none exists
  useEffect(() => {
    if (!currentUserId || isSpectator) return;
    if (joinStatus === "none" && !hasRequested) {
      setHasRequested(true);
      checkOrRequestMutation({ gameId }).catch(() => {});
    }
  }, [
    currentUserId,
    isSpectator,
    joinStatus,
    hasRequested,
    checkOrRequestMutation,
    gameId,
  ]);

  // Step 2: Ensure player seat when accepted
  useEffect(() => {
    if (isSpectator || hasPlayerRecord || isJoiningGame) return;
    if (joinStatus !== "accepted") return;

    const ensureSeat = async () => {
      setIsJoiningGame(true);
      setJoinError(null);
      try {
        await joinPlayerMutation({ gameId });
        setHasPlayerRecord(true);
      } catch (err) {
        setJoinError(
          err instanceof Error ? err.message : "Unable to join game",
        );
      } finally {
        setIsJoiningGame(false);
      }
    };

    void ensureSeat();
  }, [
    isSpectator,
    hasPlayerRecord,
    isJoiningGame,
    joinStatus,
    joinPlayerMutation,
    gameId,
  ]);

  // Spectators are ready immediately
  useEffect(() => {
    if (isSpectator) setHasPlayerRecord(true);
  }, [isSpectator]);

  // ---------------------------------------------------------------------------
  // Disconnect
  // ---------------------------------------------------------------------------
  const disconnect = useCallback(async () => {
    try {
      if (isSpectator) {
        await leaveSpectatorMutation({ gameId });
      } else if (hasPlayerRecord) {
        await leavePlayerMutation({ gameId });
      }
      room.disconnect();
    } catch {
      // noop
    }
  }, [
    gameId,
    hasPlayerRecord,
    isSpectator,
    room,
    leavePlayerMutation,
    leaveSpectatorMutation,
  ]);

  // Handle rejected → disconnect
  useEffect(() => {
    if (joinStatus === "rejected") {
      room.disconnect();
    }
  }, [joinStatus, room]);

  // Disconnect LiveKit and clean up Convex records on unmount / tab close
  useLivekitCleanup(room, disconnect);

  // ---------------------------------------------------------------------------
  // LiveKit hooks
  // ---------------------------------------------------------------------------
  useLivekitRoom(
    room,
    {
      redirectOnDisconnect: joinStatus !== "rejected",
      redirectPath: "/lobby",
    },
    isSpectator || hasPlayerRecord,
  );

  const livekitJoinStatus =
    joinStatus === "accepted"
      ? JOIN_REQUEST_STATUSES.ACCEPTED
      : joinStatus === "pending"
        ? JOIN_REQUEST_STATUSES.PENDING
        : joinStatus === "rejected"
          ? JOIN_REQUEST_STATUSES.REJECTED
          : undefined;

  useLivekitConnect({
    gameId: gameId as string,
    userId,
    isHost,
    joinStatus: livekitJoinStatus,
    isJoiningGame,
    hasPlayerRecord,
    joinError,
    room,
    setLivekitToken,
    isSpectator,
    participantName: currentProfile?.nickname,
  });

  // ---------------------------------------------------------------------------
  // Computed: roles
  // ---------------------------------------------------------------------------
  const { viewerRole, playerRolesMap, getRoleForUser } = useMemo(() => {
    if (!rolesData) {
      return {
        viewerRole: null,
        playerRolesMap: new Map<string, string | null>(),
        getRoleForUser: () => null,
      };
    }

    const map = new Map<string, string | null>();
    for (const r of rolesData.roles) {
      map.set(r.playerId as string, r.role);
    }

    return {
      viewerRole: rolesData.viewerRole,
      playerRolesMap: map,
      getRoleForUser: (targetUserId: string): string | null =>
        map.get(targetUserId) ?? null,
    };
  }, [rolesData]);

  // ---------------------------------------------------------------------------
  // Computed: vote data
  // ---------------------------------------------------------------------------
  const voteData = useMemo<VoteData>(() => {
    if (!votesData) return EMPTY_VOTE_DATA;

    const votes: Record<string, number[]> = {};
    const playersWhoVoted: number[] = [];
    const bothLeaveVoters: number[] = [];

    for (const vote of votesData) {
      if (vote.isBothLeave) {
        bothLeaveVoters.push(vote.voterSeat);
      } else {
        playersWhoVoted.push(vote.voterSeat);
        if (vote.seatNumber !== undefined) {
          const key = String(vote.seatNumber);
          if (!votes[key]) votes[key] = [];
          votes[key].push(vote.voterSeat);
        }
      }
    }

    return { votes, playersWhoVoted, bothLeaveVoters };
  }, [votesData]);

  // Prefer Convex reactive data over local overrides
  const effectiveSession = sessionData ?? localSessionState;
  const effectiveVoting = votingData ?? localVotingSession;

  // ---------------------------------------------------------------------------
  // Start game
  // ---------------------------------------------------------------------------
  const startGame = useCallback(async () => {
    if (isSpectator)
      return { ok: false, message: "Spectators cannot start games" };
    try {
      await startGameMutation({ gameId });
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Failed to start game",
      };
    }
  }, [isSpectator, startGameMutation, gameId]);

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------
  const value: GameRoomContextValue = useMemo(
    () => ({
      gameId: gameId as string,
      userId,
      hostUserId: (hostUserId as string) ?? null,
      isHost,
      isSpectator,
      gameData: game
        ? {
            _id: game._id,
            name: game.name,
            hostId: game.hostId,
            gameType: game.gameType,
            gameStatus: game.gameStatus,
            maxPlayers: game.maxPlayers,
            code: game.code,
          }
        : null,
      room,
      maxPlayers: game?.maxPlayers ?? null,
      livekitToken,
      joinStatus,
      gameSessionState: effectiveSession ?? null,
      setGameSessionState: setLocalSessionState,
      startGame,
      disconnect,
      isJoiningGame,
      joinError,
      players: playersData ?? [],
      viewerRole,
      playerRolesMap,
      getRoleForUser,
      nightPhaseSession: nightData ?? null,
      votingSession: effectiveVoting ?? null,
      setVotingSession: setLocalVotingSession,
      voteData,
      healedPlayers: healedData ?? [],
    }),
    [
      gameId,
      userId,
      hostUserId,
      isHost,
      isSpectator,
      game,
      room,
      livekitToken,
      joinStatus,
      effectiveSession,
      startGame,
      disconnect,
      isJoiningGame,
      joinError,
      playersData,
      viewerRole,
      playerRolesMap,
      getRoleForUser,
      nightData,
      effectiveVoting,
      voteData,
      healedData,
    ],
  );

  // Wait for auth to resolve before rendering children
  if (currentUserId === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner message="Authenticating..." />
      </div>
    );
  }

  return (
    <GameRoomContext.Provider value={value}>
      {children}
    </GameRoomContext.Provider>
  );
}

export function useGameRoom() {
  const ctx = useContext(GameRoomContext);
  if (!ctx) {
    throw new Error("useGameRoom must be used within a GameRoomProvider");
  }
  return ctx;
}
