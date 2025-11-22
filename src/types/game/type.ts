import { Tables } from "@/db/supabase/database.types";

export type DbGame = Tables<"games">;
export type DbJoinRequest = Tables<"join_requests">;

export type GameRoom = Pick<
  DbGame,
  | "id"
  | "name"
  | "host_id"
  | "game_type"
  | "game_status"
  | "max_players"
  | "current_players"
  | "created_at"
  | "updated_at"
> & {
  participant_names: string[];
};

export type JoinRequest = Pick<
  DbJoinRequest,
  | "id"
  | "game_id"
  | "requester_id"
  | "status"
  | "created_at"
  | "updated_at"
  | "requester_nickname"
>;

export type GameSession = Tables<"game_sessions">;

export type GameSessionState = GameSession & {
  playerData: Tables<"game_players">; // Current user's player data
  allPlayers?: Tables<"game_players">[]; // All players in the game (for visibility checks)
};
