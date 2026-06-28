/**
 * Hook to determine if a participant's video should be visible or covered
 *
 * This hook uses the visibility rules based on game phase, roles, and alive status
 * to determine whether a participant's video should be shown or hidden behind a cover.
 *
 * Roles are consumed from GameRoomContext (fetched once, not per participant)
 */

"use client";

import { useMemo } from "react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import {
  getVisibilityStateWithDeath,
  VisibilityState,
} from "@/lib/game/visibility";
import type { GamePhase, Role } from "@/lib/game/visibility";

type ConvexGamePlayer = NonNullable<
  ReturnType<typeof useGameRoom>["players"]
>[number];

interface UseParticipantVisibilityResult {
  visibilityState: VisibilityState;
  viewerRole: Role;
  targetRole: Role;
  isTargetDead: boolean;
  isViewerDead: boolean;
}

/**
 * Determines visibility for a specific participant based on game phase, roles, and alive status
 *
 * @param trackRef - LiveKit track reference for the target participant
 * @param targetPlayer - The target player's gamePlayers record (optional, for death state)
 * @returns Visibility information including whether to show video or cover
 */
export function useParticipantVisibility(
  trackRef: TrackReferenceOrPlaceholder | undefined,
  targetPlayer?: ConvexGamePlayer | null
): UseParticipantVisibilityResult {
  const {
    gameSessionState,
    hostUserId,
    isHost,
    userId,
    players,
    viewerRole: fetchedViewerRole,
    getRoleForUser,
    hostVisionEnabled,
  } = useGameRoom();

  // A staff spectator with host-POV reveal on sees video exactly like the host
  // (night phases visible). This only affects visibility math — never the real
  // `isHost`, so no host controls/authority leak to the spectator.
  const isViewerHost = isHost || hostVisionEnabled;

  const targetUserId = useMemo(() => {
    return trackRef?.participant?.identity;
  }, [trackRef]);

  const viewerRole = useMemo(() => {
    return (fetchedViewerRole as Role) || null;
  }, [fetchedViewerRole]);

  const targetRole = useMemo(() => {
    if (!targetUserId) return null;
    return (getRoleForUser(targetUserId) as Role) || null;
  }, [targetUserId, getRoleForUser]);

  const isTargetHost = useMemo(() => {
    return targetUserId === hostUserId;
  }, [targetUserId, hostUserId]);

  const gamePhase = useMemo(() => {
    return (gameSessionState?.gamePhase as GamePhase) || null;
  }, [gameSessionState]);

  const viewerIsAlive = useMemo(() => {
    if (isViewerHost) return true;
    const viewerPlayer = players.find((p) => (p.playerId as string) === userId);
    return viewerPlayer?.isAlive !== false;
  }, [players, userId, isViewerHost]);

  const targetIsAlive = useMemo(() => {
    if (isTargetHost) return true;
    if (targetPlayer) {
      return targetPlayer.isAlive !== false;
    }
    const foundPlayer = players.find((p) => (p.playerId as string) === targetUserId);
    return foundPlayer?.isAlive !== false;
  }, [targetPlayer, players, targetUserId, isTargetHost]);

  const isGameFinished = Boolean(gameSessionState?.isFinished);

  const visibilityState = useMemo(() => {
    return getVisibilityStateWithDeath(
      viewerRole,
      targetRole,
      gamePhase,
      isViewerHost,
      isTargetHost,
      viewerIsAlive,
      targetIsAlive,
      isGameFinished
    );
  }, [viewerRole, targetRole, gamePhase, isViewerHost, isTargetHost, viewerIsAlive, targetIsAlive, isGameFinished]);

  return {
    visibilityState,
    viewerRole,
    targetRole,
    isTargetDead: !targetIsAlive,
    isViewerDead: !viewerIsAlive,
  };
}
