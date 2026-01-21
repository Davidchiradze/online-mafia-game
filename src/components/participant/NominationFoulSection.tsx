"use client";

import NominationButton from "@/components/game/NominationButton";
import FoulButton from "@/components/game/FoulButton";
import FoulDisplay from "@/components/game/FoulDisplay";
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
        <div className="absolute left-[30px] -translate-x-1/2 top-1 md:top-2 z-20">
          <NominationButton seatNumber={seatNumber} isNominated={isNominated} />
        </div>
      )}

      {/* Foul button */}
      {canShowFoulButton && seatNumber != null && !isTargetDead && (
        <div className="absolute right-[0px] -translate-x-1/2 top-1 md:top-2 z-20">
          <FoulButton seatNumber={seatNumber} currentFouls={currentFouls} />
        </div>
      )}

      {/* Foul display */}
      {!isTargetDead && <FoulDisplay foulCount={currentFouls} />}

      {/* Foul speak button */}
      {canShowFoulSpeakButton && !isTargetDead && (
        <div className="absolute right-1 top-1 md:right-2 md:top-2 z-20">
          <FoulSpeakButton
            onStartFoulSpeak={startFoulSpeak}
            isFoulSpeaking={isFoulSpeaking}
            foulSpeakTimeLeft={foulSpeakTimeLeft}
            canFoulSpeak={canFoulSpeak}
          />
        </div>
      )}
    </>
  );
}
