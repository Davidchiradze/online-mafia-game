"use client";

import { useEffect } from "react";
import {
  Room as LiveKitRoom,
  RoomEvent,
  ConnectionState,
} from "livekit-client";
import { useRouter } from "next/navigation";

type UseLivekitRoomOptions = {
  redirectOnDisconnect?: boolean;
  redirectPath?: string;
  onDisconnect?: () => void;
};

export function useLivekitRoom(
  room: LiveKitRoom | null | undefined,
  options?: UseLivekitRoomOptions
) {
  const router = useRouter();

  useEffect(() => {
    if (!room) return;

    const handleDisconnected = () => {
      if (options?.onDisconnect) options.onDisconnect();
      if (options?.redirectOnDisconnect !== false) {
        const path = options?.redirectPath ?? "/lobby";
        router.replace(path);
      }
    };

    const handleConnectionStateChanged = (state: ConnectionState) => {
      if (state === ConnectionState.Disconnected) {
        handleDisconnected();
      }
    };

    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
    };
  }, [room, router, options]);

  return { room };
}
