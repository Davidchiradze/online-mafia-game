"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getPlayerRole,
  getFilteredPlayerRoles,
} from "@/lib/gamePlayerRoles/actions";

/**
 * Hook to fetch and cache player roles for a game
 * Roles are fetched securely via server actions
 */
export function usePlayerRoles(gameId: string, userId: string) {
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [filteredRoles, setFilteredRoles] = useState<
    Array<{ userId: string; role: string | null }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!gameId || !userId || gameId === "" || userId === "") {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch viewer's own role
      const viewerRoleResult = await getPlayerRole(gameId, userId);
      if (viewerRoleResult.ok) {
        setViewerRole(viewerRoleResult.role);
      }

      // Fetch filtered roles (roles user is allowed to see)
      const filteredResult = await getFilteredPlayerRoles(gameId, userId);
      if (filteredResult.ok) {
        // Map playerId to userId for frontend consistency
        setFilteredRoles(
          filteredResult.roles.map((r) => ({
            userId: r.playerId,
            role: r.role,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, userId]);

  useEffect(() => {
    // fetchRoles();
  }, [fetchRoles]);

  const getRoleForUser = useCallback(
    (targetUserId: string): string | null => {
      const roleData = filteredRoles.find((r) => r.userId === targetUserId);
      return roleData?.role || null;
    },
    [filteredRoles]
  );

  return {
    viewerRole,
    filteredRoles,
    getRoleForUser,
    isLoading,
    refetch: fetchRoles,
  };
}
