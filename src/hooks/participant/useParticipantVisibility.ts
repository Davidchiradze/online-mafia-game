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
  canSeeParticipant,
  getCoverMessage,
  getVisibilityStateWithDeath,
  VisibilityState,
} from "@/lib/game/visibility";
import type { GamePhase, Role } from "@/lib/game/visibility";
import type { Tables } from "@/db/supabase/database.types";

interface UseParticipantVisibilityResult {
  /** Whether the participant's video should be visible */
  isVisible: boolean;
  /** Visibility state: "visible", "dimmed", "covered", or "dead" */
  visibilityState: VisibilityState;
  /** Message to show on the cover if not visible */
  coverMessage: string;
  /** The viewer's role */
  viewerRole: Role;
  /** The target participant's role */
  targetRole: Role;
  /** Whether the target player is dead */
  isTargetDead: boolean;
  /** Whether the viewer is dead */
  isViewerDead: boolean;
}

/**
 * Determines visibility for a specific participant based on game phase, roles, and alive status
 *
 * @param trackRef - LiveKit track reference for the target participant
 * @param targetPlayer - The target player's game_players record (optional, for death state)
 * @returns Visibility information including whether to show video or cover
 */
export function useParticipantVisibility(
  trackRef: TrackReferenceOrPlaceholder | undefined,
  targetPlayer?: Tables<"game_players"> | null
): UseParticipantVisibilityResult {
  const {
    gameSessionState,
    hostUserId,
    isHost: isViewerHost,
    userId,
    players,
    // Get roles from context (fetched once at context level)
    viewerRole: fetchedViewerRole,
    getRoleForUser,
  } = useGameRoom();

  // Extract target participant's identity (userId) from trackRef
  const targetUserId = useMemo(() => {
    return trackRef?.participant?.identity;
  }, [trackRef]);

  // Determine roles and host status
  const viewerRole = useMemo(() => {
    // Get viewer's role from context
    // During early phases (game_session_started, picking_roles), role will be null
    return (fetchedViewerRole as Role) || null;
  }, [fetchedViewerRole]);

  const targetRole = useMemo(() => {
    // Get target's role from context (filtered by team visibility)
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

  // Determine alive status for viewer and target
  const viewerIsAlive = useMemo(() => {
    if (isViewerHost) return true; // Host is always considered "alive"
    const viewerPlayer = players.find((p) => p.player_id === userId);
    return viewerPlayer?.is_alive !== false;
  }, [players, userId, isViewerHost]);

  const targetIsAlive = useMemo(() => {
    if (isTargetHost) return true; // Host is always considered "alive"
    // Use passed player prop if available, otherwise look up from players array
    if (targetPlayer) {
      return targetPlayer.is_alive !== false;
    }
    const foundPlayer = players.find((p) => p.player_id === targetUserId);
    return foundPlayer?.is_alive !== false;
  }, [targetPlayer, players, targetUserId, isTargetHost]);

  // Calculate visibility state (visible, dimmed, covered, or dead)
  const visibilityState = useMemo(() => {
    return getVisibilityStateWithDeath(
      viewerRole,
      targetRole,
      gamePhase,
      isViewerHost,
      isTargetHost,
      viewerIsAlive,
      targetIsAlive
    );
  }, [viewerRole, targetRole, gamePhase, isViewerHost, isTargetHost, viewerIsAlive, targetIsAlive]);

  // Calculate basic visibility (for backwards compatibility)
  const isVisible = useMemo(() => {
    // If dead, not visible in the traditional sense
    if (visibilityState === VisibilityState.DEAD) return false;
    return canSeeParticipant(
      viewerRole,
      targetRole,
      gamePhase,
      isViewerHost,
      isTargetHost
    );
  }, [viewerRole, targetRole, gamePhase, isViewerHost, isTargetHost, visibilityState]);

  const coverMessage = useMemo(() => {
    return getCoverMessage(gamePhase);
  }, [gamePhase]);

  return {
    isVisible,
    visibilityState,
    coverMessage,
    viewerRole,
    targetRole,
    isTargetDead: !targetIsAlive,
    isViewerDead: !viewerIsAlive,
  };
}

