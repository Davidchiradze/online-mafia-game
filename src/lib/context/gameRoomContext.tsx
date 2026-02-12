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
import type {
  GameRoom,
  GameSessionState,
  JoinRequest,
} from "@/types/game/type";
import {
  useLivekitRoom,
  useLivekitConnect,
  useEnsurePlayerSeat,
  useJoinPermissionListener,
  useLiveKitVotingListener,
} from "@/hooks/livekit";
import { useGameSession, useGamePlayers, usePlayerRoles } from "@/hooks/game";
import {
  useMyJoinRequestStatus,
  useGameHostSubscription,
  useNightPhaseSessionListener,
} from "@/hooks/realtime";
import type { NightPhaseSession } from "@/hooks/realtime";
import type { VotingSession, VoteData } from "@/lib/liveKit/messageTypes";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import { leaveGamePlayer } from "@/lib/gamePlayers/actions";
import { Tables } from "@/db/supabase/database.types";
import type { PlayerRolesMap } from "@/types/game/type";

type GameRoomContextValue = {
  gameId: string;
  userId: string;
  hostUserId: string | null;
  isHost: boolean;
  room: LiveKitRoom;
  maxPlayers: number | null;
  livekitToken: string | null;
  joinStatus: JoinRequest["status"] | undefined;
  gameSessionState: GameSessionState | null;
  setGameSessionState: (gameSessionState: GameSessionState) => void;
  startGame: () => Promise<{ ok: boolean; message?: string }>;
  disconnect: () => void;
  isJoiningGame: boolean;
  joinError: string | null;
  players: Tables<"game_players">[];
  /** Current user's role (null if no role assigned yet) */
  viewerRole: string | null;
  /** Map of player roles filtered by team visibility */
  playerRolesMap: PlayerRolesMap;
  /** Get role for a specific player (returns null if not visible to current user) */
  getRoleForUser: (targetUserId: string) => string | null;
  /** Night phase session data - available to host and team members (RLS removed temporarily) */
  nightPhaseSession: NightPhaseSession | null;
  /** Voting session data - available during voting phase */
  votingSession: VotingSession | null;
  /** Set voting session state directly (for immediate updates after creation) */
  setVotingSession: (session: VotingSession | null) => void;
  /** Vote data aggregated from vote table - real-time vote counts */
  voteData: VoteData;
};

const GameRoomContext = createContext<GameRoomContextValue | null>(null);

export function GameRoomProvider({
  userId,
  game,
  children,
}: PropsWithChildren<{
  game: GameRoom;
  userId: string;
}>) {
  const { id: gameId, host_id, max_players: maxPlayers } = game;

  const [currentHostId, setCurrentHostId] = useState<string | null>(host_id);
  const isHost = currentHostId === userId;
  const [hasPlayerRecord, setHasPlayerRecord] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<
    JoinRequest["status"] | undefined
  >(undefined);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [room] = useState(
    () =>
      new LiveKitRoom({
        adaptiveStream: true,
        dynacast: true,
      })
  );

  // Disconnect handler - defined early so it can be used in hooks
  const disconnect = useCallback(async () => {
    try {
      if (hasPlayerRecord) await leaveGamePlayer(gameId);
      room.disconnect();
    } catch {
      // noop
    }
  }, [gameId, hasPlayerRecord, room]);

  // Game session subscription (status + startGame action)
  const { gameSessionState, startGame, setGameSessionState } = useGameSession(
    gameId,
    userId,
    { enabled: hasPlayerRecord }
  );

  // Game players subscription
  const players = useGamePlayers(gameId, hasPlayerRecord);

  // Night phase session subscription (RLS removed temporarily - all players can see)
  // Subscribe when game is in progress
  const { currentNightSession: nightPhaseSession } =
    useNightPhaseSessionListener(gameId, hasPlayerRecord && !!gameSessionState);

  // Voting session subscription via LiveKit Data Channels - only during voting phase
  // Uses reliable delivery for guaranteed real-time updates
  const isVotingPhase = gameSessionState?.game_phase === "voting";
  const { votingSession, setVotingSession, voteData } = useLiveKitVotingListener(
    gameId,
    room,
    hasPlayerRecord && isVotingPhase
  );

  // Player roles (fetched once, filtered by team visibility)
  // Auto-refetches on phase changes and when game finishes
  const { viewerRole, playerRolesMap, getRoleForUser } = usePlayerRoles(
    gameId,
    userId,
    {
      enabled: hasPlayerRecord && !!gameSessionState,
      gamePhase: gameSessionState?.game_phase,
      isGameFinished: gameSessionState?.is_finished,
    }
  );

  // Redirect back to lobby on disconnect by default
  useLivekitRoom(
    room,
    {
      redirectOnDisconnect: true,
      redirectPath: "/lobby",
    },
    hasPlayerRecord
  );

  // Handle tab close/unload events to ensure cleanup
  // useTabCloseCleanup({
  //   gameId,
  //   room,
  //   enabled: hasPlayerRecord,
  //   onCleanup: disconnect,
  // });

  useJoinPermissionListener({ gameId, room, hasPlayerRecord, setJoinStatus });

  useEnsurePlayerSeat({
    gameId,
    isHost,
    joinStatus,
    hasPlayerRecord,
    setIsJoiningGame,
    setJoinError,
    setHasPlayerRecord,
    setCurrentHostId,
  });

  useLivekitConnect({
    gameId,
    userId,
    isHost,
    joinStatus,
    isJoiningGame,
    hasPlayerRecord,
    joinError,
    room,
    setLivekitToken,
  });

  // Listen to my join request updates (kick -> disconnect)
  useMyJoinRequestStatus(gameId, userId, (nextStatus) => {
    setJoinStatus(nextStatus);
    if (nextStatus === JOIN_REQUEST_STATUSES.REJECTED) {
      room.disconnect();
    }
  });

  // Subscribe to host changes (keep same behavior as before)
  useGameHostSubscription(
    gameId,
    (newHostId) => {
      setCurrentHostId(newHostId);
    },
    true
  );

  // In the future, we may subscribe to host changes in a hook and update currentHostId here.
  const value: GameRoomContextValue = useMemo(
    () => ({
      gameId,
      userId,
      hostUserId: currentHostId,
      isHost,
      room,
      livekitToken,
      joinStatus,
      gameSessionState,
      setGameSessionState,
      maxPlayers,
      startGame: async () => {
        const res = await startGame();
        return {
          ok: Boolean(res?.ok),
          message: res?.ok ? undefined : res?.message,
        };
      },
      disconnect,
      isJoiningGame,
      joinError,
      players,
      viewerRole,
      playerRolesMap,
      getRoleForUser,
      nightPhaseSession,
      votingSession,
      setVotingSession,
      voteData,
    }),
    [
      gameId,
      userId,
      currentHostId,
      isHost,
      room,
      livekitToken,
      maxPlayers,
      joinStatus,
      gameSessionState,
      setGameSessionState,
      startGame,
      disconnect,
      isJoiningGame,
      joinError,
      players,
      viewerRole,
      playerRolesMap,
      getRoleForUser,
      nightPhaseSession,
      votingSession,
      setVotingSession,
      voteData,
    ]
  );

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
