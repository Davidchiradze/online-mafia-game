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
import { FOULS } from "@/lib/constants/game";

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

/**
 * Nominates or un-nominates a player during DAY_PHASE.
 * Only the host can nominate. Only one nomination is active at a time.
 * Clicking the same player toggles their nomination off.
 * Clicking a different player replaces the current nomination.
 */
export async function nominatePlayer(
  gameId: string,
  seatNumber: number
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

  // Only allow nominations during DAY_PHASE
  if (session.game_phase !== "day_phase") {
    return { ok: false, message: "Nominations only allowed during day phase" };
  }

  const currentNominations = session.nominated_players ?? [];
  let newNominations: number[];

  // If clicking the same player, toggle off (undo nomination)
  if (currentNominations.includes(seatNumber)) {
    newNominations = currentNominations.filter((seat) => seat !== seatNumber);
  } else {
    // Add to nominations
    newNominations = [...currentNominations, seatNumber];
  }

  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      nominated_players: newNominations,
    } as unknown as Record<string, unknown>)
    .eq("id", session.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Clears all nominations. Called when transitioning out of DAY_PHASE.
 */
export async function clearNominations(gameId: string): Promise<ActionResult> {
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
    .select("id")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      nominated_players: [],
    } as unknown as Record<string, unknown>)
    .eq("id", gameSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Starts the nominated players speaking phase.
 * Transitions from day_phase to nominated_players_speak.
 * Sets up speaking order based on nominated_players array order.
 * Each nominated player gets 30 seconds for self-justification.
 */
export async function startNominatedPlayersSpeaking(
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

  // Only allow starting from day_phase
  if (session.game_phase !== "day_phase") {
    return {
      ok: false,
      message: "Can only start nominated players speaking from day phase",
    };
  }

  const nominatedPlayers = session.nominated_players ?? [];

  if (nominatedPlayers.length === 0) {
    return { ok: false, message: "No players nominated" };
  }

  // Use nominated_players order as speaking order
  // First nominated player speaks first
  const firstSpeaker = nominatedPlayers[0];

  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      game_phase: "nominated_players_speak",
      speaking_order: nominatedPlayers,
      current_speaker_index: firstSpeaker,
      speaker_started_at: new Date().toISOString(),
    } as unknown as Record<string, unknown>)
    .eq("id", session.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Advances to the next nominated speaker during nominated_players_speak phase.
 * When all nominated players have spoken, transitions to voting phase.
 */
export async function advanceToNextNominatedSpeaker(
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

  // Only allow during nominated_players_speak phase
  if (session.game_phase !== "nominated_players_speak") {
    return {
      ok: false,
      message: "Not in nominated players speaking phase",
    };
  }

  const speakingOrder = session.speaking_order ?? [];
  const currentSpeaker = session.current_speaker_index ?? null;

  if (currentSpeaker === null || speakingOrder.length === 0) {
    return { ok: false, message: "No active speaking session" };
  }

  // Get next speaker
  const nextSpeaker = getNextSpeaker(currentSpeaker, speakingOrder);

  if (nextSpeaker === null) {
    // All nominated players have spoken - transition to voting phase
    const { error: updateErr } = await adminClient
      .from("game_sessions")
      .update({
        game_phase: "voting",
        current_speaker_index: null,
        speaker_started_at: null,
        speaking_order: [],
      } as unknown as Record<string, unknown>)
      .eq("id", session.id);

    if (updateErr) {
      return { ok: false, message: updateErr.message };
    }

    return { ok: true };
  }

  // Advance to next nominated speaker
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

  return { ok: true };
}

/**
 * Gives a foul to a player during DAY_PHASE.
 * Only the host can give fouls. Maximum fouls is defined in FOULS.MAX_FOULS.
 * When a player reaches max fouls, they can be eliminated (handled separately).
 */
export async function giveFoul(
  gameId: string,
  seatNumber: number
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

  // Only allow fouls during DAY_PHASE
  if (session.game_phase !== "day_phase") {
    return { ok: false, message: "Fouls only allowed during day phase" };
  }

  // Get the player by seat number
  const { data: player, error: playerErr } = await adminClient
    .from("game_players")
    .select("*")
    .eq("game_id", gameId)
    .eq("seat_number", seatNumber)
    .single();

  if (playerErr || !player) {
    return { ok: false, message: "Player not found" };
  }

  const currentFouls = player.fouls ?? 0;

  // Check if player already has max fouls
  if (currentFouls >= FOULS.MAX_FOULS) {
    return { ok: false, message: "Player already has maximum fouls" };
  }

  // Increment foul count
  const { error: updateErr } = await adminClient
    .from("game_players")
    .update({
      fouls: currentFouls + 1,
    })
    .eq("id", player.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}
