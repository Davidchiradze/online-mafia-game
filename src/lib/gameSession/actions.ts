"use client";

import { createClient } from "@/lib/supabase/client";
import {
  GAME_TYPE_MAX_PLAYER_NUMBER,
  GameStatus,
  GameType,
} from "@/lib/constants/game";
import { GameSession, JoinRequest } from "@/types/game/type";

function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createGameSession(input: {
  name: string;
  type: GameType;
}): Promise<{ ok: true; data: GameSession } | { ok: false; message: string }> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    return { ok: false, message: "Not authenticated" } as const;

  let attempt = 0;
  let code = generateGameCode();
  let inserted: {
    id: string;
    name: string;
    game_status: GameStatus;
    max_players: number;
    current_players: number;
    created_at: string;
    updated_at: string;
  } | null = null;

  const dataToInsert = {
    code,
    name: input.name,
    host_id: user.id,
    game_status: GameStatus.NotStarted,
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
      .single();
    if (!error && data) {
      inserted = data as any;
      break;
    }
    code = generateGameCode();
    attempt++;
  }

  if (!inserted)
    return { ok: false, message: "Unable to create game" } as const;

  const session: GameSession = {
    id: inserted.id,
    name: inserted.name,
    host_id: dataToInsert.host_id,
    game_type: input.type,
    game_status: inserted.game_status as GameStatus,
    max_players: inserted.max_players,
    current_players: inserted.current_players,
    created_at: inserted.created_at,
    updated_at: inserted.updated_at,
  };

  return { ok: true, data: session } as const;
}

export async function fetchAllGameSessions(): Promise<
  { ok: true; data: GameSession[] } | { ok: false; message: string }
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      "id,name,host_id,game_type,game_status,max_players,current_players,created_at,updated_at"
    )
    .order("created_at", { ascending: false });
  if (error) return { ok: false, message: error.message } as const;
  const sessions: GameSession[] = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    host_id: row.host_id,
    game_type: row.game_type as GameType,
    game_status: row.game_status as any,
    max_players: row.max_players,
    current_players: row.current_players,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
  return { ok: true, data: sessions } as const;
}

export async function fetchGameSessionById(
  id: string
): Promise<{ ok: true; data: GameSession } | { ok: false; message: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      "id,name,host_id,game_type,game_status,max_players,current_players,created_at,updated_at"
    )
    .eq("id", id)
    .single();
  if (error || !data)
    return { ok: false, message: error?.message || "Not found" } as const;
  const session: GameSession = {
    id: data.id,
    name: data.name,
    host_id: data.host_id,
    game_type: data.game_type as GameType,
    game_status: data.game_status as any,
    max_players: data.max_players,
    current_players: data.current_players,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
  return { ok: true, data: session } as const;
}

export async function requestJoin(
  gameId: string
): Promise<
  | { ok: true; data: JoinRequest; status: JoinRequest["status"] }
  | { ok: false; message: string }
> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    return { ok: false, message: "Not authenticated" } as const;

  const { data: existing } = await supabase
    .from("join_requests")
    .select("id,game_id,requester_id,status,created_at,updated_at")
    .eq("game_id", gameId)
    .eq("requester_id", user.id)
    .in("status", ["pending", "accepted"])
    .maybeSingle();
  if (existing)
    return {
      ok: true,
      data: existing as any,
      status: existing.status as JoinRequest["status"],
    } as const;

  const { data, error } = await supabase
    .from("join_requests")
    .insert({ game_id: gameId, requester_id: user.id, status: "pending" })
    .select("id,game_id,requester_id,status,created_at,updated_at")
    .single();
  if (error || !data)
    return {
      ok: false,
      message: error?.message || "Unable to request",
    } as const;
  return { ok: true, data: data as any, status: "pending" } as const;
}

export async function fetchPendingJoinRequests(
  gameId: string
): Promise<{ ok: true; data: JoinRequest[] } | { ok: false; message: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("join_requests")
    .select("id,game_id,requester_id,status,created_at,updated_at")
    .eq("game_id", gameId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) return { ok: false, message: error.message } as const;
  return { ok: true, data: (data || []) as any } as const;
}

export async function acceptJoinRequest(
  requestId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient();
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
  const supabase = createClient();
  const { error } = await supabase
    .from("join_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);
  if (error) return { ok: false, message: error.message } as const;
  return { ok: true } as const;
}

export function onMyJoinRequestStatus(
  gameId: string,
  requesterId: string,
  onChange: (status: JoinRequest["status"]) => void
) {
  const supabase = createClient();
  const channel = supabase
    .channel(`jr_${gameId}_${requesterId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "join_requests",
        filter: `game_id=eq.${gameId}`,
      },
      (payload: any) => {
        const row = payload.new as JoinRequest;
        if (row.requester_id === requesterId) onChange(row.status);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "join_requests",
        filter: `game_id=eq.${gameId}`,
      },
      (payload: any) => {
        const row = payload.new as JoinRequest;
        if (row.requester_id === requesterId) onChange(row.status);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function onPendingJoinRequests(
  gameId: string,
  onEvent: (event: "insert" | "update" | "delete", request: JoinRequest) => void
) {
  const supabase = createClient();
  const channel = supabase
    .channel(`jr_pending_${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "join_requests",
        filter: `game_id=eq.${gameId}`,
      },
      (payload: any) => onEvent("insert", payload.new as any)
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "join_requests",
        filter: `game_id=eq.${gameId}`,
      },
      (payload: any) => onEvent("update", payload.new as any)
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "join_requests",
        filter: `game_id=eq.${gameId}`,
      },
      (payload: any) => onEvent("delete", payload.old as any)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
