/**
 * Utility function to filter player roles based on team relationships
 *
 * Teammates can always see each other's roles in the game state.
 * Phase-based visibility (who sees whom at what time) is handled by the UI layer.
 * This ensures teammates always have access to their team's role information.
 */

import { Tables } from "@/db/supabase/database.types";

type GamePlayer = Tables<"game_players">;

interface FilterPlayerRolesParams {
  allPlayers: GamePlayer[];
  requestingUserId: string;
  requestingRole: string | null;
  isHost: boolean;
}

/**
 * Filters player roles based on team relationships
 *
 * Rules:
 * - Always see your own role
 * - Host sees all roles
 * - Mafia family (DON, MAFIA, MAFIA_RIGHT_HAND) see each other
 * - Yakuza team (YAKUZA, SHOGUN) see each other
 * - Everyone else: roles hidden
 *
 * @returns Array of players with roles set to null if not on same team
 */
export function filterPlayerRoles({
  allPlayers,
  requestingUserId,
  requestingRole,
  isHost,
}: FilterPlayerRolesParams): GamePlayer[] {
  return allPlayers.map((player) => {
    const targetRole = player.role as string | null;

    // Determine if requesting user can see this player's role
    let canSeeRole = false;

    // 1. Always see your own role
    if (player.player_id === requestingUserId) {
      canSeeRole = true;
    }
    // 2. Host can always see all roles
    else if (isHost) {
      canSeeRole = true;
    }
    // 3. Mafia family members always see each other
    else if (
      ["DON", "MAFIA", "MAFIA_RIGHT_HAND"].includes(requestingRole || "") &&
      ["DON", "MAFIA", "MAFIA_RIGHT_HAND"].includes(targetRole || "")
    ) {
      canSeeRole = true;
    }
    // 4. Yakuza team members always see each other
    else if (
      ["YAKUZA", "SHOGUN"].includes(requestingRole || "") &&
      ["YAKUZA", "SHOGUN"].includes(targetRole || "")
    ) {
      canSeeRole = true;
    }

    // Return player with role visible or hidden based on team membership
    return {
      ...player,
      role: canSeeRole ? player.role : null,
    };
  });
}
