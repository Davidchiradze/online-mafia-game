"use client";

import { useCallback, useMemo, useState } from "react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { useParticipantMetadata } from "./useParticipantMetadata";
import { setParticipantReady } from "@/lib/liveKit/actions";

export function useParticipantReady(
  gameId: string,
  participantId: string | undefined,
  trackRef: TrackReferenceOrPlaceholder | undefined
) {
  const [isLoading, setIsLoading] = useState(false);
  const metadata = useParticipantMetadata(trackRef);

  const isReady = useMemo(() => {
    return Boolean(metadata?.ready);
  }, [metadata]);

  const markReady = useCallback(async () => {
    if (!gameId || !participantId) return;
    try {
      setIsLoading(true);
      await setParticipantReady(gameId, participantId, true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, participantId]);

  const markUnready = useCallback(async () => {
    if (!gameId || !participantId) return;
    try {
      setIsLoading(true);
      await setParticipantReady(gameId, participantId, false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, participantId]);

  const toggleReady = useCallback(async () => {
    if (isLoading) return;
    if (isReady) {
      await markUnready();
    } else {
      await markReady();
    }
  }, [isReady, markReady, markUnready, isLoading]);

  return { isReady, markReady, markUnready, toggleReady, isLoading } as const;
}
