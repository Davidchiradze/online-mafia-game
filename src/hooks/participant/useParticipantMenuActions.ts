"use client";

import { useCallback, useMemo, useState } from "react";
import { kickPlayer, transferHost } from "@/lib/gameRoom/actions";
import { removeParticipantFromRoom } from "@/lib/liveKit/actions";
import { GameSessionState } from "@/types/game/type";

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
    await kickPlayer(gameId, participantId);
    await removeParticipantFromRoom(gameId, participantId);
    setMenuOpen(false);
  }, [gameId, participantId]);

  const onMakeHost = useCallback(async () => {
    if (!participantId) return;
    await transferHost(gameId, participantId);
    setMenuOpen(false);
  }, [gameId, participantId]);

  return {
    menuOpen,
    setMenuOpen,
    canShowLobbyMenu,
    onKick,
    onMakeHost,
  };
}
