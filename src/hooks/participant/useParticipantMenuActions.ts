"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { joinRequests, hostTransfer } from "@convex/refs/lobby";
import type { Id } from "@convex/_generated/dataModel";
import { removeParticipantFromRoom } from "@/shared/lib/livekit/actions";
import type { useGameRoom } from "@/features/game-room/context/gameRoomContext";

type GameSessionState = NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;

export interface ParticipantMenuActionsResult {
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  canShowLobbyMenu: boolean;
  onKick: () => Promise<void>;
  onMakeHost: () => Promise<void>;
}

/**
 * Hook to manage participant menu state and actions (kick, make host).
 */
export function useParticipantMenuActions(
  gameId: string,
  participantId: string | undefined,
  hostUserId: string | null,
  isViewerHost: boolean,
  gameSessionState: GameSessionState | null
): ParticipantMenuActionsResult {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const kickMutation = useMutation(joinRequests.kick);
  const transferMutation = useMutation(hostTransfer.transfer);

  // Show menu in lobby (for kick/make host)
  const canShowLobbyMenu = useMemo(() => {
    return Boolean(
      isViewerHost &&
      participantId &&
      participantId !== hostUserId &&
      !gameSessionState
    );
  }, [isViewerHost, participantId, hostUserId, gameSessionState]);

  const onKick = useCallback(async () => {
    if (!participantId) return;
    try {
      await kickMutation({
        gameId: gameId as Id<"games">,
        targetUserId: participantId as Id<"profiles">,
      });
      await removeParticipantFromRoom(gameId, participantId);
      setMenuOpen(false);
    } catch (e) {
      console.error("Failed to kick player:", e);
    }
  }, [gameId, participantId, kickMutation]);

  const onMakeHost = useCallback(async () => {
    if (!participantId) return;
    try {
      await transferMutation({
        gameId: gameId as Id<"games">,
        newHostId: participantId as Id<"profiles">,
      });
      setMenuOpen(false);
    } catch (e) {
      console.error("Failed to transfer host:", e);
    }
  }, [gameId, participantId, transferMutation]);

  return {
    menuOpen,
    setMenuOpen,
    canShowLobbyMenu,
    onKick,
    onMakeHost,
  };
}
