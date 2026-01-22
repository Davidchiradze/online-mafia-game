"use client";

import { useEffect, useMemo, useState } from "react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";

type ParticipantLike = {
  metadata?: string | null;
};

export function useParticipantMetadata(
  trackRef: TrackReferenceOrPlaceholder | undefined
): Record<string, unknown> | null {
  const participant: ParticipantLike | undefined = useMemo(
    () => trackRef?.participant as ParticipantLike | undefined,
    [trackRef]
  );

  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(
    () => {
      try {
        if (!participant?.metadata) return null;
        return JSON.parse(participant.metadata) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  );

  useEffect(() => {
    const parseAndSet = () => {
      try {
        if (!participant?.metadata) {
          setMetadata(null);
          return;
        }
        const parsed = JSON.parse(participant.metadata) as Record<
          string,
          unknown
        >;
        setMetadata(parsed);
      } catch {
        setMetadata(null);
      }
    };

    parseAndSet();

    return () => {};
  }, [trackRef, participant]);

  return metadata;
}

