"use server";

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { Tables } from "@/db/supabase/database.types";

/**
 * Secure server action to get a player's role.
 * Only accessible server-side - never exposed to frontend directly.
 */
export async function getPlayerRole(
  gameId: string,
  playerId: string
): Promise<{ ok: true; role: string | null } | { ok: false; message: string }> {
  const { data: roleData, error } = await adminClient
    .from("game_player_roles")
    .select("role")
    .eq("game_id", gameId)
    .eq("player_id", playerId)
    .maybeSingle<Pick<Tables<"game_player_roles">, "role">>();

  if (error) return { ok: false, message: error.message };
  return { ok: true, role: roleData?.role || null };
}

/**
 * Secure server action to get filtered player roles based on team relationships.
 * Returns roles only for players the requesting user is allowed to see.
 *
 * When game is finished, all roles are visible to everyone.
 */
export async function getFilteredPlayerRoles(
  gameId: string,
  requestingPlayerId: string
): Promise<
  | { ok: true; roles: Array<{ playerId: string; role: string | null }> }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user || user.id !== requestingPlayerId)
    return { ok: false, message: "Not authenticated" };

  // Get game to check if user is host
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single<Pick<Tables<"games">, "host_id">>();

  if (gameError) return { ok: false, message: gameError.message };

  // Check if game session is finished - if so, everyone can see all roles
  const { data: session, error: sessionError } = await adminClient
    .from("game_sessions")
    .select("is_finished")
    .eq("game_id", gameId)
    .maybeSingle<Pick<Tables<"game_sessions">, "is_finished">>();

  if (sessionError) return { ok: false, message: sessionError.message };

  const isGameFinished = Boolean(session?.is_finished);

  // Get requesting user's role
  const { data: requestingRoleData, error: roleError } = await adminClient
    .from("game_player_roles")
    .select("role")
    .eq("game_id", gameId)
    .eq("player_id", requestingPlayerId)
    .maybeSingle<Pick<Tables<"game_player_roles">, "role">>();

  if (roleError) return { ok: false, message: roleError.message };

  const requestingRole = requestingRoleData?.role || null;
  const isHost = game.host_id === requestingPlayerId;

  // Get all roles for the game
  const { data: allRoles, error: allRolesError } = await adminClient
    .from("game_player_roles")
    .select("player_id, role")
    .eq("game_id", gameId);

  if (allRolesError) return { ok: false, message: allRolesError.message };

  // Filter roles based on team relationships (or show all if game is finished)
  const filteredRoles = (allRoles || []).map((roleData) => {
    const targetRole = roleData.role;
    let canSeeRole = false;

    // When game is finished, everyone can see all roles
    if (isGameFinished) {
      canSeeRole = true;
    }
    // 1. Always see your own role
    else if (roleData.player_id === requestingPlayerId) {
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

    return {
      playerId: roleData.player_id,
      role: canSeeRole ? targetRole : null,
    };
  });

  return { ok: true, roles: filteredRoles };
}

/**
 * Secure server action to assign a role to a player.
 * Only accessible server-side.
 */
export async function assignPlayerRole(
  gameId: string,
  playerId: string,
  role: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await adminClient.from("game_player_roles").upsert(
    {
      game_id: gameId,
      player_id: playerId,
      role,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "game_id,player_id",
    }
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Secure server action to get all roles for a game (admin only).
 * Used internally by server actions that need all roles.
 */
export async function getAllPlayerRoles(
  gameId: string
): Promise<
  | { ok: true; roles: Array<{ playerId: string; role: string }> }
  | { ok: false; message: string }
> {
  const { data: roles, error } = await adminClient
    .from("game_player_roles")
    .select("player_id, role")
    .eq("game_id", gameId);

  if (error) return { ok: false, message: error.message };

  return {
    ok: true,
    roles: (roles || []).map((r) => ({ playerId: r.player_id, role: r.role })),
  };
}
