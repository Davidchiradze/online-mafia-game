"use client";

import { useEffect } from "react";
import { Room as LiveKitRoom } from "livekit-client";
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

      const token = await generateLivekitAccessToken(gameId, userId, {
        hidden: false,
        roomAdmin: isHost,
      });

      setLivekitToken(token ?? null);
      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token || "");
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(false);
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
