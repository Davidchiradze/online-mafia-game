/**
 * Hook to determine if a participant's video should be visible or covered
 *
 * This hook uses the visibility rules based on game phase and roles to determine
 * whether a participant's video should be shown or hidden behind a cover.
 */

"use client";

import { useMemo } from "react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { canSeeParticipant, getCoverMessage } from "@/lib/game/visibility";
import type { GamePhase, Role } from "@/lib/game/visibility";
import { usePlayerRoles } from "./usePlayerRoles";

interface UseParticipantVisibilityResult {
  /** Whether the participant's video should be visible */
  isVisible: boolean;
  /** Message to show on the cover if not visible */
  coverMessage: string;
  /** The viewer's role */
  viewerRole: Role;
  /** The target participant's role */
  targetRole: Role;
}

/**
 * Determines visibility for a specific participant based on game phase and roles
 *
 * @param trackRef - LiveKit track reference for the target participant
 * @returns Visibility information including whether to show video or cover
 */
export function useParticipantVisibility(
  trackRef: TrackReferenceOrPlaceholder | undefined
): UseParticipantVisibilityResult {
  const {
    gameSessionState,
    userId: viewerUserId,
    gameId,
    hostUserId,
    isHost: isViewerHost,
  } = useGameRoom();

  // Fetch roles securely via server action
  const { viewerRole: fetchedViewerRole, getRoleForUser } = usePlayerRoles(
    gameId || "",
    viewerUserId || ""
  );

  // Extract target participant's identity (userId) from trackRef
  const targetUserId = useMemo(() => {
    return trackRef?.participant?.identity;
  }, [trackRef]);

  // Determine roles and host status
  const viewerRole = useMemo(() => {
    // Get viewer's role from secure role fetching
    // During early phases (game_session_started, picking_roles), role will be null
    return (fetchedViewerRole as Role) || null;
  }, [fetchedViewerRole]);

  const targetRole = useMemo(() => {
    // Get target's role from secure role fetching
    // During early phases (game_session_started, picking_roles), roles will be null
    if (!targetUserId) return null;
    return (getRoleForUser(targetUserId) as Role) || null;
  }, [targetUserId, getRoleForUser]);

  const isTargetHost = useMemo(() => {
    return targetUserId === hostUserId;
  }, [targetUserId, hostUserId]);

  const gamePhase = useMemo(() => {
    return (gameSessionState?.game_phase as GamePhase) || null;
  }, [gameSessionState]);

  // Calculate visibility
  const isVisible = useMemo(() => {
    return canSeeParticipant(
      viewerRole,
      targetRole,
      gamePhase,
      isViewerHost,
      isTargetHost
    );
  }, [viewerRole, targetRole, gamePhase, isViewerHost, isTargetHost]);

  const coverMessage = useMemo(() => {
    return getCoverMessage(gamePhase);
  }, [gamePhase]);

  return {
    isVisible,
    coverMessage,
    viewerRole,
    targetRole,
  };
}
