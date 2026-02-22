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
import { leaveAsSpectator } from "@/lib/spectators/actions";
import { Tables } from "@/db/supabase/database.types";
import type { PlayerRolesMap } from "@/types/game/type";

type GameRoomContextValue = {
  gameId: string;
  userId: string;
  hostUserId: string | null;
  isHost: boolean;
  /** True if user is a spectator (view-only mode, validated server-side via database) */
  isSpectator: boolean;
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
  /** Current user's role (null if no role assigned yet, always null for spectators) */
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
  isSpectator = false,
  children,
}: PropsWithChildren<{
  game: GameRoom;
  userId: string;
  /** If true, user is a validated spectator (has database record) */
  isSpectator?: boolean;
}>) {
  const { id: gameId, host_id, max_players: maxPlayers } = game;

  const [currentHostId, setCurrentHostId] = useState<string | null>(host_id);
  const isHost = !isSpectator && currentHostId === userId; // Spectators are never hosts
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
        videoCaptureDefaults: {
          resolution: { width: 320, height: 240 },
          frameRate: 30,
        },
      }),
  );

  // Disconnect handler - defined early so it can be used in hooks
  const disconnect = useCallback(async () => {
    try {
      if (isSpectator) {
        await leaveAsSpectator(gameId);
      } else if (hasPlayerRecord) {
        await leaveGamePlayer(gameId);
      }
      room.disconnect();
    } catch {
      // noop
    }
  }, [gameId, hasPlayerRecord, isSpectator, room]);

  // Game session subscription (status + startGame action)
  // Spectators can subscribe to game session updates immediately
  const { gameSessionState, startGame, setGameSessionState } = useGameSession(
    gameId,
    userId,
    { enabled: isSpectator || hasPlayerRecord },
  );

  // Game players subscription
  // Spectators need to see players too
  const players = useGamePlayers(gameId, isSpectator || hasPlayerRecord);

  // Night phase session subscription (RLS removed temporarily - all players can see)
  // Subscribe when game is in progress (spectators can also view)
  const isReady = isSpectator || hasPlayerRecord;
  const { currentNightSession: nightPhaseSession } =
    useNightPhaseSessionListener(gameId, isReady && !!gameSessionState);

  // Voting session subscription via LiveKit Data Channels - only during voting phase
  // Uses reliable delivery for guaranteed real-time updates
  // Spectators can view voting but cannot participate
  const isVotingPhase = gameSessionState?.game_phase === "voting";
  const { votingSession, setVotingSession, voteData } =
    useLiveKitVotingListener(gameId, room, isReady && isVotingPhase);

  // Player roles (fetched once, filtered by team visibility)
  // Auto-refetches on phase changes and when game finishes
  // Spectators don't see any roles until game finishes (treated like dead players - see visibility after game ends)
  const { viewerRole, playerRolesMap, getRoleForUser } = usePlayerRoles(
    gameId,
    userId,
    {
      enabled: (isSpectator || hasPlayerRecord) && !!gameSessionState,
      gamePhase: gameSessionState?.game_phase,
      isGameFinished: gameSessionState?.is_finished,
    },
  );

  // Redirect back to lobby on disconnect by default
  useLivekitRoom(
    room,
    {
      redirectOnDisconnect: true,
      redirectPath: "/lobby",
    },
    isSpectator || hasPlayerRecord,
  );

  // Handle tab close/unload events to ensure cleanup
  // useTabCloseCleanup({
  //   gameId,
  //   room,
  //   enabled: hasPlayerRecord,
  //   onCleanup: disconnect,
  // });

  // Spectators don't need join permission or player seat hooks
  useJoinPermissionListener({
    gameId,
    room,
    hasPlayerRecord: !isSpectator && hasPlayerRecord,
    setJoinStatus,
    enabled: !isSpectator, // Disable for spectators - they don't need join requests
  });

  // Only non-spectators need to ensure a player seat
  useEnsurePlayerSeat({
    gameId,
    isHost,
    joinStatus,
    hasPlayerRecord: isSpectator || hasPlayerRecord, // Skip for spectators
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
    isSpectator,
  });

  // Listen to my join request updates (kick -> disconnect)
  // Spectators don't have join requests
  useMyJoinRequestStatus(gameId, userId, (nextStatus) => {
    if (isSpectator) return;
    setJoinStatus(nextStatus);
    if (nextStatus === JOIN_REQUEST_STATUSES.REJECTED) {
      room.disconnect();
    }
  });

  // Subscribe to host changes (keep same behavior as before)
  useGameHostSubscription(
    gameId,
    (newHostId) => {
      if (!isSpectator) {
        setCurrentHostId(newHostId);
      }
    },
    true,
  );

  // In the future, we may subscribe to host changes in a hook and update currentHostId here.
  const value: GameRoomContextValue = useMemo(
    () => ({
      gameId,
      userId,
      hostUserId: currentHostId,
      isHost,
      isSpectator,
      room,
      livekitToken,
      joinStatus,
      gameSessionState,
      setGameSessionState,
      maxPlayers,
      startGame: async () => {
        // Spectators cannot start games
        if (isSpectator) {
          return { ok: false, message: "Spectators cannot start games" };
        }
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
      isSpectator,
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
    ],
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
