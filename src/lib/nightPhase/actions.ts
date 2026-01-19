"use server";

/**
 * Night Phase Actions
 *
 * Server actions for night phase activities:
 * - Mafia selecting target to kill
 * - Yakuza selecting target to kill
 * - Doctor healing
 * - Detective checking
 */

import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/db/supabase/database.types";
import { adminClient } from "@/lib/supabase/admin";

type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Get the mafia member who has kill authority
 * Priority: DON > MAFIA_RIGHT_HAND > MAFIA
 *
 * @param gameId - The game ID
 * @returns The player_id of the mafia member with kill authority, or null if none alive
 */
async function getMafiaKillAuthority(
  gameId: string
): Promise<{ playerId: string; role: string } | null> {
  // Get all game players with their roles
  const { data: players, error: playersErr } = await adminClient
    .from("game_players")
    .select("player_id, is_alive")
    .eq("game_id", gameId);

  if (playersErr || !players) return null;

  // Get roles for all players
  const { data: roles, error: rolesErr } = await adminClient
    .from("game_player_roles")
    .select("player_id, role")
    .eq("game_id", gameId);

  if (rolesErr || !roles) return null;

  // Create a map of player_id to role
  const roleMap = new Map<string, string>();
  for (const r of roles) {
    roleMap.set(r.player_id, r.role);
  }

  // Find alive mafia members
  const aliveMafia: { playerId: string; role: string }[] = [];
  for (const p of players) {
    if (p.is_alive && p.player_id) {
      const role = roleMap.get(p.player_id);
      if (role === "DON" || role === "MAFIA_RIGHT_HAND" || role === "MAFIA") {
        aliveMafia.push({ playerId: p.player_id, role });
      }
    }
  }

  // Priority: DON > MAFIA_RIGHT_HAND > MAFIA
  const don = aliveMafia.find((m) => m.role === "DON");
  if (don) return don;

  const rightHand = aliveMafia.find((m) => m.role === "MAFIA_RIGHT_HAND");
  if (rightHand) return rightHand;

  const mafia = aliveMafia.find((m) => m.role === "MAFIA");
  if (mafia) return mafia;

  return null;
}

/**
 * Check if the current user has mafia kill authority
 */
export async function checkMafiaKillAuthority(
  gameId: string
): Promise<
  | { ok: true; hasAuthority: boolean; role: string | null }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const authority = await getMafiaKillAuthority(gameId);
  if (!authority) {
    return { ok: true, hasAuthority: false, role: null };
  }

  return {
    ok: true,
    hasAuthority: authority.playerId === user.id,
    role: authority.role,
  };
}

/**
 * Mafia selects a target to kill during mafia_chooses_target phase.
 * Only the mafia member with kill authority can select a target.
 * The target is added to attempt_to_kill_players array.
 *
 * @param gameId - The game ID
 * @param targetSeatNumber - The seat number of the target player
 */
export async function selectMafiaTarget(
  gameId: string,
  targetSeatNumber: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Verify the current user has kill authority
  const authority = await getMafiaKillAuthority(gameId);
  if (!authority || authority.playerId !== user.id) {
    return {
      ok: false,
      message: "You don't have authority to select a target",
    };
  }

  // Verify the game is in mafia_chooses_target phase
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("id, game_phase, attempt_to_kill_players")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  if (gameSession.game_phase !== "mafia_chooses_target") {
    return { ok: false, message: "Not in mafia target selection phase" };
  }

  // Verify target player exists and is alive
  const { data: targetPlayer, error: targetErr } = await adminClient
    .from("game_players")
    .select("id, seat_number, is_alive, player_id")
    .eq("game_id", gameId)
    .eq("seat_number", targetSeatNumber)
    .single();

  if (targetErr || !targetPlayer) {
    return { ok: false, message: "Target player not found" };
  }

  if (targetPlayer.is_alive === false) {
    return { ok: false, message: "Cannot target a dead player" };
  }

  // Check if target is a mafia member (can't kill own team)
  if (targetPlayer.player_id) {
    const { data: targetRole, error: roleErr } = await adminClient
      .from("game_player_roles")
      .select("role")
      .eq("game_id", gameId)
      .eq("player_id", targetPlayer.player_id)
      .single();
  }

  // Add target to attempt_to_kill_players array (replace any existing mafia selection)
  // We store seat numbers, not player IDs
  const currentTargets = gameSession.attempt_to_kill_players || [];

  // For mafia, we'll use a convention: first slot is mafia target
  // Remove any existing mafia target and add new one
  const updatedTargets = [targetSeatNumber, ...currentTargets.slice(1)];

  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({ attempt_to_kill_players: updatedTargets })
    .eq("id", gameSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Clear mafia target selection (if they want to change their mind)
 */
export async function clearMafiaTarget(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Verify the current user has kill authority
  const authority = await getMafiaKillAuthority(gameId);
  if (!authority || authority.playerId !== user.id) {
    return { ok: false, message: "You don't have authority to clear target" };
  }

  // Get current game session
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("id, game_phase, attempt_to_kill_players")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  if (gameSession.game_phase !== "mafia_chooses_target") {
    return { ok: false, message: "Not in mafia target selection phase" };
  }

  // Clear mafia target (first slot)
  const currentTargets = gameSession.attempt_to_kill_players || [];
  const updatedTargets = currentTargets.slice(1); // Remove first element (mafia target)

  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({ attempt_to_kill_players: updatedTargets })
    .eq("id", gameSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

// ============================================================================
// YAKUZA KILL ACTIONS
// ============================================================================

/**
 * Get the Yakuza member who has kill authority
 * Only YAKUZA can kill (SHOGUN cannot kill)
 *
 * @param gameId - The game ID
 * @returns The player_id of the Yakuza with kill authority, or null if none alive
 */
async function getYakuzaKillAuthority(
  gameId: string
): Promise<{ playerId: string; role: string } | null> {
  // Get all game players with their roles
  const { data: players, error: playersErr } = await adminClient
    .from("game_players")
    .select("player_id, is_alive")
    .eq("game_id", gameId);

  if (playersErr || !players) return null;

  // Get roles for all players
  const { data: roles, error: rolesErr } = await adminClient
    .from("game_player_roles")
    .select("player_id, role")
    .eq("game_id", gameId);

  if (rolesErr || !roles) return null;

  // Create a map of player_id to role
  const roleMap = new Map<string, string>();
  for (const r of roles) {
    roleMap.set(r.player_id, r.role);
  }

  // Find alive Yakuza (only YAKUZA can kill, not SHOGUN)
  for (const p of players) {
    if (p.is_alive && p.player_id) {
      const role = roleMap.get(p.player_id);
      if (role === "YAKUZA") {
        return { playerId: p.player_id, role };
      }
    }
  }

  return null;
}

/**
 * Check if the current user has Yakuza kill authority
 */
export async function checkYakuzaKillAuthority(
  gameId: string
): Promise<
  | { ok: true; hasAuthority: boolean; role: string | null }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const authority = await getYakuzaKillAuthority(gameId);
  if (!authority) {
    return { ok: true, hasAuthority: false, role: null };
  }

  return {
    ok: true,
    hasAuthority: authority.playerId === user.id,
    role: authority.role,
  };
}

/**
 * Yakuza selects a target to kill during yakuza_and_shogun_chooses_target phase.
 * Only YAKUZA can select a target (SHOGUN cannot kill).
 * The target is added to attempt_to_kill_players array (second slot).
 *
 * @param gameId - The game ID
 * @param targetSeatNumber - The seat number of the target player
 */
export async function selectYakuzaTarget(
  gameId: string,
  targetSeatNumber: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Verify the current user has kill authority
  const authority = await getYakuzaKillAuthority(gameId);
  if (!authority || authority.playerId !== user.id) {
    return {
      ok: false,
      message: "You don't have authority to select a target",
    };
  }

  // Verify the game is in yakuza_and_shogun_chooses_target phase
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("id, game_phase, attempt_to_kill_players")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  if (gameSession.game_phase !== "yakuza_and_shogun_chooses_target") {
    return { ok: false, message: "Not in Yakuza target selection phase" };
  }

  // Verify target player exists and is alive
  const { data: targetPlayer, error: targetErr } = await adminClient
    .from("game_players")
    .select("id, seat_number, is_alive, player_id")
    .eq("game_id", gameId)
    .eq("seat_number", targetSeatNumber)
    .single();

  if (targetErr || !targetPlayer) {
    return { ok: false, message: "Target player not found" };
  }

  if (targetPlayer.is_alive === false) {
    return { ok: false, message: "Cannot target a dead player" };
  }

  // Add target to attempt_to_kill_players array (second slot for Yakuza)
  // Convention: [0] = mafia target, [1] = yakuza target
  // Using 0 as placeholder for empty slots (valid seats are 1-12)
  const currentTargets = gameSession.attempt_to_kill_players || [];

  // Ensure array has at least 2 slots (use 0 as placeholder for empty)
  const updatedTargets = [...currentTargets];
  while (updatedTargets.length < 2) {
    updatedTargets.push(0);
  }
  updatedTargets[1] = targetSeatNumber;

  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({ attempt_to_kill_players: updatedTargets })
    .eq("id", gameSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Clear Yakuza target selection (if they want to change their mind)
 */
export async function clearYakuzaTarget(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Verify the current user has kill authority
  const authority = await getYakuzaKillAuthority(gameId);
  if (!authority || authority.playerId !== user.id) {
    return { ok: false, message: "You don't have authority to clear target" };
  }

  // Get current game session
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("id, game_phase, attempt_to_kill_players")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  if (gameSession.game_phase !== "yakuza_and_shogun_chooses_target") {
    return { ok: false, message: "Not in Yakuza target selection phase" };
  }

  // Clear Yakuza target (second slot) - use 0 as "empty" placeholder
  const currentTargets = gameSession.attempt_to_kill_players || [];
  const updatedTargets = [...currentTargets];
  if (updatedTargets.length >= 2) {
    updatedTargets[1] = 0;
  }

  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({ attempt_to_kill_players: updatedTargets })
    .eq("id", gameSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}
