"use server";

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import {
  GAME_TYPE_MAX_PLAYER_NUMBER,
  JOIN_REQUEST_STATUSES,
} from "@/lib/constants/game";
import { GameSession, JoinRequest } from "@/types/game/type";
import { Tables } from "@/db/supabase/database.types";
import { listParticipantsForRooms } from "../liveKit/actions";

function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function toJoinRequest(row: Tables<"join_requests">): JoinRequest {
  return {
    id: row.id,
    game_id: row.game_id,
    requester_id: row.requester_id,
    requester_nickname: row.requester_nickname,
    status: row.status as JoinRequest["status"],
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

export async function createGameSession(input: {
  name: string;
  type: keyof typeof GAME_TYPE_MAX_PLAYER_NUMBER extends infer K
    ? K extends string
      ? K
      : never
    : never;
}): Promise<{ ok: true; data: GameSession } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.user)
    return { ok: false, message: "Not authenticated" } as const;

  let attempt = 0;
  let code = generateGameCode();
  let inserted: Pick<
    Tables<"games">,
    | "id"
    | "name"
    | "game_status"
    | "max_players"
    | "current_players"
    | "created_at"
    | "updated_at"
  > | null = null;

  const dataToInsert = {
    code,
    name: input.name,
    host_id: session.user.id,
    game_status: "not_started",
    game_type: input.type,
    max_players: GAME_TYPE_MAX_PLAYER_NUMBER[input.type],
    current_players: 0,
  };
  while (attempt < 3 && !inserted) {
    const { data, error } = await supabase
      .from("games")
      .insert(dataToInsert)
      .select(
        "id,name,host_id,game_status,max_players,current_players,created_at,updated_at"
      )
      .single<
        Pick<
          Tables<"games">,
          | "id"
          | "name"
          | "game_status"
          | "max_players"
          | "current_players"
          | "created_at"
          | "updated_at"
        >
      >();
    if (!error && data) {
      inserted = data;
      break;
    }
    code = generateGameCode();
    attempt++;
  }

  if (!inserted)
    return { ok: false, message: "Unable to create game" } as const;

  const gameSession: GameSession = {
    id: inserted.id,
    name: inserted.name,
    host_id: dataToInsert.host_id,
    game_type: input.type,
    game_status: inserted.game_status as GameSession["game_status"],
    max_players: inserted.max_players,
    current_players: inserted.current_players,
    created_at: inserted.created_at!,
    updated_at: inserted.updated_at!,
  };

  return { ok: true, data: gameSession } as const;
}

export async function fetchAllGameSessions(): Promise<
  { ok: true; data: GameSession[] } | { ok: false; message: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      "id,name,host_id,game_type,game_status,max_players,current_players,created_at,updated_at"
    )
    .order("created_at", { ascending: false });
  if (error) return { ok: false, message: error.message } as const;
  type GameSelect = Pick<
    Tables<"games">,
    | "id"
    | "name"
    | "host_id"
    | "game_type"
    | "game_status"
    | "max_players"
    | "current_players"
    | "created_at"
    | "updated_at"
  >;
  const rows = (data ?? []) as GameSelect[];
  const participantsByRoom = await listParticipantsForRooms(
    rows.map((row) => row.id)
  );
  const sessions: GameSession[] = rows.map((row) => {
    const participantData = participantsByRoom[row.id] || {
      count_players: 0,
      participant_names: [],
    };
    return {
      id: row.id,
      name: row.name,
      host_id: row.host_id!,
      game_type: row.game_type as GameSession["game_type"],
      game_status: row.game_status as GameSession["game_status"],
      max_players: row.max_players,
      current_players: participantData.count,
      participant_names: participantData.names,
      created_at: row.created_at!,
      updated_at: row.updated_at!,
    };
  });
  return { ok: true, data: sessions } as const;
}

export async function fetchGameSessionById(
  id: string
): Promise<{ ok: true; data: GameSession } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      "id,name,host_id,game_type,game_status,max_players,current_players,created_at,updated_at"
    )
    .eq("id", id)
    .single<Tables<"games">>();
  if (error || !data)
    return { ok: false, message: error?.message || "Not found" } as const;

  const gameRow = data;
  const session: GameSession = {
    id: gameRow.id,
    name: gameRow.name,
    host_id: gameRow.host_id!,
    game_type: gameRow.game_type as GameSession["game_type"],
    game_status: gameRow.game_status as GameSession["game_status"],
    max_players: gameRow.max_players,
    current_players: gameRow.current_players,
    created_at: gameRow.created_at!,
    updated_at: gameRow.updated_at!,
  };
  return { ok: true, data: session } as const;
}

export async function checkOrRequestJoin(gameId: string): Promise<{
  ok?: boolean;
  allowed?: boolean;
  status?: JoinRequest["status"];
  request?: JoinRequest;
  message?: string;
}> {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.user)
    return { ok: false, message: "Not authenticated" } as const;

  // 1) Ensure game exists and fetch host
  const { data: gameRow, error: gameError } = await supabase
    .from("games")
    .select("id, host_id")
    .eq("id", gameId)
    .single<Tables<"games">>();
  if (gameError || !gameRow)
    return {
      ok: false,
      message: gameError?.message || "Game not found",
    } as const;
  // 2) Host is always allowed
  if (gameRow.host_id === session.user.id)
    return { ok: true, allowed: true } as const;

  // 3) If already in players, allowed
  const { data: existingPlayer } = await supabase
    .from("game_players")
    .select("id")
    .eq("game_id", gameId)
    .eq("player_id", session.user.id)
    .maybeSingle<Tables<"game_players">>();
  if (existingPlayer)
    return {
      ok: true,
      allowed: true,
      status: JOIN_REQUEST_STATUSES.ACCEPTED,
    } as const;

  // 4) If there is an accepted request, allowed
  const { data: existingAccepted } = await supabase
    .from("join_requests")
    .select("*")
    .eq("game_id", gameId)
    .eq("requester_id", session.user.id)
    .eq("status", JOIN_REQUEST_STATUSES.ACCEPTED)
    .maybeSingle<Tables<"join_requests">>();
  if (existingAccepted)
    return {
      ok: true,
      allowed: true,
      status: JOIN_REQUEST_STATUSES.ACCEPTED,
    } as const;

  // 5) If there is a pending request, return it
  const { data: existingPending } = await supabase
    .from("join_requests")
    .select("*")
    .eq("game_id", gameId)
    .eq("requester_id", session.user.id)
    .eq("status", JOIN_REQUEST_STATUSES.PENDING)
    .maybeSingle<Tables<"join_requests">>();
  if (existingPending)
    return {
      ok: true,
      allowed: false,
      status: JOIN_REQUEST_STATUSES.PENDING,
    } as const;

  // 6) Otherwise create a new pending request
  const { data: inserted, error: insertError } = await supabase
    .from("join_requests")
    .insert({
      game_id: gameId,
      requester_id: session.user.id,
      status: JOIN_REQUEST_STATUSES.PENDING,
      requester_nickname: session.user.user_metadata.nickname,
    })
    .select("*")
    .single<Tables<"join_requests">>();
  if (insertError || !inserted)
    return {
      ok: false,
      message: insertError?.message || "Unable to create join request",
    } as const;

  return {
    ok: true,
    allowed: false,
    status: JOIN_REQUEST_STATUSES.PENDING,
    request: toJoinRequest(inserted),
  } as const;
}

export async function requestJoin(
  gameId: string
): Promise<
  | { ok: true; data: JoinRequest; status: JoinRequest["status"] }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.user)
    return { ok: false, message: "Not authenticated" } as const;

  const { data: existing } = await supabase
    .from("join_requests")
    .select("*")
    .eq("game_id", gameId)
    .eq("requester_id", session.user.id)
    .in("status", [
      JOIN_REQUEST_STATUSES.PENDING,
      JOIN_REQUEST_STATUSES.ACCEPTED,
    ])
    .maybeSingle<Tables<"join_requests">>();
  if (existing)
    return {
      ok: true,
      data: toJoinRequest(existing),
      status:
        (existing.status as unknown as JoinRequest["status"]) ||
        JOIN_REQUEST_STATUSES.PENDING,
    } as const;

  const { data, error } = await supabase
    .from("join_requests")
    .insert({
      game_id: gameId,
      requester_id: session.user.id,
      requester_nickname: session.user.user_metadata.nickname,
      status: JOIN_REQUEST_STATUSES.PENDING,
    })
    .select("*")
    .single<Tables<"join_requests">>();
  if (error || !data)
    return {
      ok: false,
      message: error?.message || "Unable to request",
    } as const;
  return {
    ok: true,
    data: toJoinRequest(data),
    status: JOIN_REQUEST_STATUSES.PENDING,
  } as const;
}

export async function fetchPendingJoinRequests(
  gameId: string
): Promise<{ ok: true; data: JoinRequest[] } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("join_requests")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true })
    .returns<Tables<"join_requests">[]>();
  if (error) return { ok: false, message: error.message } as const;
  return {
    ok: true,
    data: (data || []).map(toJoinRequest),
  } as const;
}

export async function acceptJoinRequest(
  requestId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("join_requests")
    .update({ status: JOIN_REQUEST_STATUSES.ACCEPTED })
    .eq("id", requestId);
  if (error) return { ok: false, message: error.message } as const;
  return { ok: true } as const;
}

export async function rejectJoinRequest(
  requestId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("join_requests")
    .update({ status: JOIN_REQUEST_STATUSES.REJECTED })
    .eq("id", requestId);
  if (error) return { ok: false, message: error.message } as const;
  return { ok: true } as const;
}
// Realtime listeners moved to client hooks/components.

export async function kickPlayer(
  gameId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { ok: false, message: "Not authenticated" };
  const { data: gameRow, error: gameErr } = await supabase
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single<Tables<"games">>();
  if (gameErr || !gameRow) return { ok: false, message: "Game not found" };
  if (gameRow.host_id !== session.user.id)
    return { ok: false, message: "Forbidden" };
  const { error } = await supabase
    .from("join_requests")
    .update({ status: JOIN_REQUEST_STATUSES.REJECTED })
    .eq("game_id", gameId)
    .eq("requester_id", userId)
    .in("status", [
      JOIN_REQUEST_STATUSES.PENDING,
      JOIN_REQUEST_STATUSES.ACCEPTED,
    ]);
  if (error) return { ok: false, message: error.message } as const;
  return { ok: true } as const;
}

export async function transferHost(
  gameId: string,
  newHostUserId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { ok: false, message: "Not authenticated" };
  const { data: gameRow, error: gameErr } = await supabase
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single<Tables<"games">>();
  if (gameErr || !gameRow) return { ok: false, message: "Game not found" };
  if (gameRow.host_id !== session.user.id)
    return { ok: false, message: "Forbidden" };
  // Ensure new host exists in profiles to satisfy FK
  const { data: profile, error: profileErr } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", newHostUserId)
    .maybeSingle();
  if (profileErr) return { ok: false, message: profileErr.message } as const;
  if (!profile)
    return {
      ok: false,
      message: "New host user not found in profiles",
    } as const;

  // Use admin client to bypass RLS for the update
  const { error } = await adminClient
    .from("games")
    .update({ host_id: newHostUserId })
    .eq("id", gameId);
  if (error) return { ok: false, message: error.message } as const;

  // Remove any join_requests for the new host (they are now the host and shouldn't have a request)
  const { error: deleteNewHostReqErr } = await adminClient
    .from("join_requests")
    .delete()
    .eq("game_id", gameId)
    .eq("requester_id", newHostUserId);
  if (deleteNewHostReqErr)
    return { ok: false, message: deleteNewHostReqErr.message } as const;

  // Ensure previous host remains a player: create or update an accepted join_request for them
  const previousHostUserId = gameRow.host_id!;

  const { data: oldHostProfile, error: oldHostProfileErr } = await adminClient
    .from("profiles")
    .select("nickname")
    .eq("id", previousHostUserId)
    .single<{ nickname: string }>();
  if (oldHostProfileErr)
    return { ok: false, message: oldHostProfileErr.message } as const;

  const { data: existingOldReq, error: existingOldReqErr } = await adminClient
    .from("join_requests")
    .select("id,status")
    .eq("game_id", gameId)
    .eq("requester_id", previousHostUserId)
    .maybeSingle<{ id: string; status: string }>();
  if (existingOldReqErr)
    return { ok: false, message: existingOldReqErr.message } as const;

  if (existingOldReq) {
    const { error: updateOldReqErr } = await adminClient
      .from("join_requests")
      .update({
        status: JOIN_REQUEST_STATUSES.ACCEPTED,
        requester_nickname: oldHostProfile!.nickname,
      })
      .eq("id", existingOldReq.id);
    if (updateOldReqErr)
      return { ok: false, message: updateOldReqErr.message } as const;
  } else {
    const { error: insertOldReqErr } = await adminClient
      .from("join_requests")
      .insert({
        game_id: gameId,
        requester_id: previousHostUserId,
        requester_nickname: oldHostProfile!.nickname,
        status: JOIN_REQUEST_STATUSES.ACCEPTED,
      });
    if (insertOldReqErr)
      return { ok: false, message: insertOldReqErr.message } as const;
  }

  return { ok: true } as const;
}
