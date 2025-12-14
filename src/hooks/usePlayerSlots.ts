import { useMemo } from "react";
import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Tables } from "@/db/supabase/database.types";

export type PlayerSlotDescriptor = {
  key: number | "host";
  track?: TrackReferenceOrPlaceholder;
};

type UsePlayerSlotsParams = {
  tracks: TrackReferenceOrPlaceholder[];
  hostUserId: string | null;
  maxPlayers: number;
  players?: Tables<"game_players">[];
};

/**
 * Derives stable seat descriptors for the player circle layout.
 * - Host is always placed at the "host" slot.
 * - Non-host tracks are seated by game_players.seat_number (DB-sourced).
 * - Remaining seats are filled in stable identity order.
 */
export function usePlayerSlots({
  tracks,
  hostUserId,
  maxPlayers,
  players,
}: UsePlayerSlotsParams): PlayerSlotDescriptor[] {
  return useMemo(() => {
    const hostTrack = tracks.find((t) => t.participant.identity === hostUserId);
    const nonHostTracks = tracks.filter(
      (t) => t.participant.identity !== hostUserId
    );

    const slots: PlayerSlotDescriptor[] = [];

    // host is always at row 2, col 2 (handled by consumer)
    slots.push({ key: "host", track: hostTrack });

    // Build a seat map from DB seats: map player_id -> seat_number
    const playerIdToSeat = new Map<string, number>();
    if (players) {
      for (let i = 1; i <= maxPlayers; i++) {
        const player = players.find((p) => p.seat_number === i);
        if (!player) continue;
        if (
          player.player_id &&
          player.seat_number !== null &&
          player.seat_number !== undefined
        ) {
          const seatNum = Number(player.seat_number);
          // Only assign seats 1..maxPlayers (exclude host sentinel seat)
          if (
            Number.isInteger(seatNum) &&
            seatNum >= 1 &&
            seatNum <= maxPlayers
          ) {
            playerIdToSeat.set(player.player_id, seatNum);
          }
        }
      }
    }

    // Map tracks to seats based on database assignments
    const seatToTrack: Record<number, TrackReferenceOrPlaceholder> = {};

    for (const t of nonHostTracks) {
      const participantId = t?.participant?.identity;
      if (!participantId) continue;

      const seatIndex = playerIdToSeat.get(participantId);
      if (
        seatIndex !== undefined &&
        seatIndex !== null &&
        !seatToTrack[seatIndex]
      ) {
        seatToTrack[seatIndex] = t;
      }
    }

    // Fill remaining seats with empty slots (don't rearrange existing players)
    for (let i = 1; i <= maxPlayers; i++) {
      slots.push({
        key: i as number,
        track: seatToTrack[i],
      });
    }

    return slots;
  }, [tracks, hostUserId, maxPlayers, players]);
}
