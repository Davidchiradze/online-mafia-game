"use client";

import { useCallback, useState } from "react";
import { killPlayer } from "@/lib/gamePlayers/actions";

export interface ParticipantKillResult {
  killModalOpen: boolean;
  setKillModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isKilling: boolean;
  onKillClick: () => void;
  onConfirmKill: () => Promise<void>;
}

/**
 * Hook to manage the kill player modal and actions.
 */
export function useParticipantKill(
  gameId: string,
  participantId: string | undefined,
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
): ParticipantKillResult {
  const [killModalOpen, setKillModalOpen] = useState<boolean>(false);
  const [isKilling, setIsKilling] = useState<boolean>(false);

  const onKillClick = useCallback(() => {
    setMenuOpen(false);
    setKillModalOpen(true);
  }, [setMenuOpen]);

  const onConfirmKill = useCallback(async () => {
    if (!participantId) return;
    setIsKilling(true);
    const result = await killPlayer(gameId, participantId);
    setIsKilling(false);
    if (result.ok) {
      setKillModalOpen(false);
    } else {
      alert(result.message || "Failed to kill player");
    }
  }, [gameId, participantId]);

  return {
    killModalOpen,
    setKillModalOpen,
    isKilling,
    onKillClick,
    onConfirmKill,
  };
}
