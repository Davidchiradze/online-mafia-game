"use client";

import { useMemo } from "react";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { MAFIA_TEAM_ROLES } from "@/shared/lib/constants/game";

/**
 * Determines whether the host can end each night action phase.
 *
 * A phase button is disabled when the responsible player is alive but
 * has not yet submitted their action. Once the action is recorded in
 * `nightPhaseSession`, the reactive query fires and the button enables.
 */
export function useNightPhaseReadiness() {
  const {
    nightPhaseSession,
    players,
    playerRolesMap,
    healedPlayers,
    hostUserId,
  } = useGameRoom();

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

    if (nightPhaseSession?.healedPlayer !== undefined) return true;

    // Doctor can heal each player only once per game. If every alive
    // non-host player has already been healed in a previous night, the
    // doctor has no valid target left, so the phase can be ended without
    // action. The host is not a participant of the game and cannot be healed.
    const aliveSeats = players
      .filter(
        (p) =>
          p.isAlive &&
          typeof p.seatNumber === "number" &&
          (p.playerId as string) !== hostUserId,
      )
      .map((p) => p.seatNumber as number);

    if (aliveSeats.length === 0) return true;

    return aliveSeats.every((seat) => healedPlayers.includes(seat));
  }, [
    players,
    playerRolesMap,
    nightPhaseSession?.healedPlayer,
    healedPlayers,
    hostUserId,
  ]);

  return { canEndMafiaPhase, canEndYakuzaPhase, canEndDoctorPhase };
}
