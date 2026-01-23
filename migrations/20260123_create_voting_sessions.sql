-- Create voting_sessions table for tracking voting phase state
-- This table stores the current voting session for each game

CREATE TABLE IF NOT EXISTS voting_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  -- Voting round tracking
  round_number int NOT NULL DEFAULT 1,
  
  -- Candidates being voted on (seat numbers from nominated_players)
  candidates int[] NOT NULL,
  current_candidate_index int NOT NULL DEFAULT 0,
  
  -- Voting window state
  voting_active boolean NOT NULL DEFAULT false,
  voting_started_at timestamptz,
  
  -- Vote tracking: { "seatNum": [voterSeatNumbers] }
  votes jsonb NOT NULL DEFAULT '{}',
  
  -- Players who have voted in this round (resets per candidate)
  players_who_voted int[] NOT NULL DEFAULT '{}',
  
  -- Tie-break state
  is_tie_break boolean NOT NULL DEFAULT false,
  tie_break_round int NOT NULL DEFAULT 0,
  previous_tied_candidates int[],
  
  -- "Both leave" vote state (when same players tie twice)
  both_leave_vote_active boolean NOT NULL DEFAULT false,
  both_leave_votes int[] NOT NULL DEFAULT '{}',
  
  -- Ensure one voting session per game
  UNIQUE(game_id)
);

-- Index for fast lookups by game_id
CREATE INDEX IF NOT EXISTS idx_voting_sessions_game_id ON voting_sessions(game_id);

-- Enable realtime for voting_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE voting_sessions;

-- RLS policies (all players in the game can read, only server can write)
ALTER TABLE voting_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read voting sessions for games they're in
CREATE POLICY "Players can view voting sessions for their games"
  ON voting_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = voting_sessions.game_id
        AND game_players.player_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = voting_sessions.game_id
        AND games.host_id = auth.uid()
    )
  );

