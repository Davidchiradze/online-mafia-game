"use client";

/**
 * Vote indicator overlay - shows big thumbs up when player voted for current candidate.
 * Displays in the center of ParticipantComponent.
 */
export default function VoteIndicator() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div className="text-6xl md:text-7xl animate-bounce drop-shadow-lg">
        👍
      </div>
    </div>
  );
}

