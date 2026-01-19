"use client";

import { useMemo } from "react";
import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Tables } from "@/db/supabase/database.types";

export interface ParticipantStateResult {
  participant: TrackReferenceOrPlaceholder["participant"] | undefined;
  isLocal: boolean;
  isMicEnabled: boolean;
  displayName: string | undefined;
  participantId: string | undefined;
  isViewerHost: boolean;
  isTargetHost: boolean;
  isDisconnected: boolean;
}

/**
 * Hook to extract basic participant state from track reference and player data.
 */
export function useParticipantState(
  trackRef: TrackReferenceOrPlaceholder | undefined,
  player: Tables<"game_players">,
  currentUserId: string,
  hostUserId: string | null
): ParticipantStateResult {
  const participant = trackRef?.participant;
  const isLocal = Boolean(participant?.isLocal);
  const isMicEnabled = Boolean(participant?.isMicrophoneEnabled);
  const displayName = participant?.name || participant?.identity;
  const participantId = participant?.identity;
  const isViewerHost = currentUserId === hostUserId;
  const isTargetHost = participantId === hostUserId;

  const isDisconnected = useMemo(() => {
    return player?.state === "disconnected";
  }, [player]);

  return {
    participant,
    isLocal,
    isMicEnabled,
    displayName,
    participantId,
    isViewerHost,
    isTargetHost,
    isDisconnected,
  };
}

