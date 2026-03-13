"use client";

import { useEffect } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import { generateLivekitAccessToken } from "@/lib/liveKit/actions";

type Params = {
  gameId: string;
  userId: string;
  isHost: boolean;
  joinStatus: string | undefined;
  isJoiningGame: boolean;
  hasPlayerRecord: boolean;
  joinError: string | null;
  room: LiveKitRoom;
  setLivekitToken: (token: string | null) => void;
  isSpectator?: boolean;
  participantName?: string;
};

/**
 * Connects to LiveKit once DB seat/permissions are ready.
 * For spectators, connects immediately without waiting for player record.
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
  isSpectator = false,
  participantName,
}: Params) {
  useEffect(() => {
    async function connectIfNeeded() {
      if (!gameId || !userId || joinError) return;

      // Spectators have different connection logic - they don't need player records
      if (isSpectator) {
        // Spectators can connect immediately without a player record
        if (isJoiningGame) return;

        const token = await generateLivekitAccessToken(gameId, userId, {
          hidden: true,
          roomAdmin: false,
          isSpectator: true,
        }, participantName);

        setLivekitToken(token ?? null);
        await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token || "");
        // Spectators don't enable camera or microphone
        return;
      }

      // Regular player connection logic
      if (isJoiningGame || !hasPlayerRecord) return;
      const canConnect =
        isHost || joinStatus === JOIN_REQUEST_STATUSES.ACCEPTED;
      if (!canConnect) return;

      const token = await generateLivekitAccessToken(gameId, userId, {
        hidden: false,
        roomAdmin: isHost,
      }, participantName);

      setLivekitToken(token ?? null);
      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token || "");
      room.localParticipant.setMicrophoneEnabled(false);
      room.localParticipant.setCameraEnabled(true);
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
    isSpectator,
    participantName,
  ]);
}
