export enum GameType {
  Traditional = "traditional",
  CityMafia = "city_mafia",
  JapaneseMafia = "japanese_mafia",
}

export enum GameStatus {
  NotStarted = "not_started",
  Playing = "playing",
  Finished = "finished",
}

export const GAME_TYPE_LABEL: Record<GameType, string> = {
  [GameType.Traditional]: "Traditional",
  [GameType.CityMafia]: "City mafia",
  [GameType.JapaneseMafia]: "Japanese mafia",
};

export const GAME_STATUS_LABEL: Record<GameStatus, string> = {
  [GameStatus.NotStarted]: "Not started",
  [GameStatus.Playing]: "Playing",
  [GameStatus.Finished]: "Finished",
};

export const GAME_TYPE_MAX_PLAYER_NUMBER: Record<GameType, number> = {
  [GameType.Traditional]: 10,
  [GameType.CityMafia]: 12,
  [GameType.JapaneseMafia]: 12,
};
