"use server";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/db/supabase/database.types";
import { adminClient } from "@/lib/supabase/admin";
import { RoomServiceClient, ParticipantInfo } from "livekit-server-sdk";
import { GAME_PHASES } from "../constants/game";
import { GameSessionState } from "@/types/game/type";
import { filterPlayerRoles } from "@/lib/utils/filterPlayerRoles";

// **
//  * Starts a game:
//  * - Ensures caller is host
//  * - Randomizes seats for all non-host connected participants
//  * - Persists players into game_players with seat_number
//  * - Updates LiveKit participant metadata with seatIndex
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

  // List current participants from LiveKit
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
  let participants: ParticipantInfo[] = [];
  try {
    participants = await roomService.listParticipants(gameId);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Unable to list participants",
    };
  }
  // Partition into host vs non-host by identity
  const hostIdentity = gameRow.host_id!;
  const nonHost = participants.filter((p) => p.identity !== hostIdentity);

  // Randomize non-host order and assign seats [1..max_players]
  const maxSeats = Number(gameRow.max_players) || 10;
  const shuffled = [...nonHost].sort(() => Math.random() - 0.5);
  const seatAssignments: Array<{ participantId: string; seat: number }> = [];
  let seatNumber = 1;
  for (const p of shuffled) {
    if (seatNumber > maxSeats) break;
    seatAssignments.push({ participantId: p.identity, seat: seatNumber });
    seatNumber++;
  }

  // Prepare DB upsert: clear existing rows for this game and insert fresh
  type GamePlayerInsert = {
    game_id: string;
    player_id: string;
    is_alive: boolean;
    seat_number?: number;
  };

  const toInsert: GamePlayerInsert[] = [];
  // include host (no seat)
  toInsert.push({
    game_id: gameId,
    player_id: hostIdentity,
    is_alive: true,
  });
  for (const { participantId, seat } of seatAssignments) {
    toInsert.push({
      game_id: gameId,
      player_id: participantId,
      is_alive: true,
      seat_number: seat,
    });
  }

  // Use admin client to bypass RLS for bulk writes
  const { error: delErr } = await adminClient
    .from("game_players")
    .delete()
    .eq("game_id", gameId);
  if (delErr) return { ok: false, message: delErr.message };

  if (toInsert.length > 0) {
    const { error: insErr } = await adminClient
      .from("game_players")
      .insert(toInsert);
    if (insErr) return { ok: false, message: insErr.message };
  }

  // Update LiveKit participant metadata with seatIndex
  for (const { participantId, seat } of seatAssignments) {
    // Merge with any existing metadata
    try {
      const current = participants.find((p) => p.identity === participantId);
      let existingMeta: Record<string, unknown> = {};
      if (current?.metadata) {
        try {
          existingMeta = JSON.parse(current.metadata) as Record<
            string,
            unknown
          >;
        } catch {
          existingMeta = {};
        }
      }
      await roomService.updateParticipant(gameId, participantId, {
        metadata: JSON.stringify({ ...existingMeta, seatIndex: seat }),
      });
    } catch {
      // continue best-effort
    }
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
