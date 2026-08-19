"use client";

import type { Id } from "@convex/_generated/dataModel";
import YakuzaKillButton from "@/features/game-room/components/actions/YakuzaKillButton";
import DoctorHealButton from "@/features/game-room/components/actions/DoctorHealButton";
import YakuzaTargetIndicator from "./YakuzaTargetIndicator";
import DoctorHealIndicator from "./DoctorHealIndicator";
import NightActionWrapper from "./NightActionWrapper";
import MafiaKillControl from "./MafiaKillControl";
import BestMoveControl from "./BestMoveControl";
import SerialKillerKillControl from "./SerialKillerKillControl";

interface NightActionButtonsProps {
  seatNumber: number | null;
  targetPlayerId: Id<"profiles"> | null;
  // Mafia kill inputs — forwarded to the variant-dispatched MafiaKillControl.
  isViewerHost: boolean;
  isTargetHost: boolean;
  isPlayerAlive: boolean;
  hasMafiaKillAuthority: boolean;
  isMafiaPhase: boolean;
  canShowYakuzaKillButton: boolean;
  isYakuzaTargetSelected: boolean;
  shouldShowYakuzaTargetIndicator: boolean;
  canShowDoctorHealButton: boolean;
  isAlreadyHealed: boolean;
  shouldShowDoctorHealIndicator: boolean;
}

/**
 * Yakuza kill and Doctor heal controls for a tile. The MAFIA kill is handled
 * separately by `MafiaKillControl` (variant-dispatched via the ruleset);
 * yakuza/doctor are Japanese-only, so they stay here as plain flag-driven
 * buttons.
 */
export default function NightActionButtons({
  seatNumber,
  targetPlayerId,
  isViewerHost,
  isTargetHost,
  isPlayerAlive,
  hasMafiaKillAuthority,
  isMafiaPhase,
  canShowYakuzaKillButton,
  isYakuzaTargetSelected,
  shouldShowYakuzaTargetIndicator,
  canShowDoctorHealButton,
  isAlreadyHealed,
  shouldShowDoctorHealIndicator,
}: NightActionButtonsProps) {
  if (seatNumber == null) return null;

  return (
    <>
      <MafiaKillControl
        seatNumber={seatNumber}
        isViewerHost={isViewerHost}
        isTargetHost={isTargetHost}
        isPlayerAlive={isPlayerAlive}
        hasMafiaKillAuthority={hasMafiaKillAuthority}
        isMafiaPhase={isMafiaPhase}
      />

      {/* Sports best move (§6): the first-night victim's public suspect marks +
          their pick buttons. Self-gated on the `best_move` phase, so this is
          inert for Japanese and for every other Sports phase. */}
      <BestMoveControl seatNumber={seatNumber} isTargetHost={isTargetHost} />

      {/* Serial Killer's one shot (§5). Self-gated on its own phase and
          authority, so this is inert for Japanese and Sports — both declare
          `isSerialKillerPhase: false`. */}
      <SerialKillerKillControl
        seatNumber={seatNumber}
        isTargetHost={isTargetHost}
        isPlayerAlive={isPlayerAlive}
      />

      {canShowYakuzaKillButton && (
        <NightActionWrapper isSelected={isYakuzaTargetSelected}>
          <YakuzaKillButton
            seatNumber={seatNumber}
            isSelected={isYakuzaTargetSelected}
          />
        </NightActionWrapper>
      )}

      {shouldShowYakuzaTargetIndicator && !canShowYakuzaKillButton && (
        <YakuzaTargetIndicator />
      )}

      {canShowDoctorHealButton && (
        <NightActionWrapper isSelected={false}>
          <DoctorHealButton
            seatNumber={seatNumber}
            isAlreadyHealed={isAlreadyHealed}
          />
        </NightActionWrapper>
      )}

      {shouldShowDoctorHealIndicator && !canShowDoctorHealButton && (
        <DoctorHealIndicator />
      )}
    </>
  );
}
