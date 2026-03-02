"use client";

import { useMemo } from "react";
import { GameSessionState } from "@/types/game/type";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { MAFIA_TEAM_ROLES } from "@/lib/constants/game";

export interface MafiaTargetSelectionResult {
  hasMafiaKillAuthority: boolean;
  isMafiaPhase: boolean;
  isMafiaTargetSelected: boolean;
  shouldShowMafiaTargetIndicator: boolean;
  canShowMafiaKillButton: boolean;
}

/**
 * Hook to determine mafia target selection state and visibility.
 *
 * Security model:
 * - Host: sees target via nightPhaseSession from context
 * - Mafia team members: see target via nightPhaseSession (temporary - RLS removed)
 * - Other players: cannot see targets
 *
 * @param gameSessionState - Current game session state
 * @param seatNumber - Seat number of the target player being rendered
 * @param isViewerHost - Whether the viewer is the host
 * @param isTargetHost - Whether the target player is the host
 * @param isPlayerAlive - Whether the target player is alive
 * @param hasMafiaKillAuthority - Pre-computed authority from useNightActionAuthority
 * @param isMafiaPhase - Pre-computed phase check from useNightActionAuthority
 */
export function useMafiaTargetSelection(
  gameSessionState: GameSessionState | null,
  seatNumber: number | null,
  isViewerHost: boolean,
  isTargetHost: boolean,
  isPlayerAlive: boolean,
  hasMafiaKillAuthority: boolean,
  isMafiaPhase: boolean
): MafiaTargetSelectionResult {
  const { nightPhaseSession, viewerRole } = useGameRoom();

  const isViewerOnMafiaTeam = useMemo(() => {
    if (!viewerRole) return false;
    return MAFIA_TEAM_ROLES.includes(
      viewerRole as (typeof MAFIA_TEAM_ROLES)[number]
    );
  }, [viewerRole]);

  const isMafiaTargetSelected = useMemo(() => {
    if (!gameSessionState || seatNumber === null) return false;
    const isInMafiaPhase =
      gameSessionState.game_phase === "mafia_chooses_target";
    if (!isInMafiaPhase) return false;

    if ((isViewerHost || isViewerOnMafiaTeam) && nightPhaseSession) {
      return nightPhaseSession.mafia_target === seatNumber;
    }

    return false;
  }, [
    gameSessionState,
    seatNumber,
    isViewerHost,
    isViewerOnMafiaTeam,
    nightPhaseSession,
  ]);

  const shouldShowMafiaTargetIndicator = useMemo(() => {
    if (!isMafiaTargetSelected) return false;
    return isViewerHost || isViewerOnMafiaTeam;
  }, [isMafiaTargetSelected, isViewerHost, isViewerOnMafiaTeam]);

  const canShowMafiaKillButton = useMemo(() => {
    if (!isMafiaPhase || !hasMafiaKillAuthority) return false;
    if (isTargetHost) return false;
    if (isPlayerAlive === false) return false;
    if (nightPhaseSession?.night_number === 1) return false;
    if (
      nightPhaseSession?.mafia_target !== null &&
      nightPhaseSession?.mafia_target !== undefined
    )
      return false;
    return true;
  }, [
    isMafiaPhase,
    hasMafiaKillAuthority,
    isTargetHost,
    isPlayerAlive,
    nightPhaseSession?.night_number,
    nightPhaseSession?.mafia_target,
  ]);

  return {
    hasMafiaKillAuthority,
    isMafiaPhase,
    isMafiaTargetSelected,
    shouldShowMafiaTargetIndicator,
    canShowMafiaKillButton,
  };
}
