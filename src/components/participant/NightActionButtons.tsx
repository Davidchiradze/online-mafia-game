"use client";

import MafiaKillButton from "@/components/game/MafiaKillButton";
import YakuzaKillButton from "@/components/game/YakuzaKillButton";
import DoctorHealButton from "@/components/game/DoctorHealButton";
import MafiaTargetIndicator from "./MafiaTargetIndicator";
import YakuzaTargetIndicator from "./YakuzaTargetIndicator";
import DoctorHealIndicator from "./DoctorHealIndicator";

interface NightActionButtonsProps {
  seatNumber: number | null;
  canShowMafiaKillButton: boolean;
  isMafiaTargetSelected: boolean;
  shouldShowMafiaTargetIndicator: boolean;
  canShowYakuzaKillButton: boolean;
  isYakuzaTargetSelected: boolean;
  shouldShowYakuzaTargetIndicator: boolean;
  canShowDoctorHealButton: boolean;
  isAlreadyHealed: boolean;
  shouldShowDoctorHealIndicator: boolean;
}

export default function NightActionButtons({
  seatNumber,
  canShowMafiaKillButton,
  isMafiaTargetSelected,
  shouldShowMafiaTargetIndicator,
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
      {canShowMafiaKillButton && (
        <NightActionWrapper isSelected={isMafiaTargetSelected}>
          <MafiaKillButton
            seatNumber={seatNumber}
            isSelected={isMafiaTargetSelected}
          />
        </NightActionWrapper>
      )}

      {shouldShowMafiaTargetIndicator && !canShowMafiaKillButton && (
        <MafiaTargetIndicator />
      )}

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

/**
 * Positions the action button at bottom-center of the tile.
 * Uses display:none by default, display:flex on group hover/focus.
 * When `isSelected` is true, stays visible permanently.
 */
function NightActionWrapper({
  children,
  isSelected,
}: {
  children: React.ReactNode;
  isSelected: boolean;
}) {
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-30 justify-center ${
        isSelected
          ? "flex"
          : "hidden group-hover:flex group-focus-within:flex"
      }`}
    >
      {children}
    </div>
  );
}
