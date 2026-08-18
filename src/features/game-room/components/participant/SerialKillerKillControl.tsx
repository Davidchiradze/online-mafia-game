"use client";

import { useQuery } from "convex/react";
import { nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { useNightActionAuthority } from "@/features/game-room/hooks/game/useNightActionAuthority";
import { shouldShowSerialKillIndicator } from "@/features/game-room/lib/serialKillerTarget";
import SerialKillerKillButton from "@/features/game-room/components/actions/SerialKillerKillButton";
import NightActionWrapper from "./NightActionWrapper";
import SerialKillIndicator from "./SerialKillIndicator";

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
 *
 * The CONFIRMATION is a full-tile `SerialKillIndicator`, matching the mafia,
 * yakuza and doctor marks, and its audience comes from
 * `shouldShowSerialKillIndicator` — see that module for why the rule lives in
 * `lib/` with tests instead of inline here.
 */
export default function SerialKillerKillControl({
  seatNumber,
  isTargetHost,
  isPlayerAlive,
}: SerialKillerKillControlProps) {
  const { gameId, isHost, nightPhaseSession } = useGameRoom();
  const { isSerialKillerPhase, hasSerialKillerAuthority } =
    useNightActionAuthority();

  const state = useQuery(
    nightPhase.checkSerialKillerAuthority,
    isSerialKillerPhase && hasSerialKillerAuthority
      ? { gameId: gameId as Id<"games"> }
      : "skip",
  );

  // Once the shot is fired only the chosen tile keeps a mark — it is one per
  // GAME, so there is nothing left to change and no button to show anywhere.
  if (
    shouldShowSerialKillIndicator({
      isSerialKillerPhase,
      isViewerHost: isHost,
      hasSerialKillerAuthority,
      serialKillerTarget: nightPhaseSession?.serialKillerTarget,
      seatNumber,
    })
  ) {
    return <SerialKillIndicator />;
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
      <SerialKillerKillButton seatNumber={seatNumber} />
    </NightActionWrapper>
  );
}
