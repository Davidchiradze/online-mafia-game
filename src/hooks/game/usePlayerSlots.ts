import { useMemo } from "react";
import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import type { useGameRoom } from "@/lib/context/gameRoomContext";

type GamePlayer = ReturnType<typeof useGameRoom>["players"][number];

export type PlayerSlotDescriptor = {
  key: number;
  track?: TrackReferenceOrPlaceholder;
};

type UsePlayerSlotsParams = {
  tracks: TrackReferenceOrPlaceholder[];
  hostUserId: string | null;
  maxPlayers: number;
  players?: GamePlayer[];
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
    slots.push({ key: maxPlayers + 1, track: hostTrack });

    // Build a seat map from DB seats: map player_id -> seat_number
    const playerIdToSeat = new Map<string, number>();
    if (players) {
      for (let i = 1; i <= maxPlayers; i++) {
        const player = players.find((p) => p.seatNumber === i);
        if (!player) continue;
        if (
          player.playerId &&
          player.seatNumber !== null &&
          player.seatNumber !== undefined
        ) {
          const seatNum = Number(player.seatNumber);
          if (
            Number.isInteger(seatNum) &&
            seatNum >= 1 &&
            seatNum <= maxPlayers
          ) {
            playerIdToSeat.set(player.playerId as string, seatNum);
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
