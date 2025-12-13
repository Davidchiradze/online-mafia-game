"use server";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/db/supabase/database.types";
import { adminClient } from "@/lib/supabase/admin";
import { GAME_PHASES, JAPANESE_MAFIA_ROLES } from "../constants/game";
import { GameSessionState } from "@/types/game/type";
import { filterPlayerRoles } from "@/lib/utils/filterPlayerRoles";
import { buildShuffledSeatAssignments } from "@/lib/game/shuffleSeats";

// **
//  * Starts a game:
//  * - Ensures caller is host
//  * - Requires players to have DB-backed seats (assigned at join time)
//  * - Sets games.game_status = 'playing'
//  */
export async function startGame(
  gameId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.user)
    return { ok: false, message: "Not authenticated" };

  // Fetch game, ensure host, get max_players
  const { data: gameRow, error: gameErr } = await supabase
    .from("games")
    .select("id, host_id, max_players, game_status")
    .eq("id", gameId)
    .single<
      Pick<Tables<"games">, "id" | "host_id" | "max_players" | "game_status">
    >();
  if (gameErr || !gameRow) return { ok: false, message: "Game not found" };
  if (gameRow.host_id !== session.user.id)
    return { ok: false, message: "Forbidden" };

  // Ensure players exist with seats (assigned during join)
  const { data: players, error: playersErr } = await adminClient
    .from("game_players")
    .select("id, player_id, seat_number")
    .eq("game_id", gameId);
  if (playersErr) return { ok: false, message: playersErr.message };
  if (!players || players.length === 0)
    return { ok: false, message: "No players joined" };

  // Shuffle seat_number for all non-host seats (keep host sentinel if present)
  const maxSeats = Number(gameRow.max_players ?? 0) || 12;
  const assignments = buildShuffledSeatAssignments(players, maxSeats);
  for (const { playerId, newSeat } of assignments) {
    const { error: updateSeatErr } = await adminClient
      .from("game_players")
      .update({ seat_number: newSeat })
      .eq("id", playerId);
    if (updateSeatErr)
      return {
        ok: false,
        message: updateSeatErr.message || "Seat shuffle failed",
      };
  }

  // Set game status to playing
  const { error: updateErr } = await adminClient
    .from("games")
    .update({ game_status: "playing" })
    .eq("id", gameId);
  if (updateErr) return { ok: false, message: updateErr.message };

  return { ok: true };
}

export async function createGameSession(
  gameId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: createErr } = await adminClient
    .from("game_sessions")
    .insert({ game_id: gameId, game_phase: GAME_PHASES[0] });
  if (createErr) return { ok: false, message: createErr.message };
  return { ok: true };
}

export async function updateGameSession(
  gameSessionId: string,
  gameSessionState: GameSessionState
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { playerData, allPlayers, ...rest } = gameSessionState;
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update(rest)
    .eq("id", gameSessionId);
  if (updateErr) return { ok: false, message: updateErr.message };
  return { ok: true };
}

export async function getGameSession(
  gameId: string,
  userId: string
): Promise<
  | {
      ok: true;
      gameSessionState: GameSessionState;
      playerData: Tables<"game_players">;
      allPlayers: Tables<"game_players">[];
    }
  | { ok: false; message: string }
> {
  const supabase = await createClient();

  // Get game to find host
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single();

  if (gameError) return { ok: false, message: gameError.message };

  // Get game session state
  const { data: gameSessionState, error: gameSessionStateError } =
    await supabase
      .from("game_sessions")
      .select("*")
      .eq("game_id", gameId)
      .single<GameSessionState>();

  if (gameSessionStateError)
    return { ok: false, message: gameSessionStateError.message };

  // Get current user's player data
  const { data: playerData, error: playerDataError } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", gameId)
    .eq("player_id", userId)
    .single();

  if (playerDataError) return { ok: false, message: playerDataError.message };

  // Get all players for the game
  const { data: allPlayers, error: allPlayersError } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", gameId);

  if (allPlayersError) return { ok: false, message: allPlayersError.message };

  // 🔒 SECURITY: Filter roles based on team relationships
  // Teammates always have access to each other's roles in the state
  // Phase-based visibility (video/UI) is handled separately
  const filteredPlayers = filterPlayerRoles({
    allPlayers: allPlayers || [],
    requestingUserId: userId,
    requestingRole: playerData.role as string | null,
    isHost: game.host_id === userId,
  });

  return {
    ok: true,
    gameSessionState,
    playerData,
    allPlayers: filteredPlayers,
  };
}

/**
 * Assigns random roles to all players in the game
 * For 12 players (Japanese Mafia):
 * - 1 Don
 * - 3 Mafia
 * - 1 Don's Right Hand (assigned by Don later)
 * - 1 Shogun
 * - 2 Yakuza
 * - 1 Detective
 * - 2 Citizens
 * - 1 Doctor
 */
export async function assignRandomRoles(
  gameId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.user)
    return { ok: false, message: "Not authenticated" };

  // Verify user is the host
  const { data: gameRow, error: gameErr } = await supabase
    .from("games")
    .select("id, host_id, game_type")
    .eq("id", gameId)
    .single<Pick<Tables<"games">, "id" | "host_id" | "game_type">>();
  if (gameErr || !gameRow) return { ok: false, message: "Game not found" };
  if (gameRow.host_id !== session.user.id)
    return { ok: false, message: "Forbidden: Only host can assign roles" };

  // Get all players
  const { data: players, error: playersErr } = await adminClient
    .from("game_players")
    .select("*")
    .eq("game_id", gameId)
    .order("seat_number", { ascending: true });

  if (playersErr) return { ok: false, message: playersErr.message };
  if (!players || players.length === 0)
    return { ok: false, message: "No players found" };

  // Define role distribution for 12 players (Japanese Mafia)
  const roleDistribution: (typeof JAPANESE_MAFIA_ROLES)[number][] = [
    "DON",
    "MAFIA",
    "MAFIA_RIGHT_HAND",
    "SHOGUN",
    "YAKUZA",
    "DETECTIVE",
    "DOCTOR",
    "CITIZEN",
    "CITIZEN",
    "CITIZEN",
    "CITIZEN",
    "CITIZEN",
    // 12th player is the host
  ];

  // Shuffle the roles
  const shuffledRoles = [...roleDistribution].sort(() => Math.random() - 0.5);

  // Assign roles to players (excluding host if they don't have a seat)
  const playersWithSeats = players.filter((p) => p.seat_number !== null);

  if (playersWithSeats.length !== shuffledRoles.length) {
    return {
      ok: false,
      message: `Expected ${shuffledRoles.length} players with seats, but found ${playersWithSeats.length}`,
    };
  }

  // Update each player with their assigned role
  for (let i = 0; i < playersWithSeats.length; i++) {
    const player = playersWithSeats[i];
    const role = shuffledRoles[i];

    const { error: updateErr } = await adminClient
      .from("game_players")
      .update({ role })
      .eq("id", player.id);

    if (updateErr) {
      return {
        ok: false,
        message: `Failed to assign role: ${updateErr.message}`,
      };
    }
  }

  return { ok: true };
}
