"use client";

import { useEffect, useState, useCallback } from "react";
import { getFilteredPlayerRoles } from "@/lib/gamePlayerRoles/actions";
import { usePlayerRolesListener } from "./usePlayerRolesListener";
import type { PlayerRolesMap } from "@/types/game/type";

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
 */
export function usePlayerRoles(
  gameId: string,
  userId: string,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [playerRolesMap, setPlayerRolesMap] = useState<PlayerRolesMap>(
    new Map()
  );
  console.log("🚀 ~ usePlayerRoles ~ playerRolesMap:", playerRolesMap);
  const [isLoading, setIsLoading] = useState(false);

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

  // Subscribe to role changes and refetch when they occur
  usePlayerRolesListener(gameId, fetchRoles, enabled);

  // Initial fetch
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

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
