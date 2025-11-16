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
import { useLivekitRoom } from "@/hooks/useLivekitRoom";
import { useGameSession } from "@/hooks/useGameSession";
import { useMyJoinRequestStatus } from "@/hooks/useJoinRequests";
import { useGameHostSubscription } from "@/hooks/useGameHostSubscription";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import { checkOrRequestJoin } from "@/lib/gameRoom/actions";
import {
  assignSeatIfMissing,
  generateLivekitAccessToken,
} from "@/lib/liveKit/actions";
import { Enums } from "@/db/supabase/database.types";

type GameRoomContextValue = {
  gameId: string;
  userId: string;
  hostUserId: string | null;
  isHost: boolean;
  room: LiveKitRoom;
  maxPlayers: number;
  livekitToken: string | null;
  joinStatus: JoinRequest["status"] | undefined;
  gameSessionState: GameSessionState | null;
  startGame: () => Promise<{ ok: boolean; message?: string }>;
  disconnect: () => void;
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
  const { gameSessionState, startGame } = useGameSession(gameId, userId);

  // Redirect back to lobby on disconnect by default
  useLivekitRoom(room, { redirectOnDisconnect: true, redirectPath: "/lobby" });

  // Initial allow check -> possibly request to join
  useEffect(() => {
    let mounted = true;
    checkOrRequestJoin(gameId).then((res) => {
      if (!mounted) return;
      if (res?.ok && res.allowed) {
        setJoinStatus(res.status ?? JOIN_REQUEST_STATUSES.ACCEPTED);
      } else if (res?.ok && !res.allowed) {
        setJoinStatus(res.status ?? JOIN_REQUEST_STATUSES.PENDING);
      }
    });
    return () => {
      mounted = false;
    };
  }, [gameId]);

  // Connect to LiveKit based on role and joinStatus
  useEffect(() => {
    let cancelled = false;
    async function connectIfNeeded() {
      if (!gameId || !userId) return;
      // Host connects immediately; players connect when accepted
      const canConnect =
        isHost || joinStatus === JOIN_REQUEST_STATUSES.ACCEPTED;
      if (!canConnect) return;
      const identity = userId;
      const token = await generateLivekitAccessToken(gameId, identity, {
        hidden: false,
        roomAdmin: isHost,
      });
      if (cancelled) return;
      setLivekitToken(token ?? null);
      try {
        await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token || "");
        await room.localParticipant.setCameraEnabled(true);
        // Host doesn't take a seat; players do
        if (!isHost) {
          await assignSeatIfMissing(gameId, identity, 12);
        }
      } catch {
        // noop: connection errors handled by LiveKit listeners/hooks
      }
    }
    void connectIfNeeded();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, userId, isHost, joinStatus]);

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

  const disconnect = useCallback(() => {
    try {
      room.disconnect();
    } catch {
      // noop
    }
  }, [room]);

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
      maxPlayers,
      startGame: async () => {
        const res = await startGame();
        return {
          ok: Boolean(res?.ok),
          message: res?.ok ? undefined : res?.message,
        };
      },
      disconnect,
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
      startGame,
      disconnect,
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
