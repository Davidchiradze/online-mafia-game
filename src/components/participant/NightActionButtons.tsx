"use client";

import type { Id } from "@convex/_generated/dataModel";
import YakuzaKillButton from "@/components/game/YakuzaKillButton";
import DoctorHealButton from "@/components/game/DoctorHealButton";
import PromoteToRightHandButton from "@/components/game/PromoteToRightHandButton";
import YakuzaTargetIndicator from "./YakuzaTargetIndicator";
import DoctorHealIndicator from "./DoctorHealIndicator";
import NightActionWrapper from "./NightActionWrapper";
import MafiaKillControl from "./MafiaKillControl";

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
  canShowPromoteRightHandButton: boolean;
}

/**
 * Yakuza kill, Doctor heal, and Don's-right-hand promotion controls for a tile.
 * The MAFIA kill is handled separately by `MafiaKillControl` (variant-dispatched
 * via the ruleset); yakuza/doctor/right-hand are Japanese-only, so they stay
 * here as plain flag-driven buttons.
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
  canShowPromoteRightHandButton,
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

      {canShowPromoteRightHandButton && targetPlayerId && (
        <NightActionWrapper isSelected={false}>
          <PromoteToRightHandButton targetPlayerId={targetPlayerId} />
        </NightActionWrapper>
      )}
    </>
  );
}
