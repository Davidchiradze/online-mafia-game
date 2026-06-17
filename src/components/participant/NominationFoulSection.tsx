"use client";

import NominationButton from "@/components/game/NominationButton";
import FoulButton from "@/components/game/FoulButton";
import FoulNotification from "@/components/game/FoulNotification";
import FoulSpeakButton from "@/components/game/FoulSpeakButton";

interface NominationFoulSectionProps {
  seatNumber: number | null;
  isTargetDead: boolean;
  // Nomination
  canShowNominationButton: boolean;
  isNominated: boolean;
  // Foul
  canShowFoulButton: boolean;
  currentFouls: number;
  showFoulNotification: boolean;
  // Foul speak
  canShowFoulSpeakButton: boolean;
  isFoulSpeaking: boolean;
  foulSpeakTimeLeft: number;
  canFoulSpeak: boolean;
  startFoulSpeak: () => Promise<void>;
}

/**
 * NominationFoulSection - Handles nomination and foul-related UI elements.
 * Includes nomination button, foul button, foul display, and foul speak button.
 */
export default function NominationFoulSection({
  seatNumber,
  isTargetDead,
  canShowNominationButton,
  isNominated,
  canShowFoulButton,
  currentFouls,
  showFoulNotification,
  canShowFoulSpeakButton,
  isFoulSpeaking,
  foulSpeakTimeLeft,
  canFoulSpeak,
  startFoulSpeak,
}: NominationFoulSectionProps) {
  return (
    <>
      {/* Nomination button */}
      {canShowNominationButton && seatNumber != null && !isTargetDead && (
        <div className="absolute left-1 tsm:left-[22px] tmd:left-[30px] tsm:-translate-x-1/2 top-1 tmd:top-2 z-20">
          <NominationButton seatNumber={seatNumber} isNominated={isNominated} />
        </div>
      )}

      {/* Foul button */}
      {canShowFoulButton && seatNumber != null && !isTargetDead && (
        <div className="absolute right-1 tmd:right-0 tmd:-translate-x-1/2 top-1 tmd:top-2 z-20">
          <FoulButton seatNumber={seatNumber} currentFouls={currentFouls} />
        </div>
      )}

      {/* Temporary foul notification - visible to everyone when a foul is given */}
      {!isTargetDead && showFoulNotification && <FoulNotification />}

      {/* Foul speak button */}
      {canShowFoulSpeakButton && !isTargetDead && (
        <div className="absolute right-1 top-1 tmd:right-2 tmd:top-2 z-20">
          <FoulSpeakButton
            onStartFoulSpeak={startFoulSpeak}
            isFoulSpeaking={isFoulSpeaking}
            foulSpeakTimeLeft={foulSpeakTimeLeft}
            canFoulSpeak={canFoulSpeak}
            currentFouls={currentFouls}
          />
        </div>
      )}
    </>
  );
}
