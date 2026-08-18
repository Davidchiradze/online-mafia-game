"use client";

import { useQuery } from "convex/react";
import { nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { useNightActionAuthority } from "@/features/game-room/hooks/game/useNightActionAuthority";
import SerialKillerKillButton from "@/features/game-room/components/actions/SerialKillerKillButton";
import NightActionWrapper from "./NightActionWrapper";

interface SerialKillerKillControlProps {
  seatNumber: number;
  isTargetHost: boolean;
  isPlayerAlive: boolean;
}

/**
 * The Serial Killer's kill control for one tile
 * (docs/variants/serial_killer/rules.md §5).
 *
 * SELF-GATED, like `BestMoveControl`: it reads its own phase and authority
 * rather than having three more props threaded through `ParticipantComponent`
 * for a variant most games are not. In Japanese and Sports
 * `isSerialKillerPhase` is a declared `false`, so this renders nothing.
 *
 * The availability rule — not night 1, not already fired — is NOT re-derived
 * here. It comes from the server's `canFire`, the same answer
 * `selectSerialKillerTarget` enforces, so the button cannot offer a shot the
 * mutation will reject.
 */
export default function SerialKillerKillControl({
  seatNumber,
  isTargetHost,
  isPlayerAlive,
}: SerialKillerKillControlProps) {
  const { gameId, nightPhaseSession } = useGameRoom();
  const { isSerialKillerPhase, hasSerialKillerAuthority } =
    useNightActionAuthority();

  const state = useQuery(
    nightPhase.checkSerialKillerAuthority,
    isSerialKillerPhase && hasSerialKillerAuthority
      ? { gameId: gameId as Id<"games"> }
      : "skip",
  );

  const isSelected = nightPhaseSession?.serialKillerTarget === seatNumber;

  // Once the target is locked in, only the chosen tile keeps its marker — the
  // shot is one per GAME, so there is nothing to change afterwards.
  if (isSelected) {
    return (
      <NightActionWrapper isSelected>
        <SerialKillerKillButton seatNumber={seatNumber} isSelected />
      </NightActionWrapper>
    );
  }

  if (
    !isSerialKillerPhase ||
    !hasSerialKillerAuthority ||
    isTargetHost ||
    !isPlayerAlive ||
    state?.canFire !== true ||
    nightPhaseSession?.serialKillerTarget !== undefined
  ) {
    return null;
  }

  return (
    <NightActionWrapper isSelected={false}>
      <SerialKillerKillButton seatNumber={seatNumber} isSelected={false} />
    </NightActionWrapper>
  );
}
