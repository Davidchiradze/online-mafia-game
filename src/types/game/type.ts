import { GameStatus, GameType } from "@/lib/constants/game";

export type GameSession = {
  id: string;
  name: string;
  host_id: string;
  game_type: GameType;
  game_status: GameStatus;
  max_players: number;
  current_players: number;
  created_at: string;
  updated_at: string;
};

export type JoinRequest = {
  id: string;
  game_id: string;
  requester_id: string;
  requester_nickname: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
};
