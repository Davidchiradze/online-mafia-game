"use server";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/db/supabase/database.types";
import { adminClient } from "@/lib/supabase/admin";
import { GAME_PHASES, JAPANESE_MAFIA_ROLES } from "../constants/game";
import { GameSessionState } from "@/types/game/type";
import { buildShuffledSeatAssignments } from "@/lib/game/shuffleSeats";
import { assignPlayerRole } from "@/lib/gamePlayerRoles/actions";

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
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Fetch game, ensure host, get max_players
  const { data: gameRow, error: gameErr } = await supabase
    .from("games")
    .select("id, host_id, max_players, game_status")
    .eq("id", gameId)
    .single<
      Pick<Tables<"games">, "id" | "host_id" | "max_players" | "game_status">
    >();
  if (gameErr || !gameRow) return { ok: false, message: "Game not found" };
  if (gameRow.host_id !== user.id) return { ok: false, message: "Forbidden" };

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

  // Two-pass update to avoid unique constraint violation:
  // 1. First, clear all seats to NULL
  const playerIds = assignments.map((a) => a.playerId);
  const { error: clearSeatsErr } = await adminClient
    .from("game_players")
    .update({ seat_number: null })
    .in("id", playerIds);
  if (clearSeatsErr)
    return {
      ok: false,
      message: clearSeatsErr.message || "Failed to clear seats",
    };

  // 2. Then, assign the new shuffled seat numbers
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
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update(gameSessionState)
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
    }
  | { ok: false; message: string }
> {
  const supabase = await createClient();

  // Get game session state
  const { data: gameSessionState, error: gameSessionStateError } =
    await supabase
      .from("game_sessions")
      .select("*")
      .eq("game_id", gameId)
      .single<GameSessionState>();
  if (gameSessionStateError)
    return { ok: false, message: gameSessionStateError.message };

  return {
    ok: true,
    gameSessionState,
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
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Verify user is the host
  const { data: gameRow, error: gameErr } = await supabase
    .from("games")
    .select("id, host_id, game_type, max_players")
    .eq("id", gameId)
    .single<
      Pick<Tables<"games">, "id" | "host_id" | "game_type" | "max_players">
    >();
  if (gameErr || !gameRow) return { ok: false, message: "Game not found" };
  if (gameRow.host_id !== user.id)
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

  // Assign roles to players (excluding host seat which is max_players + 1)
  const hostSeatNumber = (gameRow.max_players ?? 12) + 1;
  const playersWithSeats = players.filter(
    (p) => p.seat_number !== null && p.seat_number !== hostSeatNumber
  );

  // if (playersWithSeats.length !== shuffledRoles.length) {
  //   return {
  //     ok: false,
  //     message: `Expected ${shuffledRoles.length} players with seats, but found ${playersWithSeats.length}`,
  //   };
  // }

  // Assign roles to players in the secure game_player_roles table
  for (let i = 0; i < playersWithSeats.length; i++) {
    const player = playersWithSeats[i];
    const role = shuffledRoles[i];

    if (!player.player_id) {
      return {
        ok: false,
        message: `Player ${player.id} has no player_id`,
      };
    }

    const result = await assignPlayerRole(gameId, player.player_id, role);
    if (!result.ok) {
      return {
        ok: false,
        message: `Failed to assign role: ${result.message}`,
      };
    }
  }

  return { ok: true };
}
