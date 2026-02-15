export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      game_player_roles: {
        Row: {
          created_at: string | null
          game_id: string
          id: string
          player_id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          game_id: string
          id?: string
          player_id: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string
          id?: string
          player_id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_player_roles_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_player_roles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          fouls: number | null
          game_id: string | null
          id: string
          is_alive: boolean | null
          joined_at: string | null
          nickname: string | null
          player_id: string | null
          seat_number: number | null
          state: string | null
        }
        Insert: {
          fouls?: number | null
          game_id?: string | null
          id?: string
          is_alive?: boolean | null
          joined_at?: string | null
          nickname?: string | null
          player_id?: string | null
          seat_number?: number | null
          state?: string | null
        }
        Update: {
          fouls?: number | null
          game_id?: string | null
          id?: string
          is_alive?: boolean | null
          joined_at?: string | null
          nickname?: string | null
          player_id?: string | null
          seat_number?: number | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          created_at: string | null
          current_night_number: number
          current_speaker_index: number | null
          day_round_opener_index: number | null
          foul_elimination_occurred: boolean | null
          game_id: string
          game_phase: string
          id: string
          is_finished: boolean
          nominated_players: number[]
          speaker_started_at: string | null
          speaking_order: number[]
        }
        Insert: {
          created_at?: string | null
          current_night_number?: number
          current_speaker_index?: number | null
          day_round_opener_index?: number | null
          foul_elimination_occurred?: boolean | null
          game_id: string
          game_phase: string
          id?: string
          is_finished?: boolean
          nominated_players?: number[]
          speaker_started_at?: string | null
          speaking_order?: number[]
        }
        Update: {
          created_at?: string | null
          current_night_number?: number
          current_speaker_index?: number | null
          day_round_opener_index?: number | null
          foul_elimination_occurred?: boolean | null
          game_id?: string
          game_phase?: string
          id?: string
          is_finished?: boolean
          nominated_players?: number[]
          speaker_started_at?: string | null
          speaking_order?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          code: string
          created_at: string | null
          game_status: Database["public"]["Enums"]["game-status"]
          game_type: Database["public"]["Enums"]["game_type"]
          host_id: string | null
          id: string
          max_players: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          game_status?: Database["public"]["Enums"]["game-status"]
          game_type?: Database["public"]["Enums"]["game_type"]
          host_id?: string | null
          id?: string
          max_players?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          game_status?: Database["public"]["Enums"]["game-status"]
          game_type?: Database["public"]["Enums"]["game_type"]
          host_id?: string | null
          id?: string
          max_players?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          created_at: string | null
          game_id: string
          id: string
          requester_id: string
          requester_nickname: string
          status: Database["public"]["Enums"]["join_request_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          game_id: string
          id?: string
          requester_id: string
          requester_nickname: string
          status?: Database["public"]["Enums"]["join_request_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string
          id?: string
          requester_id?: string
          requester_nickname?: string
          status?: Database["public"]["Enums"]["join_request_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      night_phase_sessions: {
        Row: {
          created_at: string | null
          game_id: string
          healed_player: number | null
          id: string
          mafia_target: number | null
          night_number: number
          updated_at: string | null
          yakuza_target: number | null
        }
        Insert: {
          created_at?: string | null
          game_id: string
          healed_player?: number | null
          id?: string
          mafia_target?: number | null
          night_number: number
          updated_at?: string | null
          yakuza_target?: number | null
        }
        Update: {
          created_at?: string | null
          game_id?: string
          healed_player?: number | null
          id?: string
          mafia_target?: number | null
          night_number?: number
          updated_at?: string | null
          yakuza_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "night_phase_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nickname: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          nickname: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nickname?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string | null
          id: string
          is_auto_vote: boolean
          is_both_leave: boolean
          seat_number: number | null
          voter_seat: number
          voting_session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_auto_vote?: boolean
          is_both_leave?: boolean
          seat_number?: number | null
          voter_seat: number
          voting_session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_auto_vote?: boolean
          is_both_leave?: boolean
          seat_number?: number | null
          voter_seat?: number
          voting_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_voting_session_id_fkey"
            columns: ["voting_session_id"]
            isOneToOne: false
            referencedRelation: "voting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_sessions: {
        Row: {
          both_leave_vote_active: boolean | null
          candidates: number[]
          created_at: string | null
          current_candidate_index: number | null
          game_id: string
          id: string
          is_tie_break: boolean | null
          players_who_voted: number[] | null
          previous_tied_candidates: number[] | null
          round_number: number
          tie_break_round: number | null
          votes: Json | null
          voting_active: boolean | null
          voting_started_at: string | null
        }
        Insert: {
          both_leave_vote_active?: boolean | null
          candidates: number[]
          created_at?: string | null
          current_candidate_index?: number | null
          game_id: string
          id?: string
          is_tie_break?: boolean | null
          players_who_voted?: number[] | null
          previous_tied_candidates?: number[] | null
          round_number?: number
          tie_break_round?: number | null
          votes?: Json | null
          voting_active?: boolean | null
          voting_started_at?: string | null
        }
        Update: {
          both_leave_vote_active?: boolean | null
          candidates?: number[]
          created_at?: string | null
          current_candidate_index?: number | null
          game_id?: string
          id?: string
          is_tie_break?: boolean | null
          players_who_voted?: number[] | null
          previous_tied_candidates?: number[] | null
          round_number?: number
          tie_break_round?: number | null
          votes?: Json | null
          voting_active?: boolean | null
          voting_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voting_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      game_type: "traditional" | "city_mafia" | "japanese_mafia"
      "game-status": "not_started" | "playing" | "finished"
      join_request_status: "pending" | "accepted" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      game_type: ["traditional", "city_mafia", "japanese_mafia"],
      "game-status": ["not_started", "playing", "finished"],
      join_request_status: ["pending", "accepted", "rejected"],
    },
  },
} as const
