"use server";

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { SPECTATOR } from "@/lib/constants/game";
import { GameSpectator } from "@/types/game/type";

/**
 * Join a game as a spectator.
 * Validates:
 * - User is authenticated
 * - Game exists and is in "playing" status
 * - User is not already a player in the game
 * - Spectator count is below maximum
 * - User is not already a spectator
 */
export async function joinAsSpectator(
    gameId: string
): Promise<{ ok: true; data: GameSpectator } | { ok: false; message: string }> {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { ok: false, message: "Not authenticated" };
    }

    // 1) Verify game exists and is in "playing" status
    const { data: gameRow, error: gameError } = await supabase
        .from("games")
        .select("id, game_status")
        .eq("id", gameId)
        .single();

    if (gameError || !gameRow) {
        return { ok: false, message: "Game not found" };
    }

    if (gameRow.game_status !== "playing") {
        return { ok: false, message: "Can only spectate games that are in progress" };
    }

    // 2) Check if user is already a player in this game
    const { data: existingPlayer } = await supabase
        .from("game_players")
        .select("id")
        .eq("game_id", gameId)
        .eq("player_id", user.id)
        .maybeSingle();

    if (existingPlayer) {
        return { ok: false, message: "You are already a player in this game" };
    }

    // 3) Check if user is already a spectator
    const { data: existingSpectator } = await supabase
        .from("game_spectators")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingSpectator) {
        return { ok: false, message: "You are already spectating this game" };
    }

    // 4) Check spectator count
    const { count, error: countError } = await supabase
        .from("game_spectators")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId);

    if (countError) {
        return { ok: false, message: countError.message };
    }

    if ((count ?? 0) >= SPECTATOR.MAX_SPECTATORS_PER_GAME) {
        return { ok: false, message: "Maximum spectator limit reached" };
    }

    // 5) Get user nickname from profile or user metadata
    const nickname = user.user_metadata?.nickname || user.email?.split("@")[0] || "Spectator";

    // 6) Insert spectator record using admin client to bypass RLS for writes
    const { data: inserted, error: insertError } = await adminClient
        .from("game_spectators")
        .insert({
            game_id: gameId,
            user_id: user.id,
            nickname: nickname,
        })
        .select("*")
        .single();

    if (insertError || !inserted) {
        return { ok: false, message: insertError?.message || "Failed to join as spectator" };
    }

    return { ok: true, data: inserted };
}

/**
 * Leave a game as a spectator.
 * Deletes the spectator record for the current user.
 */
export async function leaveAsSpectator(
    gameId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { ok: false, message: "Not authenticated" };
    }

    // Delete the spectator record using admin client
    const { error: deleteError } = await adminClient
        .from("game_spectators")
        .delete()
        .eq("game_id", gameId)
        .eq("user_id", user.id);

    if (deleteError) {
        return { ok: false, message: deleteError.message };
    }

    return { ok: true };
}

/**
 * Fetch all spectators for a single game.
 */
export async function fetchSpectators(
    gameId: string
): Promise<{ ok: true; data: GameSpectator[] } | { ok: false; message: string }> {
    const { data, error } = await adminClient
        .from("game_spectators")
        .select("*")
        .eq("game_id", gameId)
        .order("joined_at", { ascending: true });

    if (error) {
        return { ok: false, message: error.message };
    }

    return { ok: true, data: data ?? [] };
}

/**
 * Batch fetch spectators for multiple games.
 * Used by the lobby to display spectator counts and nicknames.
 */
export async function fetchSpectatorsForGames(
    gameIds: string[]
): Promise<{ ok: true; data: Map<string, GameSpectator[]> } | { ok: false; message: string }> {
    if (gameIds.length === 0) {
        return { ok: true, data: new Map() };
    }

    const { data, error } = await adminClient
        .from("game_spectators")
        .select("*")
        .in("game_id", gameIds)
        .order("joined_at", { ascending: true });

    if (error) {
        return { ok: false, message: error.message };
    }

    // Group spectators by game_id
    const spectatorsByGame = new Map<string, GameSpectator[]>();
    for (const spectator of data ?? []) {
        const gameSpectators = spectatorsByGame.get(spectator.game_id) ?? [];
        gameSpectators.push(spectator);
        spectatorsByGame.set(spectator.game_id, gameSpectators);
    }

    return { ok: true, data: spectatorsByGame };
}

/**
 * Check if the current user is a spectator for a game.
 */
export async function isUserSpectator(
    gameId: string
): Promise<{ ok: true; isSpectator: boolean; spectator?: GameSpectator } | { ok: false; message: string }> {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { ok: false, message: "Not authenticated" };
    }

    const { data: spectator, error } = await supabase
        .from("game_spectators")
        .select("*")
        .eq("game_id", gameId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        return { ok: false, message: error.message };
    }

    return {
        ok: true,
        isSpectator: !!spectator,
        spectator: spectator ?? undefined,
    };
}

/**
 * Get spectator count for a game.
 */
export async function getSpectatorCount(
    gameId: string
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
    const { count, error } = await adminClient
        .from("game_spectators")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId);

    if (error) {
        return { ok: false, message: error.message };
    }

    return { ok: true, count: count ?? 0 };
}

