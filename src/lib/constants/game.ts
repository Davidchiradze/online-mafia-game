export const GAME_TYPES = [
  "traditional",
  "city_mafia",
  "japanese_mafia",
] as const;

export const GAME_STATUSES = ["not_started", "playing", "finished"] as const;

export const GAME_TYPE_LABEL: Record<(typeof GAME_TYPES)[number], string> = {
  traditional: "Traditional",
  city_mafia: "City mafia",
  japanese_mafia: "Japanese mafia",
};

export const GAME_STATUS_LABEL: Record<(typeof GAME_STATUSES)[number], string> =
  {
    not_started: "Not started",
    playing: "Playing",
    finished: "Finished",
  };

export const GAME_TYPE_MAX_PLAYER_NUMBER: Record<
  (typeof GAME_TYPES)[number],
  number
> = {
  traditional: 10,
  city_mafia: 12,
  japanese_mafia: 12,
};
