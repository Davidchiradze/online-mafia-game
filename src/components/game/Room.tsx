"use client";

import { useEffect, useMemo, useState } from "react";
import { useMyJoinRequestStatus } from "@/hooks/useJoinRequests";
import { JoinRequest } from "@/types/game/type";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import { checkOrRequestJoin } from "@/lib/gameSession/actions";
import LiveKitTestComponent from "../liveKit/LiveKitTestComponent";
import { Room as LiveKitRoom } from "livekit-client";
import { generateLivekitAccessToken } from "@/lib/liveKit/actions";
import WaitingRoom from "./WaitingRoom";
import { useLivekitRoom } from "@/hooks/useLivekitRoom";
import { useGameHostSubscription } from "@/hooks/useGameHostSubscription";

export default function Room({
  gameId,
  userId,
  hostUserId,
}: {
  gameId: string;
  userId: string;
  hostUserId: string;
}) {
  const [status, setStatus] = useState<JoinRequest["status"] | undefined>(
    undefined
  );
  const [currentHostId, setCurrentHostId] = useState<string>(hostUserId);
  const isHost = currentHostId === userId;
  const [token, setToken] = useState<string | null>(null);
  const [room] = useState(
    () =>
      new LiveKitRoom({
        // Optimize video quality for each participant's screen
        adaptiveStream: true,
        // Enable automatic audio/video quality optimization
        dynacast: true,
      })
  );

  // Redirect to lobby when room disconnects (button click, network, or kick)
  useLivekitRoom(room, { redirectOnDisconnect: true, redirectPath: "/lobby" });

  useEffect(() => {
    checkOrRequestJoin(gameId).then((res) => {
      if (res?.ok && res.allowed) {
        setStatus(res.status);
      }
    });
  }, [gameId]);

  useEffect(() => {
    if (status === JOIN_REQUEST_STATUSES.ACCEPTED && !isHost) {
      generateLivekitAccessToken(
        gameId,
        userId + "-" + Math.random().toString(36).substring(2, 15),
        {
          hidden: false,
          roomAdmin: false,
        }
      ).then((token) => {
        setToken(token);
        room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token || "");
        room.localParticipant.setCameraEnabled(true);
      });
    } else if (isHost) {
      generateLivekitAccessToken(gameId, userId, {
        hidden: false,
        roomAdmin: true,
      }).then((token) => {
        setToken(token);
        room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token || "");
        room.localParticipant.setCameraEnabled(true);
      });
    }
    return () => {
      console.log("disconnecting");
      room.disconnect();
    };
  }, [status, gameId, userId]);

  // Listen to my join request updates (kick -> disconnect)
  useMyJoinRequestStatus(gameId, userId, (nextStatus) => {
    setStatus(nextStatus);
    if (nextStatus === JOIN_REQUEST_STATUSES.REJECTED) {
      room.disconnect();
    }
  });

  // Subscribe to host changes for realtime seat/controls updates
  useGameHostSubscription(
    gameId,
    (newHostId) => {
      setCurrentHostId(newHostId);
    },
    true
  );

  return (
    <>
      {status !== JOIN_REQUEST_STATUSES.ACCEPTED && !isHost && (
        <WaitingRoom
          status={status ?? undefined}
          gameId={gameId}
          userId={userId}
        />
      )}

      {(status === JOIN_REQUEST_STATUSES.ACCEPTED || isHost) && (
        <LiveKitTestComponent
          gameId={gameId}
          room={room}
          hostUserId={currentHostId}
          token={token ?? ""}
          isHost={isHost}
          userId={userId}
        />
      )}
    </>
  );
}
