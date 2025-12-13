"use client";

import {
  createContext,
  useCallback,
  useContext,
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
import { useLivekitRoom } from "@/hooks/useLivekitRoom";
import { useGameSession } from "@/hooks/useGameSession";
import { useMyJoinRequestStatus } from "@/hooks/useJoinRequests";
import { useGameHostSubscription } from "@/hooks/useGameHostSubscription";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import { leaveGamePlayer } from "@/lib/gamePlayers/actions";
import { useJoinPermissionListener } from "@/hooks/useJoinPermissionListener";
import { useEnsurePlayerSeat } from "@/hooks/useEnsurePlayerSeat";
import { useLivekitConnect } from "@/hooks/useLivekitConnect";

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
  isGameInProgress: boolean;
  isJoiningGame: boolean;
  joinError: string | null;
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
  const isGameInProgress = game.game_status === "playing";
  const { id: gameId, host_id } = game;
  const [currentHostId, setCurrentHostId] = useState<string | null>(host_id);
  const isHost = currentHostId === userId;
  const [maxPlayers, setMaxPlayers] = useState<number | null>(
    game.max_players ?? null
  );
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

  // Game session subscription (status + startGame action)
  const { gameSessionState, startGame, setGameSessionState } = useGameSession(
    gameId,
    userId,
    { enabled: hasPlayerRecord }
  );

  // Redirect back to lobby on disconnect by default
  useLivekitRoom(room, { redirectOnDisconnect: true, redirectPath: "/lobby" });
  useJoinPermissionListener({ gameId, room, hasPlayerRecord, setJoinStatus });

  useEnsurePlayerSeat({
    gameId,
    isHost,
    joinStatus,
    hasPlayerRecord,
    isJoiningGame,
    setIsJoiningGame,
    setJoinError,
    setHasPlayerRecord,
    setMaxPlayers,
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

  const disconnect = useCallback(async () => {
    try {
      if (hasPlayerRecord) await leaveGamePlayer(gameId);
      room.disconnect();
    } catch {
      // noop
    }
  }, [gameId, hasPlayerRecord, room]);

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
      isGameInProgress,
      isJoiningGame,
      joinError,
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
      isGameInProgress,
      isJoiningGame,
      joinError,
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
