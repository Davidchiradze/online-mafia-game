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

    // Build a seat map from DB seats
    const seatToTrack: Record<number, TrackReferenceOrPlaceholder> = {};
    const seatAssignments = new Map<string, number>();
    for (const player of players || []) {
      if (player.player_id === null || player.seat_number === null) continue;
      const seatIndex = Number(player.seat_number);
      if (
        Number.isInteger(seatIndex) &&
        seatIndex >= 1 &&
        seatIndex <= maxPlayers
      ) {
        seatAssignments.set(player.player_id, seatIndex);
      }
    }

    for (const t of nonHostTracks) {
      const participantId = t?.participant?.identity;
      if (!participantId) continue;
      const seatIndex = seatAssignments.get(participantId);
      if (
        seatIndex !== undefined &&
        seatIndex !== null &&
        !seatToTrack[seatIndex]
      ) {
        seatToTrack[seatIndex] = t;
      }
    }

    // Fallback: fill remaining seats with any unseated tracks in stable identity order
    const unseated = nonHostTracks
      .filter((t) => !Object.values(seatToTrack).includes(t))
      .sort((a, b) => {
        const ai = a?.participant?.identity ?? "";
        const bi = b?.participant?.identity ?? "";
        return String(ai).localeCompare(String(bi));
      });

    let idx = 0;
    for (let i = 1; i <= maxPlayers; i++) {
      const trackAtSeat = seatToTrack[i] ?? unseated[idx];
      slots.push({ key: i as number, track: trackAtSeat });
      if (!seatToTrack[i] && unseated[idx]) idx++;
    }

    return slots;
  }, [tracks, hostUserId, maxPlayers, players]);
}
