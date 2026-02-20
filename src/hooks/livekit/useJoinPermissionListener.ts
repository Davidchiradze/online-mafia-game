"use client";

import { useEffect } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import { JoinRequest } from "@/types/game/type";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import { checkOrRequestJoin } from "@/lib/gameRoom/actions";
import { leaveGamePlayer } from "@/lib/gamePlayers/actions";

type Params = {
  gameId: string;
  room: LiveKitRoom;
  hasPlayerRecord: boolean;
  setJoinStatus: (status: JoinRequest["status"] | undefined) => void;
  /** If false, skip join permission check entirely (e.g., for spectators) */
  enabled?: boolean;
};

/**
 * Listens for join permission status and keeps room lifecycle aligned.
 * Disabled for spectators who don't need join permission.
 */
export function useJoinPermissionListener({
  gameId,
  room,
  hasPlayerRecord,
  setJoinStatus,
  enabled = true,
}: Params) {
  useEffect(() => {
    // Skip join permission check if disabled (e.g., spectators)
    if (!enabled) return;

    let mounted = true;
    checkOrRequestJoin(gameId).then((res) => {
      if (!mounted) return;
      if (res?.ok && res.allowed) {
        setJoinStatus(res.status ?? JOIN_REQUEST_STATUSES.ACCEPTED);
      } else if (res?.ok && !res.allowed) {
        setJoinStatus(res.status ?? JOIN_REQUEST_STATUSES.PENDING);
      }
    });
    return () => {
      mounted = false;
      if (hasPlayerRecord) void leaveGamePlayer(gameId);
      room.disconnect();
    };
  }, [gameId, room, hasPlayerRecord, setJoinStatus, enabled]);
}

