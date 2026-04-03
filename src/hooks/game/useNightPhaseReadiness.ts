"use client";

import { useMemo } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { MAFIA_TEAM_ROLES } from "@/lib/constants/game";

/**
 * Determines whether the host can end each night action phase.
 *
 * A phase button is disabled when the responsible player is alive but
 * has not yet submitted their action. Once the action is recorded in
 * `nightPhaseSession`, the reactive query fires and the button enables.
 */
export function useNightPhaseReadiness() {
  const { nightPhaseSession, players, playerRolesMap } = useGameRoom();

  const isFirstNight = nightPhaseSession?.nightNumber === 1;

  const canEndMafiaPhase = useMemo(() => {
    if (isFirstNight) return true;

    const hasAliveMafia = players.some(
      (p) =>
        p.isAlive &&
        p.playerId &&
        MAFIA_TEAM_ROLES.includes(
          (playerRolesMap.get(p.playerId as string) ?? "") as (typeof MAFIA_TEAM_ROLES)[number],
        ),
    );
    if (!hasAliveMafia) return true;

    return nightPhaseSession?.mafiaTarget !== undefined;
  }, [isFirstNight, players, playerRolesMap, nightPhaseSession?.mafiaTarget]);

  const canEndYakuzaPhase = useMemo(() => {
    const hasAliveYakuza = players.some(
      (p) =>
        p.isAlive &&
        p.playerId &&
        playerRolesMap.get(p.playerId as string) === "YAKUZA",
    );
    if (!hasAliveYakuza) return true;

    return nightPhaseSession?.yakuzaTarget !== undefined;
  }, [players, playerRolesMap, nightPhaseSession?.yakuzaTarget]);

  const canEndDoctorPhase = useMemo(() => {
    const hasAliveDoctor = players.some(
      (p) =>
        p.isAlive &&
        p.playerId &&
        playerRolesMap.get(p.playerId as string) === "DOCTOR",
    );
    if (!hasAliveDoctor) return true;

    return nightPhaseSession?.healedPlayer !== undefined;
  }, [players, playerRolesMap, nightPhaseSession?.healedPlayer]);

  return { canEndMafiaPhase, canEndYakuzaPhase, canEndDoctorPhase };
}
