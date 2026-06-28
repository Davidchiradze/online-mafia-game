"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import { useQuery } from "convex/react";
import { PERMISSIONS, roleHasPermission } from "@convex/lib/access";
import { authProfiles, lobbyGames } from "@convex/refs/lobby";
import {
  gameSessions,
  gamePlayers,
  gameRoles,
  nightPhase,
  voting,
} from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useGameRoomConnection, type JoinStatus } from "./useGameRoomConnection";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  isReady?: boolean;
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
  winner?: "mafia" | "yakuza" | "citizens";
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
  isPrivate: boolean;
};

type GameSpectator = {
  _id: string;
  gameId: string;
  userId: string;
  nickname: string;
  avatar?: string;
};

type GameRoomContextValue = {
  gameId: string;
  userId: string;
  hostUserId: string | null;
  isHost: boolean;
  isSpectator: boolean;
  gameData: GameData | null;
  spectators: GameSpectator[];
  room: LiveKitRoom;
  maxPlayers: number | null;
  livekitToken: string | null;
  joinStatus: JoinStatus;
  gameSessionState: ConvexGameSession | null;
  isJoiningGame: boolean;
  joinError: string | null;
  players: ConvexGamePlayer[];
  viewerRole: string | null;
  playerRolesMap: Map<string, string | null>;
  getRoleForUser: (targetUserId: string) => string | null;
  /** True when the viewer is a staff member spectating (may use staff tools). */
  canRevealRoles: boolean;
  /** Whether the staff spectator has toggled the host-POV role reveal on. */
  hostVisionEnabled: boolean;
  setHostVisionEnabled: (enabled: boolean) => void;
  nightPhaseSession: ConvexNightPhaseSession | null;
  votingSession: ConvexVotingSession | null;
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
  // Staff host-POV reveal (spectating moderators/admins only)
  // ---------------------------------------------------------------------------
  const canRevealRoles =
    isSpectator &&
    roleHasPermission(currentProfile?.role, PERMISSIONS.GAME_REVEAL_ROLES);
  const [hostVisionRequested, setHostVisionRequested] = useState(false);
  // Gate the toggle behind the privilege so it can never be on for a non-staff
  // viewer even if the state somehow flips.
  const hostVisionEnabled = canRevealRoles && hostVisionRequested;

  // ---------------------------------------------------------------------------
  // Convex reactive queries
  // ---------------------------------------------------------------------------
  const game = useQuery(lobbyGames.getById, { gameId });
  const playersData = useQuery(gamePlayers.listByGame, { gameId });
  const sessionData = useQuery(gameSessions.get, { gameId });
  const rolesData = useQuery(gameRoles.getVisible, {
    gameId,
    revealAll: hostVisionEnabled,
  });
  const nightData = useQuery(nightPhase.getCurrent, { gameId });
  const healedData = useQuery(nightPhase.getHealedPlayers, { gameId });
  const votingData = useQuery(voting.getSession, { gameId });

  const votingSessionId = votingData?._id ?? null;
  const votesData = useQuery(
    voting.getVotes,
    votingSessionId ? { votingSessionId } : "skip",
  );

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const hostUserId = game?.hostId ?? null;
  const isHost =
    !isSpectator && !!currentUserId && !!game && game.hostId === currentUserId;

  // Derived from server state so it resets to false if the player record is
  // deleted (e.g. after a kick), allowing the join flow to re-run on re-accept.
  const hasPlayerRecord = useMemo(() => {
    if (isSpectator) return true;
    if (!playersData || !currentUserId) return false;
    return playersData.some((p) => p.playerId === currentUserId);
  }, [isSpectator, playersData, currentUserId]);

  // ---------------------------------------------------------------------------
  // Join lifecycle + LiveKit connection
  // ---------------------------------------------------------------------------
  const { room, livekitToken, joinStatus, isJoiningGame, joinError } =
    useGameRoomConnection({
      gameId,
      isSpectator,
      currentUserId,
      userId,
      isHost,
      hasPlayerRecord,
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
            isPrivate: game.isPrivate,
          }
        : null,
      spectators: (game?.spectators ?? []) as GameSpectator[],
      room,
      maxPlayers: game?.maxPlayers ?? null,
      livekitToken,
      joinStatus,
      gameSessionState: sessionData ?? null,
      isJoiningGame,
      joinError,
      players: playersData ?? [],
      viewerRole,
      playerRolesMap,
      getRoleForUser,
      canRevealRoles,
      hostVisionEnabled,
      setHostVisionEnabled: setHostVisionRequested,
      nightPhaseSession: nightData ?? null,
      votingSession: votingData ?? null,
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
      sessionData,
      isJoiningGame,
      joinError,
      playersData,
      viewerRole,
      playerRolesMap,
      getRoleForUser,
      canRevealRoles,
      hostVisionEnabled,
      nightData,
      votingData,
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
