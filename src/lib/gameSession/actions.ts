"use server";

import { createClient } from "@/lib/supabase/server";
import { GAME_TYPE_MAX_PLAYER_NUMBER } from "@/lib/constants/game";
import { GameSession, JoinRequest } from "@/types/game/type";
import { Tables } from "@/db/supabase/database.types";

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
  const sessions: GameSession[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    host_id: row.host_id!,
    game_type: row.game_type as GameSession["game_type"],
    game_status: row.game_status as GameSession["game_status"],
    max_players: row.max_players,
    current_players: row.current_players,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  }));
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
    .in("status", ["pending", "accepted"])
    .maybeSingle<Tables<"join_requests">>();
  if (existing)
    return {
      ok: true,
      data: toJoinRequest(existing),
      status:
        (existing.status as unknown as JoinRequest["status"]) || "pending",
    } as const;

  const { data, error } = await supabase
    .from("join_requests")
    .insert({
      game_id: gameId,
      requester_id: session.user.id,
      status: "pending",
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
    status: "pending",
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
    .eq("status", "pending")
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
    .update({ status: "accepted" })
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
    .update({ status: "rejected" })
    .eq("id", requestId);
  if (error) return { ok: false, message: error.message } as const;
  return { ok: true } as const;
}
// Realtime listeners moved to client hooks/components.
