"use client";

import { useCallback, useEffect, useState } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import { useQuery, useMutation } from "convex/react";
import { joinRequests } from "@convex/refs/lobby";
import { gamePlayers, gameSpectators } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import {
  useLivekitRoom,
  useLivekitConnect,
  useLivekitCleanup,
} from "@/hooks/livekit";
import { JOIN_REQUEST_STATUSES } from "@/shared/lib/constants/game";

export type JoinStatus = "pending" | "accepted" | "rejected" | "none";

type Params = {
  gameId: Id<"games">;
  isSpectator: boolean;
  currentUserId: Id<"profiles"> | null;
  userId: string;
  isHost: boolean;
  hasPlayerRecord: boolean;
  participantName?: string;
};

export type GameRoomConnection = {
  room: LiveKitRoom;
  livekitToken: string | null;
  joinStatus: JoinStatus;
  isJoiningGame: boolean;
  joinError: string | null;
};

/**
 * Owns the join/leave lifecycle and LiveKit connection for a game room:
 * - creates the join request, ensures a player seat once accepted,
 * - connects to LiveKit when DB seat/permissions are ready,
 * - cleans up Convex records + the WebRTC transport on unmount / rejection.
 *
 * Extracted from `GameRoomProvider` so the provider holds only shared,
 * reactive game state. The provider derives `isHost` / `hasPlayerRecord`
 * (which it already needs for other state) and passes them in.
 */
export function useGameRoomConnection({
  gameId,
  isSpectator,
  currentUserId,
  userId,
  isHost,
  hasPlayerRecord,
  participantName,
}: Params): GameRoomConnection {
  const myStatus = useQuery(joinRequests.myStatus, { gameId });
  const joinStatus: JoinStatus = myStatus?.status ?? "none";

  const checkOrRequestMutation = useMutation(joinRequests.checkOrRequest);
  const joinPlayerMutation = useMutation(gamePlayers.join);
  const leavePlayerMutation = useMutation(gamePlayers.leave);
  const leaveSpectatorMutation = useMutation(gameSpectators.leave);

  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);

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
    if (isSpectator || hasPlayerRecord || isJoiningGame || joinError) return;
    if (joinStatus !== "accepted") return;

    const ensureSeat = async () => {
      setIsJoiningGame(true);
      setJoinError(null);
      try {
        await joinPlayerMutation({ gameId });
      } catch {
        setJoinError("Unable to join game (Room is full)");
      } finally {
        setIsJoiningGame(false);
      }
    };

    void ensureSeat();
  }, [
    isSpectator,
    hasPlayerRecord,
    isJoiningGame,
    joinError,
    joinStatus,
    joinPlayerMutation,
    gameId,
  ]);

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
    participantName,
  });

  return { room, livekitToken, joinStatus, isJoiningGame, joinError };
}
