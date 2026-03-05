"use client";

import { FoulAlertIcon } from "@/assets/icons";

/**
 * Temporary alert that flashes in the center of a participant tile
 * when they receive a foul. Uses the foul-flash CSS animation.
 */
export default function FoulNotification() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none foul-flash text-red-500">
      <FoulAlertIcon
        width="48"
        height="48"
        className="drop-shadow-[0_0_16px_rgba(239,68,68,0.9)]"
      />
    </div>
  );
}
