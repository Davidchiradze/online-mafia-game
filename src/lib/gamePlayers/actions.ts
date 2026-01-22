"use server";

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { Tables, TablesInsert } from "@/db/supabase/database.types";

type JoinResult =
  | { ok: true; player: Tables<"game_players">; game: Tables<"games"> }
  | { ok: false; message: string };

type LeaveResult = { ok: true } | { ok: false; message: string };

function isGameStarted(status: Tables<"games">["game_status"] | null) {
  return status === "playing" || status === "finished";
}

/**
 * Ensure the current user has a game_players row with a stable seat assignment.
 * - Seats are allocated from 0..maxPlayers-1 (first available).
 * - Host gets a row without occupying a seat.
 * - Rejects when all seats are taken.
 */
export async function joinGamePlayer(gameId: string): Promise<JoinResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };
  const userId = user.id;

  const { data: gameRow, error: gameErr } = await adminClient
    .from("games")
    .select("id, host_id, max_players, game_status, current_players")
    .eq("id", gameId)
    .single<Tables<"games">>();
  if (gameErr || !gameRow)
    return { ok: false, message: gameErr?.message || "Game not found" };

  const { data: players, error: playersErr } = await adminClient
    .from("game_players")
    .select("*")
    .eq("game_id", gameId)
    .order("seat_number", { ascending: true });
  if (playersErr) return { ok: false, message: playersErr.message };

  const existingForUser = (players || []).find((p) => p.player_id === userId);
  if (existingForUser) {
    const { error: updateErr } = await adminClient
      .from("game_players")
      .update({ state: "joined" })
      .eq("game_id", gameId)
      .eq("player_id", userId);
    if (updateErr) return { ok: false, message: updateErr.message };

    return { ok: true, player: existingForUser, game: gameRow };
  }

  const isHost = gameRow.host_id === userId;
  const maxSeats = Number(gameRow.max_players ?? 0) || 12;

  const usedSeats = new Set<number>();
  for (const p of players || []) {
    if (p.seat_number === null || p.seat_number === undefined) continue;
    const seatValue = Number(p.seat_number);
    if (Number.isInteger(seatValue) && seatValue >= 1) {
      usedSeats.add(seatValue);
    }
  }

  // Host claims a sentinel seat beyond player range; others take first free 1..maxSeats
  const seatIndex = isHost
    ? maxSeats + 1
    : isGameStarted(gameRow.game_status)
    ? null
    : (() => {
        for (let i = 1; i <= maxSeats; i++) {
          if (!usedSeats.has(i)) return i;
        }
        return null;
      })();

  if (!isHost && seatIndex === null)
    return { ok: false, message: "Room is full" };

  const insertPayload: TablesInsert<"game_players"> = {
    game_id: gameId,
    player_id: userId,
    seat_number: seatIndex,
    is_alive: true,
    joined_at: new Date().toISOString(),
    // Roles are stored in game_player_roles table, not here
    state: "joined",
  };

  const { data: inserted, error: insertErr } = await adminClient
    .from("game_players")
    .insert(insertPayload)
    .select("*")
    .single<Tables<"game_players">>();
  if (insertErr || !inserted)
    return {
      ok: false,
      message: insertErr?.message || "Unable to join game",
    };

  const nextPlayerCount = (players?.length || 0) + 1;
  const { data: updatedGame, error: updateErr } = await adminClient
    .from("games")
    .update({
      current_players: nextPlayerCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .select("*")
    .single<Tables<"games">>();
  if (updateErr)
    return { ok: false, message: updateErr.message || "Failed to update game" };

  return { ok: true, player: inserted, game: updatedGame || gameRow };
}

/**
 * Admin version: Handle player leaving a game by userId.
 * - If the game has not started, the game_players row is deleted.
 * - If the game is in progress/finished, the row is left intact for reconnection.
 * Used by webhooks and server-side operations where userId is known.
 */
async function leaveGamePlayerByUserId(
  gameId: string,
  userId: string
): Promise<LeaveResult> {
  const { data: gameRow, error: gameErr } = await adminClient
    .from("games")
    .select("id, game_status")
    .eq("id", gameId)
    .single<Pick<Tables<"games">, "id" | "game_status">>();
  if (gameErr || !gameRow)
    return { ok: false, message: gameErr?.message || "Game not found" };

  if (!isGameStarted(gameRow.game_status)) {
    const { error: deleteErr } = await adminClient
      .from("game_players")
      .delete()
      .eq("game_id", gameId)
      .eq("player_id", userId);
    if (deleteErr)
      return {
        ok: false,
        message: deleteErr.message || "Unable to leave game",
      };

    const { count } = await adminClient
      .from("game_players")
      .select("id", { head: true, count: "exact" })
      .eq("game_id", gameId);

    const { error: updateErr } = await adminClient
      .from("games")
      .update({
        current_players: count ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);
    if (updateErr) return { ok: false, message: updateErr.message };
  } else {
    const { error: updateStateErr } = await adminClient
      .from("game_players")
      .update({ state: "disconnected" })
      .eq("game_id", gameId)
      .eq("player_id", userId);
    if (updateStateErr) return { ok: false, message: updateStateErr.message };
  }

  return { ok: true };
}

/**
 * Handle player leaving a game.
 * - If the game has not started, the game_players row is deleted.
 * - If the game is in progress/finished, the row is left intact for reconnection.
 */
export async function leaveGamePlayer(gameId: string): Promise<LeaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };
  const userId = user.id;

  return leaveGamePlayerByUserId(gameId, userId);
}

/**
 * Admin function to leave a game player by userId.
 * Exported for use in webhooks and server-side operations.
 */
export async function leaveGamePlayerAdmin(
  gameId: string,
  userId: string
): Promise<LeaveResult> {
  return leaveGamePlayerByUserId(gameId, userId);
}

type KillResult = { ok: true } | { ok: false; message: string };

/**
 * Kill a player in the game (host-only action).
 * Sets is_alive to false for the target player.
 * Death is permanent and persists across reconnects.
 *
 * @param gameId - The game ID
 * @param targetPlayerId - The player ID of the player to kill
 */
export async function killPlayer(
  gameId: string,
  targetPlayerId: string
): Promise<KillResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Verify caller is the host
  const { data: gameRow, error: gameErr } = await adminClient
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single<Pick<Tables<"games">, "host_id">>();

  if (gameErr || !gameRow) {
    return { ok: false, message: gameErr?.message || "Game not found" };
  }

  if (gameRow.host_id !== user.id) {
    return { ok: false, message: "Forbidden: Only host can kill players" };
  }

  // Verify target player exists and is alive
  const { data: targetPlayer, error: targetErr } = await adminClient
    .from("game_players")
    .select("id, is_alive")
    .eq("game_id", gameId)
    .eq("player_id", targetPlayerId)
    .single<Pick<Tables<"game_players">, "id" | "is_alive">>();

  if (targetErr || !targetPlayer) {
    return { ok: false, message: "Player not found in this game" };
  }

  if (targetPlayer.is_alive === false) {
    return { ok: false, message: "Player is already dead" };
  }

  // Update player to dead
  const { error: updateErr } = await adminClient
    .from("game_players")
    .update({ is_alive: false })
    .eq("id", targetPlayer.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}
