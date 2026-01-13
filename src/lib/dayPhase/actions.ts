"use server";

/**
 * Day Phase Speaking Server Actions
 *
 * Simple logic:
 * - current_speaker_index = null → not started
 * - current_speaker_index = valid seat (1+) → in progress
 * - current_speaker_index = -1 → completed (marker value)
 */

import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/db/supabase/database.types";
import { adminClient } from "@/lib/supabase/admin";
import { computeSpeakingOrder, getNextSpeaker } from "@/lib/game/speakingOrder";
import type { GameSessionState } from "@/types/game/type";

type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Verify the caller is the host of the game.
 */
async function verifyHost(
  gameId: string,
  userId: string
): Promise<
  { ok: true; game: Tables<"games"> } | { ok: false; message: string }
> {
  const { data: gameRow, error: gameErr } = await adminClient
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single<Tables<"games">>();

  if (gameErr || !gameRow) {
    return { ok: false, message: "Game not found" };
  }

  if (gameRow.host_id !== userId) {
    return {
      ok: false,
      message: "Forbidden: Only host can perform this action",
    };
  }

  return { ok: true, game: gameRow };
}

/**
 * Starts the speaking round.
 * Computes speaking order based on alive players and previous opener.
 */
export async function startDayPhaseSpeaking(
  gameId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  const maxSeats = Number(hostCheck.game.max_players ?? 12);

  // Get current game session
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  const session = gameSession as unknown as GameSessionState;

  // Get all alive players
  const { data: players, error: playersErr } = await adminClient
    .from("game_players")
    .select("seat_number, is_alive, player_id")
    .eq("game_id", gameId)
    .order("seat_number", { ascending: true });

  if (playersErr || !players) {
    return { ok: false, message: "Failed to fetch players" };
  }

  // Filter out host (seat > maxSeats)
  const gamePlayers = players.filter(
    (p) => p.seat_number !== null && p.seat_number <= maxSeats
  );

  // Compute speaking order (uses previous opener for circular order)
  const previousOpener = session.day_round_opener_index ?? null;
  const { speakingOrder, openerIndex } = computeSpeakingOrder(
    gamePlayers,
    previousOpener,
    maxSeats
  );

  if (speakingOrder.length === 0) {
    return { ok: false, message: "No alive players to speak" };
  }

  // Update game session
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      day_round_opener_index: openerIndex,
      current_speaker_index: openerIndex,
      speaker_started_at: new Date().toISOString(),
      speaking_order: speakingOrder,
    } as unknown as Record<string, unknown>)
    .eq("id", session.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  // Players will auto-mute/unmute themselves based on current_speaker_index
  // via the useSpeakingAutoMute hook on the client
  return { ok: true };
}

/**
 * Advances to the next speaker, or ends speaking if at last speaker.
 */
export async function advanceToNextSpeaker(
  gameId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  const session = gameSession as unknown as GameSessionState;
  const speakingOrder = session.speaking_order ?? [];
  const currentSpeaker = session.current_speaker_index ?? null;

  if (currentSpeaker === null || speakingOrder.length === 0) {
    return { ok: false, message: "No active speaking session" };
  }

  // Get next speaker
  const nextSpeaker = getNextSpeaker(currentSpeaker, speakingOrder);

  if (nextSpeaker === null) {
    // All done - set current_speaker_index to -1 (marker for "completed")
    const { error: updateErr } = await adminClient
      .from("game_sessions")
      .update({
        current_speaker_index: -1,
        speaker_started_at: null,
      } as unknown as Record<string, unknown>)
      .eq("id", session.id);

    if (updateErr) {
      return { ok: false, message: updateErr.message };
    }

    // Speaking round completed - players will unmute themselves
    // when they see current_speaker_index = -1
    return { ok: true };
  }

  // Advance to next speaker
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      current_speaker_index: nextSpeaker,
      speaker_started_at: new Date().toISOString(),
    } as unknown as Record<string, unknown>)
    .eq("id", session.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  // Players will auto-mute/unmute themselves based on current_speaker_index
  // via the useSpeakingAutoMute hook on the client
  return { ok: true };
}

/**
 * Resets speaking state for a new speaking phase.
 * Called when entering introduction_phase or day_phase.
 */
export async function resetSpeakingState(
  gameId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  // Reset to "not started" state (empty speaking_order)
  // Keep day_round_opener_index for next round calculation
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      current_speaker_index: null,
      speaker_started_at: null,
      speaking_order: [],
    } as unknown as Record<string, unknown>)
    .eq("id", (gameSession as unknown as GameSessionState).id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}
