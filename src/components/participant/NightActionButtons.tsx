"use client";

import MafiaKillButton from "@/components/game/MafiaKillButton";
import YakuzaKillButton from "@/components/game/YakuzaKillButton";
import DoctorHealButton from "@/components/game/DoctorHealButton";
import MafiaTargetIndicator from "./MafiaTargetIndicator";
import YakuzaTargetIndicator from "./YakuzaTargetIndicator";
import DoctorHealIndicator from "./DoctorHealIndicator";

interface NightActionButtonsProps {
  seatNumber: number | null;
  // Mafia
  canShowMafiaKillButton: boolean;
  isMafiaTargetSelected: boolean;
  shouldShowMafiaTargetIndicator: boolean;
  // Yakuza
  canShowYakuzaKillButton: boolean;
  isYakuzaTargetSelected: boolean;
  shouldShowYakuzaTargetIndicator: boolean;
  // Doctor
  canShowDoctorHealButton: boolean;
  isAlreadyHealed: boolean;
  shouldShowDoctorHealIndicator: boolean;
}

/**
 * NightActionButtons - Consolidated component for all night phase action buttons.
 * Includes Mafia kill, Yakuza kill, and Doctor heal buttons with their indicators.
 */
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
      {/* Mafia kill button */}
      {canShowMafiaKillButton && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <MafiaKillButton
              seatNumber={seatNumber}
              isSelected={isMafiaTargetSelected}
            />
          </div>
        </div>
      )}

      {/* Mafia target indicator for host */}
      {shouldShowMafiaTargetIndicator && !canShowMafiaKillButton && (
        <MafiaTargetIndicator />
      )}

      {/* Yakuza kill button */}
      {canShowYakuzaKillButton && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <YakuzaKillButton
              seatNumber={seatNumber}
              isSelected={isYakuzaTargetSelected}
            />
          </div>
        </div>
      )}

      {/* Yakuza target indicator for host */}
      {shouldShowYakuzaTargetIndicator && !canShowYakuzaKillButton && (
        <YakuzaTargetIndicator />
      )}

      {/* Doctor heal button */}
      {canShowDoctorHealButton && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <DoctorHealButton
              seatNumber={seatNumber}
              isAlreadyHealed={isAlreadyHealed}
            />
          </div>
        </div>
      )}

      {/* Doctor heal indicator for host and doctor */}
      {shouldShowDoctorHealIndicator && !canShowDoctorHealButton && (
        <DoctorHealIndicator />
      )}
    </>
  );
}

