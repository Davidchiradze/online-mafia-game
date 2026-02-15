-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.game_player_roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  game_id uuid NOT NULL,
  player_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['DON'::text, 'MAFIA'::text, 'MAFIA_RIGHT_HAND'::text, 'SHOGUN'::text, 'YAKUZA'::text, 'DETECTIVE'::text, 'CITIZEN'::text, 'DOCTOR'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT game_player_roles_pkey PRIMARY KEY (id),
  CONSTRAINT game_player_roles_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id),
  CONSTRAINT game_player_roles_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.game_players (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  game_id uuid,
  player_id uuid,
  is_alive boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  seat_number numeric,
  fouls numeric,
  state text,
  nickname text,
  CONSTRAINT game_players_pkey PRIMARY KEY (id),
  CONSTRAINT game_players_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id),
  CONSTRAINT game_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.game_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  game_id uuid NOT NULL UNIQUE,
  game_phase text NOT NULL,
  is_finished boolean NOT NULL DEFAULT false,
  nominated_players ARRAY NOT NULL DEFAULT '{}'::integer[],
  created_at timestamp with time zone DEFAULT now(),
  day_round_opener_index integer,
  current_speaker_index integer,
  speaker_started_at timestamp with time zone,
  speaking_order ARRAY NOT NULL DEFAULT '{}'::integer[],
  current_night_number numeric NOT NULL DEFAULT '0'::numeric,
  foul_elimination_occurred boolean DEFAULT false,
  CONSTRAINT game_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT game_sessions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);
CREATE TABLE public.games (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  host_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  game_status USER-DEFINED NOT NULL DEFAULT 'not_started'::"game-status",
  game_type USER-DEFINED NOT NULL DEFAULT 'traditional'::game_type,
  max_players integer DEFAULT 12,
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.join_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  game_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status USER-DEFINED NOT NULL DEFAULT 'pending'::join_request_status,
  requester_nickname text NOT NULL,
  CONSTRAINT join_requests_pkey PRIMARY KEY (id),
  CONSTRAINT join_requests_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id),
  CONSTRAINT join_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.night_phase_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  game_id uuid NOT NULL,
  night_number integer NOT NULL,
  mafia_target integer,
  yakuza_target integer,
  healed_player integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT night_phase_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT night_phase_sessions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  nickname text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  voting_session_id uuid NOT NULL,
  voter_seat integer NOT NULL,
  seat_number integer,
  is_both_leave boolean NOT NULL DEFAULT false,
  is_auto_vote boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT votes_pkey PRIMARY KEY (id),
  CONSTRAINT votes_voting_session_id_fkey FOREIGN KEY (voting_session_id) REFERENCES public.voting_sessions(id)
);
CREATE TABLE public.voting_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  round_number integer NOT NULL DEFAULT 1,
  candidates ARRAY NOT NULL,
  current_candidate_index integer DEFAULT 0,
  voting_active boolean DEFAULT false,
  voting_started_at timestamp with time zone,
  votes jsonb DEFAULT '{}'::jsonb,
  players_who_voted ARRAY DEFAULT '{}'::integer[],
  is_tie_break boolean DEFAULT false,
  tie_break_round integer DEFAULT 0,
  previous_tied_candidates ARRAY,
  both_leave_vote_active boolean DEFAULT false,
  CONSTRAINT voting_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT voting_sessions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);