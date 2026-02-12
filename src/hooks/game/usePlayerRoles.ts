"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getFilteredPlayerRoles } from "@/lib/gamePlayerRoles/actions";
import type { PlayerRolesMap } from "@/types/game/type";

/** Phases that require roles to be fetched/refetched */
const PHASES_REQUIRING_ROLES = [
  "mafia_meet",
  "don_chooses_right_hand",
  "yakuda_shogun_meet",
  "detective_meet",
  "doctor_meet",
  "mafia_chooses_target",
  "don_checks_for_detective",
  "right_hand_checks_for_yakuza",
  "yakuza_and_shogun_chooses_target",
  "detective_checks_for_mafia",
  "doctor_heals_player",
] as const;

/**
 * Hook to fetch and manage player roles for a game
 * Should be called ONCE at the GameRoomContext level, not per participant
 *
 * Roles are fetched securely via server actions with teammate filtering:
 * - Current user always sees their own role
 * - Mafia team members (DON, MAFIA, MAFIA_RIGHT_HAND) see each other's roles
 * - Yakuza team members (YAKUZA, SHOGUN) see each other's roles
 * - Host can see all roles
 * - Others see roles as null
 *
 * Auto-refetches when:
 * - Game phase changes to a phase requiring roles
 * - Game is finished (reveal phase - everyone sees all roles)
 */
export function usePlayerRoles(
  gameId: string,
  userId: string,
  options?: {
    enabled?: boolean;
    /** Current game phase - triggers refetch for role-dependent phases */
    gamePhase?: string | null;
    /** Whether the game is finished - triggers refetch for role reveal */
    isGameFinished?: boolean;
  }
) {
  const enabled = options?.enabled ?? true;
  const gamePhase = options?.gamePhase ?? null;
  const isGameFinished = options?.isGameFinished ?? false;

  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [playerRolesMap, setPlayerRolesMap] = useState<PlayerRolesMap>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);

  // Track if we've already refetched for finished state
  const hasRefetchedForFinished = useRef(false);

  const fetchRoles = useCallback(async () => {
    if (!gameId || !userId || gameId === "" || userId === "" || !enabled) {
      return;
    }

    setIsLoading(true);
    try {
      // Fetch filtered roles (roles user is allowed to see based on team relationships)
      const filteredResult = await getFilteredPlayerRoles(gameId, userId);
      if (filteredResult.ok) {
        const rolesMap = new Map<string, string | null>();
        let userRole: string | null = null;

        for (const r of filteredResult.roles) {
          rolesMap.set(r.playerId, r.role);
          // Extract viewer's own role
          if (r.playerId === userId) {
            userRole = r.role;
          }
        }

        setPlayerRolesMap(rolesMap);
        setViewerRole(userRole);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, userId, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Refetch roles when phase changes to phases that require roles
  useEffect(() => {
    if (!gamePhase || !enabled) return;
    if (PHASES_REQUIRING_ROLES.includes(gamePhase as (typeof PHASES_REQUIRING_ROLES)[number])) {
      void fetchRoles();
    }
  }, [gamePhase, enabled, fetchRoles]);

  // Refetch roles when game is finished - everyone can now see all roles
  useEffect(() => {
    if (isGameFinished && !hasRefetchedForFinished.current && enabled) {
      hasRefetchedForFinished.current = true;
      void fetchRoles();
    }
    // Reset the ref when game is no longer finished (new game)
    if (!isGameFinished) {
      hasRefetchedForFinished.current = false;
    }
  }, [isGameFinished, enabled, fetchRoles]);

  /**
   * Get the role for a specific user
   * Returns null if the current user is not allowed to see that player's role
   */
  const getRoleForUser = useCallback(
    (targetUserId: string): string | null => {
      return playerRolesMap.get(targetUserId) ?? null;
    },
    [playerRolesMap]
  );

  return {
    /** Current user's role */
    viewerRole,
    /** Map of all player roles (filtered based on team visibility) */
    playerRolesMap,
    /** Get role for a specific player */
    getRoleForUser,
    /** Whether roles are currently loading */
    isLoading,
    /** Manually refetch roles */
    refetch: fetchRoles,
  };
}

