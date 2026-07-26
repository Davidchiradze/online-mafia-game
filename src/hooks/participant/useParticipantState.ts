"use client";

import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import type { useGameRoom } from "@/lib/context/gameRoomContext";

type Player = NonNullable<ReturnType<typeof useGameRoom>["players"]>[number];

export interface ParticipantStateResult {
  participant: TrackReferenceOrPlaceholder["participant"] | undefined;
  isLocal: boolean;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  displayName: string | undefined;
  participantId: string | undefined;
  isViewerHost: boolean;
  isTargetHost: boolean;
}

/**
 * Hook to extract basic participant state from track reference and player data.
 */
export function useParticipantState(
  trackRef: TrackReferenceOrPlaceholder | undefined,
  player: Player,
  currentUserId: string,
  hostUserId: string | null,
): ParticipantStateResult {
  const participant = trackRef?.participant;
  const isLocal = Boolean(participant?.isLocal);
  const isMicEnabled = Boolean(participant?.isMicrophoneEnabled);
  const isCameraEnabled = Boolean(participant?.isCameraEnabled);
  const displayName = player.nickname || participant?.identity;
  const participantId =
    (player.playerId as string | undefined) ?? participant?.identity;
  const isViewerHost = currentUserId === hostUserId;
  const isTargetHost = participantId === hostUserId;

  return {
    participant,
    isLocal,
    isMicEnabled,
    isCameraEnabled,
    displayName,
    participantId,
    isViewerHost,
    isTargetHost,
  };
}
