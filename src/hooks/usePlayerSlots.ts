import { useMemo } from "react";
import { TrackReferenceOrPlaceholder } from "@livekit/components-react";

export type PlayerSlotDescriptor = {
  key: number | "host";
  track?: TrackReferenceOrPlaceholder;
};

type UsePlayerSlotsParams = {
  tracks: TrackReferenceOrPlaceholder[];
  hostUserId: string;
  maxPlayers: number;
};

/**
 * Derives stable seat descriptors for the player circle layout.
 * - Host is always placed at the "host" slot.
 * - Non-host tracks are seated by `participant.metadata.seatIndex` when valid.
 * - Remaining seats are filled in stable identity order.
 */
export function usePlayerSlots({
  tracks,
  hostUserId,
  maxPlayers,
}: UsePlayerSlotsParams): PlayerSlotDescriptor[] {
  return useMemo(() => {
    const hostTrack = tracks.find((t) => t.participant.identity === hostUserId);
    const nonHostTracks = tracks.filter(
      (t) => t.participant.identity !== hostUserId
    );

    const slots: PlayerSlotDescriptor[] = [];

    // host is always at row 2, col 2 (handled by consumer)
    slots.push({ key: "host", track: hostTrack });

    // Build a seat map from participant.metadata.seatIndex
    const seatToTrack: Record<number, TrackReferenceOrPlaceholder> = {};
    for (const t of nonHostTracks) {
      try {
        const raw = (t as any)?.participant?.metadata as string | undefined;
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const seatIndex = (parsed as any)?.seatIndex;
        if (
          typeof seatIndex === "number" &&
          Number.isInteger(seatIndex) &&
          seatIndex >= 1 &&
          seatIndex <= maxPlayers &&
          !seatToTrack[seatIndex]
        ) {
          seatToTrack[seatIndex] = t;
        }
      } catch (_e) {
        // ignore malformed metadata
      }
    }

    // Fallback: fill remaining seats with any unseated tracks in stable identity order
    const unseated = nonHostTracks
      .filter((t) => !Object.values(seatToTrack).includes(t))
      .sort((a, b) => {
        const ai = (a as any)?.participant?.identity ?? "";
        const bi = (b as any)?.participant?.identity ?? "";
        return String(ai).localeCompare(String(bi));
      });

    let idx = 0;
    for (let i = 1; i <= maxPlayers; i++) {
      const trackAtSeat = seatToTrack[i] ?? unseated[idx];
      slots.push({ key: i as number, track: trackAtSeat });
      if (!seatToTrack[i] && unseated[idx]) idx++;
    }

    return slots;
  }, [tracks, hostUserId, maxPlayers]);
}
