"use client";

import { FoulAlertIcon } from "@/shared/ui/icons";

/**
 * Temporary alert that flashes in the center of a participant tile
 * when they receive a foul. Uses the foul-flash CSS animation.
 */
export default function FoulNotification() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none foul-flash text-red-500">
      <FoulAlertIcon
        className="w-[40%] h-[40%] max-w-[48px] max-h-[48px] drop-shadow-[0_0_16px_rgba(239,68,68,0.9)]"
      />
    </div>
  );
}
