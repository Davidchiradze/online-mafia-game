"use server";

/**
 * Foul Speak Server Actions
 *
 * Handles server-side foul speaking (5-second unmute for non-speakers).
 * The actual muting/unmuting is done via LiveKit server API, not client-side.
 */

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { FOULS, SPEAKING_STATE } from "@/lib/constants/game";
import { muteParticipantMicrophone } from "@/lib/liveKit/actions";
import type { GameSessionState } from "@/types/game/type";

type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Start foul speaking for the current player.
 * Unmutes them for FOUL_SPEAK_DURATION_MS, client will call endFoulSpeak when expired.
 *
 * Conditions:
 * - Player must be authenticated
 * - Player must be alive
 * - Player must not be the host
 * - Player must not be the current speaker
 * - Game must be in a foul-allowed phase
 * - Player must not already be foul speaking
 */
export async function startFoulSpeak(gameId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { ok: false, message: "Not authenticated" };
    }

    // Get game to check host
    const { data: game, error: gameErr } = await adminClient
        .from("games")
        .select("host_id")
        .eq("id", gameId)
        .single();

    if (gameErr || !game) {
        return { ok: false, message: "Game not found" };
    }

    // Host cannot foul speak
    if (game.host_id === user.id) {
        return { ok: false, message: "Host cannot foul speak" };
    }

    // Get game session
    const { data: gameSession, error: sessionErr } = await adminClient
        .from("game_sessions")
        .select("*")
        .eq("game_id", gameId)
        .single();

    if (sessionErr || !gameSession) {
        return { ok: false, message: "Game session not found" };
    }

    const session = gameSession as unknown as GameSessionState;

    // Check if in foul-allowed phase
    if (
        !FOULS.ALLOWED_PHASES.includes(
            session.game_phase as (typeof FOULS.ALLOWED_PHASES)[number]
        )
    ) {
        return { ok: false, message: "Foul speaking not allowed in this phase" };
    }

    // Get player record
    const { data: player, error: playerErr } = await adminClient
        .from("game_players")
        .select("*")
        .eq("game_id", gameId)
        .eq("player_id", user.id)
        .single();

    if (playerErr || !player) {
        return { ok: false, message: "Player not found" };
    }

    // Player must be alive
    if (player.is_alive === false) {
        return { ok: false, message: "Dead players cannot foul speak" };
    }

    // Player must not be the current speaker
    const currentSpeakerIndex = session.current_speaker_index;
    const isSpeaking =
        SPEAKING_STATE.isActive(currentSpeakerIndex) &&
        currentSpeakerIndex === player.seat_number;

    if (isSpeaking) {
        return { ok: false, message: "Current speaker cannot foul speak" };
    }

    // Player must not already be foul speaking
    if (player.foul_speak_started_at) {
        const startTime = new Date(player.foul_speak_started_at).getTime();
        const elapsed = Date.now() - startTime;
        if (elapsed < FOULS.FOUL_SPEAK_DURATION_MS) {
            return { ok: false, message: "Already foul speaking" };
        }
    }

    // Update database with foul speak start time
    const { error: updateErr } = await adminClient
        .from("game_players")
        .update({ foul_speak_started_at: new Date().toISOString() })
        .eq("id", player.id);

    if (updateErr) {
        return { ok: false, message: updateErr.message };
    }

    // Unmute the player via LiveKit server API
    const muteResult = await muteParticipantMicrophone(gameId, user.id, false);
    console.log("🚀 ~ startFoulSpeak ~ muteResult:", muteResult)
    if (!muteResult.ok) {
        // Log but don't fail - DB state is source of truth
        console.warn(`[startFoulSpeak] Failed to unmute player: ${muteResult.message}`);
    }

    return { ok: true };
}

/**
 * End foul speaking for the current player.
 * Called by the client after FOUL_SPEAK_DURATION_MS expires.
 * Re-mutes the player.
 */
export async function endFoulSpeak(gameId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { ok: false, message: "Not authenticated" };
    }

    // Get player record
    const { data: player, error: playerErr } = await adminClient
        .from("game_players")
        .select("id, foul_speak_started_at")
        .eq("game_id", gameId)
        .eq("player_id", user.id)
        .single();

    if (playerErr || !player) {
        return { ok: false, message: "Player not found" };
    }

    // Only end if currently foul speaking
    if (!player.foul_speak_started_at) {
        return { ok: false, message: "Not currently foul speaking" };
    }

    // Clear the foul speak timestamp
    const { error: updateErr } = await adminClient
        .from("game_players")
        .update({ foul_speak_started_at: null })
        .eq("id", player.id);

    if (updateErr) {
        return { ok: false, message: updateErr.message };
    }

    // Re-mute the player via LiveKit server API
    const muteResult = await muteParticipantMicrophone(gameId, user.id, true);
    if (!muteResult.ok) {
        // Log but don't fail - DB state is source of truth
        console.warn(`[endFoulSpeak] Failed to mute player: ${muteResult.message}`);
    }

    return { ok: true };
}

/**
 * Force end foul speaking for a player (called by host or automatically).
 * Used when phase changes or player needs to be forcibly muted.
 */
export async function forceEndFoulSpeak(
    gameId: string,
    playerId: string
): Promise<ActionResult> {
    // Clear the foul speak timestamp
    const { error: updateErr } = await adminClient
        .from("game_players")
        .update({ foul_speak_started_at: null })
        .eq("game_id", gameId)
        .eq("player_id", playerId);

    if (updateErr) {
        return { ok: false, message: updateErr.message };
    }

    // Re-mute the player via LiveKit server API
    const muteResult = await muteParticipantMicrophone(gameId, playerId, true);
    if (!muteResult.ok) {
        console.warn(`[forceEndFoulSpeak] Failed to mute player: ${muteResult.message}`);
    }

    return { ok: true };
}

/**
 * Clear all foul speak states for all players in a game.
 * Called on phase transitions to ensure clean state.
 */
export async function clearAllFoulSpeakStates(
    gameId: string
): Promise<ActionResult> {
    const { error: updateErr } = await adminClient
        .from("game_players")
        .update({ foul_speak_started_at: null })
        .eq("game_id", gameId)
        .not("foul_speak_started_at", "is", null);

    if (updateErr) {
        return { ok: false, message: updateErr.message };
    }

    return { ok: true };
}

