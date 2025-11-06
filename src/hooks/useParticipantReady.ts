"use client";

import { useCallback, useMemo } from "react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { useParticipantMetadata } from "./useParticipantMetadata";
import { setParticipantReady } from "@/lib/liveKit/actions";

export function useParticipantReady(
  gameId: string,
  participantId: string | undefined,
  trackRef: TrackReferenceOrPlaceholder | undefined
) {
  const metadata = useParticipantMetadata(trackRef);

  const isReady = useMemo(() => {
    return Boolean((metadata as any)?.ready);
  }, [metadata]);

  const markReady = useCallback(async () => {
    console.log("🚀 ~ useParticipantReady ~ participantId:", participantId);
    if (!gameId || !participantId) return;
    await setParticipantReady(gameId, participantId, true);
  }, [gameId, participantId]);

  const markUnready = useCallback(async () => {
    if (!gameId || !participantId) return;
    await setParticipantReady(gameId, participantId, false);
  }, [gameId, participantId]);

  const toggleReady = useCallback(async () => {
    if (isReady) {
      await markUnready();
    } else {
      await markReady();
    }
  }, [isReady, markReady, markUnready]);

  return { isReady, markReady, markUnready, toggleReady } as const;
}
