-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.game_players (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  game_id uuid,
  player_id uuid,
  role text CHECK (role = ANY (ARRAY['mafia'::text, 'don'::text, 'detective'::text, 'citizen'::text])),
  is_alive boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT game_players_pkey PRIMARY KEY (id),
  CONSTRAINT game_players_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id),
  CONSTRAINT game_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.games (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  host_id uuid,
  game_status text NOT NULL DEFAULT 'waiting'::text CHECK (game_status = ANY (ARRAY['not_started'::text, 'playing'::text, 'finished'::text])),
  max_players integer NOT NULL DEFAULT 10,
  current_players integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  game_type text,
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.profiles(id)
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