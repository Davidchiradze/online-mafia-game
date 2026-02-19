"use client";

import { useEffect } from "react";
import {
  Room as LiveKitRoom,
  Track,
  LocalAudioTrack,
} from "livekit-client";
import { JoinRequest } from "@/types/game/type";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import { generateLivekitAccessToken } from "@/lib/liveKit/actions";

type Params = {
  gameId: string;
  userId: string;
  isHost: boolean;
  joinStatus: JoinRequest["status"] | undefined;
  isJoiningGame: boolean;
  hasPlayerRecord: boolean;
  joinError: string | null;
  room: LiveKitRoom;
  setLivekitToken: (token: string | null) => void;
};

/**
 * Connects to LiveKit once DB seat/permissions are ready.
 *
 * IMPORTANT: We create and publish both audio and video tracks immediately.
 * Audio track is published and then MUTED so that:
 * 1. The track exists on the server (required for server-side mute control)
 * 2. The player starts muted (no audio until server unmutes them)
 *
 * Server-side muting via mutePublishedTrack only works on published tracks.
 */
export function useLivekitConnect({
  gameId,
  userId,
  isHost,
  joinStatus,
  isJoiningGame,
  hasPlayerRecord,
  joinError,
  room,
  setLivekitToken,
}: Params) {
  useEffect(() => {
    async function connectIfNeeded() {
      if (!gameId || !userId || isJoiningGame || !hasPlayerRecord || joinError)
        return;
      const canConnect =
        isHost || joinStatus === JOIN_REQUEST_STATUSES.ACCEPTED;
      if (!canConnect) return;

      // Skip if already connected
      if (room.state === "connected") return;

      const token = await generateLivekitAccessToken(gameId, userId, {
        hidden: false,
        roomAdmin: isHost,
      });

      setLivekitToken(token ?? null);
      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token || "");

      // Create local tracks for both audio and video
      // We need to publish the audio track so server-side muting works
      const tracks = await room.localParticipant.createTracks({
        audio: true,
        video: true,
      });

      // Publish all tracks first, then mute audio
      // This ensures the audio track exists on the server for server-side mute control
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track);
      }

      // Mute audio track after publishing so server can control it
      // Find the audio track and mute it
      const audioTrack = tracks.find(
        (t) => t.kind === Track.Kind.Audio
      ) as LocalAudioTrack | undefined;
      if (audioTrack) {
        await audioTrack.mute();
      }
    }

    void connectIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameId,
    userId,
    isHost,
    joinStatus,
    isJoiningGame,
    hasPlayerRecord,
    joinError,
    room,
  ]);
}
