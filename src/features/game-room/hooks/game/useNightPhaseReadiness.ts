"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { GamePhase, MAFIA_TEAM_ROLES } from "@/shared/lib/constants/game";
import { useGameFlags } from "./useGameFlags";

/**
 * Determines whether the host can end each night action phase.
 *
 * A phase button is disabled when the responsible player is alive but
 * has not yet submitted their action. Once the action is recorded in
 * `nightPhaseSession`, the reactive query fires and the button enables.
 */
export function useNightPhaseReadiness() {
  const {
    gameId,
    gameSessionState,
    nightPhaseSession,
    players,
    playerRolesMap,
    healedPlayers,
    hostUserId,
  } = useGameRoom();
  const { mafiaKillsOnFirstNight } = useGameFlags();

  // "Has the one shot been fired" spans every night of the game, so only the
  // server can answer it. Skipped outside the Serial Killer's phase, which is
  // the only place it is read — Japanese and Sports never subscribe.
  const serialKillerState = useQuery(
    nightPhase.checkSerialKillerAuthority,
    gameSessionState?.gamePhase === GamePhase.SERIAL_KILLER_CHOOSES_TARGET
      ? { gameId: gameId as Id<"games"> }
      : "skip",
  );
  const serialKillerShotSpent = serialKillerState?.shotSpent ?? false;

  /**
   * A first night on which the mafia only meet — there is no target to wait
   * for, so the host may advance immediately.
   *
   * This used to be a bare `nightNumber === 1`, which is the Japanese rule
   * applied to every variant. A variant that DOES kill on night 1 would let the
   * host skip past a kill the mafia are entitled to make.
   */
  const isNonKillingFirstNight =
    nightPhaseSession?.nightNumber === 1 && !mafiaKillsOnFirstNight;

  const canEndMafiaPhase = useMemo(() => {
    if (isNonKillingFirstNight) return true;

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
  }, [
    isNonKillingFirstNight,
    players,
    playerRolesMap,
    nightPhaseSession?.mafiaTarget,
  ]);

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

  /**
   * The Serial Killer's phase closes when there is nothing left to wait for.
   *
   * Three ways that happens, and only the first is unique to this ability:
   * the shot is already spent, it is night 1 (they may not fire at all), or
   * they are dead. Each is a night the host would otherwise sit on a disabled
   * button forever.
   *
   * "Spent" is derived from the night rows, so a shot the Doctor saved still
   * counts — the same answer the server gives `selectSerialKillerTarget`.
   */
  const canEndSerialKillerPhase = useMemo(() => {
    if (nightPhaseSession?.nightNumber === 1) return true;

    const hasAliveSerialKiller = players.some(
      (p) =>
        p.isAlive &&
        p.playerId &&
        playerRolesMap.get(p.playerId as string) === "SERIAL_KILLER",
    );
    if (!hasAliveSerialKiller) return true;

    if (serialKillerShotSpent) return true;

    return nightPhaseSession?.serialKillerTarget !== undefined;
  }, [
    players,
    playerRolesMap,
    nightPhaseSession?.nightNumber,
    nightPhaseSession?.serialKillerTarget,
    serialKillerShotSpent,
  ]);

  return {
    canEndMafiaPhase,
    canEndYakuzaPhase,
    canEndDoctorPhase,
    canEndSerialKillerPhase,
  };
}
