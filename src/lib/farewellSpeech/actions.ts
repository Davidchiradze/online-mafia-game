"use server";

/**
 * Farewell Speech Phase Actions
 *
 * This phase occurs after doctor_heals_player and before day_phase.
 * Players killed at night (who weren't saved by the doctor) get 1 minute
 * to give a farewell speech before being marked as dead.
 *
 * Flow:
 * 1. startFarewellSpeech - Calculate killed players (excluding healed), randomize order
 * 2. grantFarewellTime - Start 1-minute timer for current speaker
 * 3. markDeadAndAdvance - Set is_alive=false, advance to next speaker or day_phase
 *
 * Special cases:
 * - If both mafia and yakuza target the same player, they speak once
 * - If doctor heals a target, that player doesn't die
 * - Order is randomized so players don't know who killed whom
 * - If no one dies, skip directly to day_phase
 */

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { resetSpeakingState } from "@/lib/dayPhase/actions";
import {
  muteParticipantMicrophone,
  muteAllParticipants,
} from "@/lib/liveKit/actions";

type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Fisher-Yates shuffle algorithm for randomizing array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Verify the caller is the host of the game.
 */
async function verifyHost(
  gameId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: game, error: gameErr } = await adminClient
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single();

  if (gameErr || !game) {
    return { ok: false, message: "Game not found" };
  }

  if (game.host_id !== userId) {
    return {
      ok: false,
      message: "Forbidden: Only host can perform this action",
    };
  }

  return { ok: true };
}

/**
 * Helper to get player user ID from seat number.
 */
async function getPlayerIdFromSeat(
  gameId: string,
  seatNumber: number
): Promise<string | null> {
  const { data: player } = await adminClient
    .from("game_players")
    .select("player_id")
    .eq("game_id", gameId)
    .eq("seat_number", seatNumber)
    .single();

  return player?.player_id ?? null;
}

/**
 * Helper to get all player IDs in a game (excluding host).
 */
async function getAllPlayerIds(
  gameId: string,
  maxSeats: number
): Promise<string[]> {
  const { data: players } = await adminClient
    .from("game_players")
    .select("player_id, seat_number")
    .eq("game_id", gameId);

  if (!players) return [];

  return players
    .filter(
      (p) =>
        p.player_id !== null &&
        p.seat_number !== null &&
        p.seat_number <= maxSeats
    )
    .map((p) => p.player_id!);
}

/**
 * Start the farewell speech phase.
 * Determines which players were killed (not healed) and randomizes their speaking order.
 *
 * Logic:
 * - Get mafia_target and yakuza_target from night_phase_sessions
 * - Filter out any target that was healed by the doctor
 * - If both targeted the same player, they speak once (no duplicate)
 * - Randomize order so players don't know who killed whom
 * - If no one dies, skip to day_phase
 *
 * @returns ActionResult with optional skipToDay flag
 */
export async function startFarewellSpeech(
  gameId: string
): Promise<ActionResult & { skipToDay?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Get current game session
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  // Get night phase session for current night
  const nightNumber = gameSession.current_night_number;
  const { data: nightSession } = await adminClient
    .from("night_phase_sessions")
    .select("*")
    .eq("game_id", gameId)
    .eq("night_number", nightNumber)
    .single();

  if (!nightSession) {
    return { ok: false, message: "Night phase session not found" };
  }

  const mafiaTarget = nightSession.mafia_target;
  const yakuzaTarget = nightSession.yakuza_target;
  const healedPlayer = nightSession.healed_player;

  // Determine who actually dies (not healed)
  const killedPlayers: number[] = [];

  // Add mafia target if not healed
  if (mafiaTarget !== null && mafiaTarget !== healedPlayer) {
    killedPlayers.push(mafiaTarget);
  }

  // Add yakuza target if not healed and not already added (same target case)
  if (yakuzaTarget !== null && yakuzaTarget !== healedPlayer) {
    if (!killedPlayers.includes(yakuzaTarget)) {
      killedPlayers.push(yakuzaTarget);
    }
  }

  // If no one dies, skip to day_phase
  if (killedPlayers.length === 0) {
    const { error: updateErr } = await adminClient
      .from("game_sessions")
      .update({
        game_phase: "day_phase",
        speaking_order: [],
        current_speaker_index: null,
        speaker_started_at: null,
      })
      .eq("id", gameSession.id);

    if (updateErr) {
      return { ok: false, message: updateErr.message };
    }

    // Reset speaking state for day phase
    await resetSpeakingState(gameId);

    return { ok: true, skipToDay: true };
  }

  // Randomize the order of killed players
  // This ensures players don't know who was killed by mafia vs yakuza
  const randomizedOrder = shuffleArray(killedPlayers);

  // Update game session to farewell_speech phase
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      game_phase: "farewell_speech",
      speaking_order: randomizedOrder,
      current_speaker_index: null, // Not started yet, waiting for host to grant time
      speaker_started_at: null,
    })
    .eq("id", gameSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Grant 1 minute speaking time to the next farewell speaker.
 * Sets up the current speaker and starts their timer.
 *
 * Call this when:
 * - Starting the first speaker (current_speaker_index is null)
 * - After marking previous speaker as dead (current_speaker_index is null again)
 */
export async function grantFarewellTime(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Get current game session
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  if (gameSession.game_phase !== "farewell_speech") {
    return { ok: false, message: "Not in farewell speech phase" };
  }

  const speakingOrder = gameSession.speaking_order ?? [];
  const currentSpeaker = gameSession.current_speaker_index;

  if (speakingOrder.length === 0) {
    return { ok: false, message: "No farewell speakers" };
  }

  // If there's already an active speaker, don't allow granting again
  if (currentSpeaker !== null) {
    return { ok: false, message: "Speaker already has time granted" };
  }

  // Find the next speaker to grant time to
  // We need to determine who hasn't spoken yet
  // Since we set current_speaker_index to null after marking dead,
  // we need another way to track progress. We'll use the is_alive status.
  // Players who have given farewell are dead. Find first alive player in order.
  const { data: players, error: playersErr } = await adminClient
    .from("game_players")
    .select("seat_number, is_alive")
    .eq("game_id", gameId);

  if (playersErr || !players) {
    return { ok: false, message: "Failed to fetch players" };
  }

  // Create a map of seat_number to is_alive
  const aliveMap = new Map<number, boolean>();
  for (const p of players) {
    if (p.seat_number !== null) {
      aliveMap.set(p.seat_number, p.is_alive ?? true);
    }
  }

  // Find first player in speaking order who is still alive
  const nextSpeaker = speakingOrder.find((seat) => aliveMap.get(seat) === true);

  if (nextSpeaker === undefined) {
    // All speakers have been marked as dead, transition to day_phase
    const { error: updateErr } = await adminClient
      .from("game_sessions")
      .update({
        game_phase: "day_phase",
        speaking_order: [],
        current_speaker_index: null,
        speaker_started_at: null,
      })
      .eq("id", gameSession.id);

    if (updateErr) {
      return { ok: false, message: updateErr.message };
    }

    // Reset speaking state for day phase
    await resetSpeakingState(gameId);

    return { ok: true };
  }

  // Get game info for maxSeats
  const { data: game } = await adminClient
    .from("games")
    .select("max_players")
    .eq("id", gameId)
    .single();
  const maxSeats = Number(game?.max_players ?? 12);

  // Server-side muting: mute all players first
  const allPlayerIds = await getAllPlayerIds(gameId, maxSeats);
  await muteAllParticipants(gameId, allPlayerIds);

  // Then unmute the farewell speaker
  const speakerId = await getPlayerIdFromSeat(gameId, nextSpeaker);
  if (speakerId) {
    await muteParticipantMicrophone(gameId, speakerId, false).catch(
      console.error
    );
  }

  // Grant time to the next speaker
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      current_speaker_index: nextSpeaker,
      speaker_started_at: new Date().toISOString(),
    })
    .eq("id", gameSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Mark the current speaker as dead and prepare for next speaker or transition.
 * Sets is_alive=false for the current speaker and resets current_speaker_index.
 *
 * After calling this:
 * - If more speakers remain, host calls grantFarewellTime again
 * - If voting session exists, transitions to night_phase (voting elimination)
 * - Otherwise transitions to day_phase (night kills)
 */
export async function markDeadAndAdvance(
  gameId: string
): Promise<
  ActionResult & { transitionedToDay?: boolean; transitionedToNight?: boolean }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Get current game session
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  if (gameSession.game_phase !== "farewell_speech") {
    return { ok: false, message: "Not in farewell speech phase" };
  }

  const speakingOrder = gameSession.speaking_order ?? [];
  const currentSpeaker = gameSession.current_speaker_index;

  if (currentSpeaker === null || speakingOrder.length === 0) {
    return { ok: false, message: "No active farewell speaker" };
  }

  // Server-side muting: mute the player being marked as dead
  const deadPlayerId = await getPlayerIdFromSeat(gameId, currentSpeaker);
  if (deadPlayerId) {
    await muteParticipantMicrophone(gameId, deadPlayerId, true).catch(
      console.error
    );
  }

  // Mark current speaker as dead
  const { error: killErr } = await adminClient
    .from("game_players")
    .update({ is_alive: false })
    .eq("game_id", gameId)
    .eq("seat_number", currentSpeaker);

  if (killErr) {
    return { ok: false, message: killErr.message };
  }

  // Check if there are more speakers remaining
  const currentIndex = speakingOrder.indexOf(currentSpeaker);
  const hasMoreSpeakers = currentIndex < speakingOrder.length - 1;

  if (hasMoreSpeakers) {
    // More speakers remaining - reset speaker to wait for next grant
    const { error: updateErr } = await adminClient
      .from("game_sessions")
      .update({
        current_speaker_index: null,
        speaker_started_at: null,
      })
      .eq("id", gameSession.id);

    if (updateErr) {
      return { ok: false, message: updateErr.message };
    }

    return { ok: true, transitionedToDay: false };
  }

  // All farewell speeches done - check if this was from voting
  // If nominated_players has values, it's voting farewell (go to night)
  // If empty, it's night kills farewell (go to day)
  const nominatedPlayers = gameSession.nominated_players ?? [];

  if (nominatedPlayers.length > 0) {
    // Voting farewell - transition to night phase
    const newNightNumber = (gameSession.current_night_number || 0) + 1;

    const { error: updateErr } = await adminClient
      .from("game_sessions")
      .update({
        game_phase: "night_phase",
        current_night_number: newNightNumber,
        speaking_order: [],
        current_speaker_index: null,
        speaker_started_at: null,
        nominated_players: [],
        foul_elimination_occurred: false, // Reset foul elimination flag for new round
      })
      .eq("id", gameSession.id);

    if (updateErr) {
      return { ok: false, message: updateErr.message };
    }

    // Create night_phase_sessions row for the new night
    const { data: existingNight } = await adminClient
      .from("night_phase_sessions")
      .select("id")
      .eq("game_id", gameId)
      .eq("night_number", newNightNumber)
      .maybeSingle();

    if (!existingNight) {
      await adminClient.from("night_phase_sessions").insert({
        game_id: gameId,
        night_number: newNightNumber,
      });
    }

    return { ok: true, transitionedToNight: true };
  }

  // Night farewell - transition to day_phase
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      game_phase: "day_phase",
      speaking_order: [],
      current_speaker_index: null,
      speaker_started_at: null,
    })
    .eq("id", gameSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  // Reset speaking state for day phase
  await resetSpeakingState(gameId);

  return { ok: true, transitionedToDay: true };
}

/**
 * Get farewell speech state for UI display.
 * Returns information about the current farewell speech progress.
 */
export async function getFarewellSpeechState(gameId: string): Promise<
  | {
      ok: true;
      data: {
        speakingOrder: number[];
        currentSpeaker: number | null;
        speakerStartedAt: string | null;
        completedSpeakers: number[];
        remainingSpeakers: number[];
      };
    }
  | { ok: false; message: string }
> {
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  const speakingOrder = gameSession.speaking_order ?? [];
  const currentSpeaker = gameSession.current_speaker_index;

  // Get player alive statuses to determine who has completed
  const { data: players } = await adminClient
    .from("game_players")
    .select("seat_number, is_alive")
    .eq("game_id", gameId);

  const aliveMap = new Map<number, boolean>();
  if (players) {
    for (const p of players) {
      if (p.seat_number !== null) {
        aliveMap.set(p.seat_number, p.is_alive ?? true);
      }
    }
  }

  // Completed speakers are those in the order who are now dead
  const completedSpeakers = speakingOrder.filter(
    (seat) => aliveMap.get(seat) === false
  );

  // Remaining speakers are those in the order who are still alive
  const remainingSpeakers = speakingOrder.filter(
    (seat) => aliveMap.get(seat) === true
  );

  return {
    ok: true,
    data: {
      speakingOrder,
      currentSpeaker,
      speakerStartedAt: gameSession.speaker_started_at,
      completedSpeakers,
      remainingSpeakers,
    },
  };
}
