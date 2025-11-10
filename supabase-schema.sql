-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

create table public.game_players (
  id uuid not null default extensions.uuid_generate_v4 (),
  game_id uuid null,
  player_id uuid null,
  role text null,
  is_alive boolean null default true,
  joined_at timestamp with time zone null default now(),
  seat_number numeric null,
  fouls numeric null,
  constraint game_players_pkey primary key (id),
  constraint game_players_game_id_player_id_key unique (game_id, player_id),
  constraint game_players_game_id_fkey foreign KEY (game_id) references games (id) on delete CASCADE,
  constraint game_players_player_id_fkey foreign KEY (player_id) references profiles (id) on delete CASCADE,
  constraint game_players_role_check check (
    (
      role = any (
        array[
          'DON'::text,
          'MAFIA'::text,
          'MAFIA_RIGHT_HAND'::text,
          'SHOGUN'::text,
          'YAKUZA'::text,
          'DETECTIVE'::text,
          'CITIZEN'::text,
          'DOCTOR'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_game_players_game_id on public.game_players using btree (game_id) TABLESPACE pg_default;
create index IF not exists idx_game_players_player_id on public.game_players using btree (player_id) TABLESPACE pg_default;


CREATE TABLE public.games (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  host_id uuid,
  current_players integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  game_status USER-DEFINED NOT NULL DEFAULT 'not_started'::"game-status",
  game_type USER-DEFINED NOT NULL DEFAULT 'traditional'::game_type,
  max_players USER-DEFINED NOT NULL DEFAULT '10'::max_player_number,
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
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  nickname text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);