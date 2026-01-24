"use server";

/**
 * Night Phase Actions
 *
 * Server actions for night phase activities:
 * - Mafia selecting target to kill
 * - Yakuza selecting target to kill
 * - Doctor healing
 * - Detective checking
 *
 * All night actions are stored in night_phase_sessions table (one row per night).
 * This prevents players from seeing sensitive data through real-time subscriptions.
 * Only the host can read night_phase_sessions due to RLS policy.
 */

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

type ActionResult = { ok: true } | { ok: false; message: string };

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the current night number from game_sessions
 */
async function getCurrentNightNumber(gameId: string): Promise<number | null> {
  const { data, error } = await adminClient
    .from("game_sessions")
    .select("current_night_number")
    .eq("game_id", gameId)
    .single();

  if (error || !data) return null;
  return data.current_night_number;
}

/**
 * Get or create the night_phase_sessions row for the current night.
 * Creates a new row if one doesn't exist for the current night.
 */
async function getOrCreateNightPhaseSession(
  gameId: string,
  nightNumber: number
): Promise<{ id: string } | null> {
  // Try to get existing row
  const { data: existing } = await adminClient
    .from("night_phase_sessions")
    .select("id")
    .eq("game_id", gameId)
    .eq("night_number", nightNumber)
    .single();

  if (existing) return existing;

  // Create new row
  const { data: created, error } = await adminClient
    .from("night_phase_sessions")
    .insert({
      game_id: gameId,
      night_number: nightNumber,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create night phase session:", error);
    return null;
  }

  return created;
}

/**
 * Get the current night phase session (latest night)
 */
async function getCurrentNightPhaseSession(gameId: string) {
  const nightNumber = await getCurrentNightNumber(gameId);
  if (nightNumber === null || nightNumber === 0) return null;

  const { data } = await adminClient
    .from("night_phase_sessions")
    .select("*")
    .eq("game_id", gameId)
    .eq("night_number", nightNumber)
    .single();

  return data;
}

/**
 * Get all healed players across all nights for this game (for "heal once per game" rule)
 */
async function getAllHealedPlayers(gameId: string): Promise<number[]> {
  const { data } = await adminClient
    .from("night_phase_sessions")
    .select("healed_player")
    .eq("game_id", gameId);

  if (!data) return [];

  return data
    .map((row) => row.healed_player)
    .filter((p): p is number => p !== null);
}

// ============================================================================
// MAFIA KILL ACTIONS
// ============================================================================

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
 * The target is stored in night_phase_sessions.mafia_target.
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
    .select("id, game_phase, current_night_number")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  if (gameSession.game_phase !== "mafia_chooses_target") {
    return { ok: false, message: "Not in mafia target selection phase" };
  }

  const nightNumber = gameSession.current_night_number;
  if (!nightNumber || nightNumber === 0) {
    return { ok: false, message: "No active night" };
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

  // Get or create night phase session for current night
  const nightSession = await getOrCreateNightPhaseSession(gameId, nightNumber);
  if (!nightSession) {
    return { ok: false, message: "Failed to get/create night phase session" };
  }

  // Check if a target has already been selected (cannot change decision)
  const existingSession = await getCurrentNightPhaseSession(gameId);
  if (existingSession?.mafia_target !== null) {
    return {
      ok: false,
      message: "Target already selected - cannot change decision",
    };
  }

  // Update mafia_target in night_phase_sessions
  const { error: updateErr } = await adminClient
    .from("night_phase_sessions")
    .update({
      mafia_target: targetSeatNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", nightSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Clear mafia target selection - DISABLED (cannot change decision once made)
 * @deprecated Target selection cannot be changed once made
 */
export async function clearMafiaTarget(gameId: string): Promise<ActionResult> {
  // Disable clearing - decisions are final
  void gameId; // suppress unused variable warning
  return { ok: false, message: "Cannot change target once selected" };
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
 * The target is stored in night_phase_sessions.yakuza_target.
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
    .select("id, game_phase, current_night_number")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  if (gameSession.game_phase !== "yakuza_and_shogun_chooses_target") {
    return { ok: false, message: "Not in Yakuza target selection phase" };
  }

  const nightNumber = gameSession.current_night_number;
  if (!nightNumber || nightNumber === 0) {
    return { ok: false, message: "No active night" };
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

  // Get or create night phase session for current night
  const nightSession = await getOrCreateNightPhaseSession(gameId, nightNumber);
  if (!nightSession) {
    return { ok: false, message: "Failed to get/create night phase session" };
  }

  // Check if a target has already been selected (cannot change decision)
  const existingSession = await getCurrentNightPhaseSession(gameId);
  if (existingSession?.yakuza_target !== null) {
    return {
      ok: false,
      message: "Target already selected - cannot change decision",
    };
  }

  // Update yakuza_target in night_phase_sessions
  const { error: updateErr } = await adminClient
    .from("night_phase_sessions")
    .update({
      yakuza_target: targetSeatNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", nightSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Clear Yakuza target selection - DISABLED (cannot change decision once made)
 * @deprecated Target selection cannot be changed once made
 */
export async function clearYakuzaTarget(gameId: string): Promise<ActionResult> {
  // Disable clearing - decisions are final
  void gameId; // suppress unused variable warning
  return { ok: false, message: "Cannot change target once selected" };
}

// ============================================================================
// DOCTOR HEAL ACTIONS
// ============================================================================

/**
 * Get the Doctor who has heal authority
 *
 * @param gameId - The game ID
 * @returns The player_id of the Doctor if alive, or null
 */
async function getDoctorHealAuthority(
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

  // Find alive Doctor
  for (const p of players) {
    if (p.is_alive && p.player_id) {
      const role = roleMap.get(p.player_id);
      if (role === "DOCTOR") {
        return { playerId: p.player_id, role };
      }
    }
  }

  return null;
}

/**
 * Check if the current user has Doctor heal authority
 * Also returns which players have already been healed (cannot heal again)
 */
export async function checkDoctorHealAuthority(gameId: string): Promise<
  | {
      ok: true;
      hasAuthority: boolean;
      role: string | null;
      healedPlayers: number[];
    }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const authority = await getDoctorHealAuthority(gameId);

  // Get all healed players from all nights (for "heal once per game" rule)
  const healedPlayers = await getAllHealedPlayers(gameId);

  if (!authority) {
    return { ok: true, hasAuthority: false, role: null, healedPlayers };
  }

  return {
    ok: true,
    hasAuthority: authority.playerId === user.id,
    role: authority.role,
    healedPlayers,
  };
}

/**
 * Doctor heals a player during doctor_heals_player phase.
 * - Doctor can only heal each player ONCE per game
 * - Healed player is stored in night_phase_sessions.healed_player
 *
 * @param gameId - The game ID
 * @param targetSeatNumber - The seat number of the target player to heal
 */
export async function healPlayer(
  gameId: string,
  targetSeatNumber: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Verify the current user has heal authority
  const authority = await getDoctorHealAuthority(gameId);
  if (!authority || authority.playerId !== user.id) {
    return {
      ok: false,
      message: "You don't have authority to heal",
    };
  }

  // Verify the game is in doctor_heals_player phase
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("id, game_phase, current_night_number")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  if (gameSession.game_phase !== "doctor_heals_player") {
    return { ok: false, message: "Not in doctor heal phase" };
  }

  const nightNumber = gameSession.current_night_number;
  if (!nightNumber || nightNumber === 0) {
    return { ok: false, message: "No active night" };
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
    return { ok: false, message: "Cannot heal a dead player" };
  }

  // Check if this player has already been healed (can only heal each player once per game)
  const healedPlayers = await getAllHealedPlayers(gameId);
  if (healedPlayers.includes(targetSeatNumber)) {
    return {
      ok: false,
      message: "This player has already been healed once this game",
    };
  }

  // Get or create night phase session for current night
  const nightSession = await getOrCreateNightPhaseSession(gameId, nightNumber);
  if (!nightSession) {
    return { ok: false, message: "Failed to get/create night phase session" };
  }

  // Check if a heal has already been selected this night (cannot change decision)
  const existingSession = await getCurrentNightPhaseSession(gameId);
  if (existingSession?.healed_player !== null) {
    return {
      ok: false,
      message: "Heal already selected - cannot change decision",
    };
  }

  // Update healed_player in night_phase_sessions
  const { error: updateErr } = await adminClient
    .from("night_phase_sessions")
    .update({
      healed_player: targetSeatNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", nightSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Clear Doctor's heal selection - DISABLED (cannot change decision once made)
 * @deprecated Heal selection cannot be changed once made
 */
export async function clearDoctorHeal(
  gameId: string,
  targetSeatNumber: number
): Promise<ActionResult> {
  // Disable clearing - decisions are final
  void gameId; // suppress unused variable warning
  void targetSeatNumber; // suppress unused variable warning
  return { ok: false, message: "Cannot change heal once selected" };
}

// ============================================================================
// NIGHT PHASE MANAGEMENT
// ============================================================================

/**
 * Start a new night - increments night number and creates night_phase_sessions row.
 * Called when transitioning to night phase.
 */
export async function startNight(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Verify user is the host
  const { data: game } = await adminClient
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single();

  if (!game || game.host_id !== user.id) {
    return { ok: false, message: "Only the host can start a night" };
  }

  // Get current night number
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("id, current_night_number")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  const newNightNumber = (gameSession.current_night_number || 0) + 1;

  // Update game_sessions with new night number
  const { error: updateSessionErr } = await adminClient
    .from("game_sessions")
    .update({
      nominated_players: [],
      speaking_order: [],
      current_speaker_index: null,
      speaker_started_at: null,
      current_night_number: newNightNumber,
      foul_elimination_occurred: false,
    })
    .eq("id", gameSession.id);

  if (updateSessionErr) {
    return { ok: false, message: updateSessionErr.message };
  }

  // Create new night_phase_sessions row
  const nightSession = await getOrCreateNightPhaseSession(
    gameId,
    newNightNumber
  );
  if (!nightSession) {
    return { ok: false, message: "Failed to create night phase session" };
  }

  return { ok: true };
}

/**
 * Get the current night phase session data (for host only - RLS enforced)
 */
export async function getNightPhaseSession(gameId: string): Promise<
  | {
      ok: true;
      data: {
        nightNumber: number;
        mafiaTarget: number | null;
        yakuzaTarget: number | null;
        healedPlayer: number | null;
      } | null;
    }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const nightSession = await getCurrentNightPhaseSession(gameId);
  if (!nightSession) {
    return { ok: true, data: null };
  }

  return {
    ok: true,
    data: {
      nightNumber: nightSession.night_number,
      mafiaTarget: nightSession.mafia_target,
      yakuzaTarget: nightSession.yakuza_target,
      healedPlayer: nightSession.healed_player,
    },
  };
}

/**
 * Fetch the current (latest) night phase session for a game.
 * Returns the full session row for the host's real-time UI updates.
 *
 * @param gameId - The game ID
 * @returns The latest night phase session or null if none exists
 */
export async function fetchCurrentNightSession(
  gameId: string
): Promise<
  | { ok: true; data: Awaited<ReturnType<typeof getCurrentNightPhaseSession>> }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const data = await getCurrentNightPhaseSession(gameId);
  return { ok: true, data };
}
