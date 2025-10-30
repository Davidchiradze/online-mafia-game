import { Tables } from "@/db/supabase/database.types";

export type DbGame = Tables<"games">;
export type DbJoinRequest = Tables<"join_requests">;

export type GameSession = Pick<
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
>;

export type JoinRequest = Pick<
  DbJoinRequest,
  "id" | "game_id" | "requester_id" | "status" | "created_at" | "updated_at"
> & {
  requester_nickname?: string;
};
