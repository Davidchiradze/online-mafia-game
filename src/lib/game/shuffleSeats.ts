import { Tables } from "@/db/supabase/database.types";

type GamePlayer = Pick<Tables<"game_players">, "id" | "seat_number">;

/**
 * Returns a new mapping of player ids to shuffled seat numbers.
 * - Only shuffles seats in the playable range [1..maxSeats].
 * - Leaves any seats outside that range untouched (e.g., host sentinel).
 */
export function buildShuffledSeatAssignments(
  players: GamePlayer[],
  maxSeats: number
): Array<{ playerId: string; newSeat: number }> {
  const seatedPlayers = players.filter(
    (p) =>
      p.seat_number !== null &&
      typeof p.seat_number === "number" &&
      p.seat_number >= 1 &&
      p.seat_number <= maxSeats
  );

  const seatNumbers = seatedPlayers.map((p) => Number(p.seat_number));

  // Fisher-Yates shuffle for determinism-quality
  for (let i = seatNumbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seatNumbers[i], seatNumbers[j]] = [seatNumbers[j], seatNumbers[i]];
  }

  return seatedPlayers.map((player, idx) => ({
    playerId: player.id,
    newSeat: seatNumbers[idx],
  }));
}
