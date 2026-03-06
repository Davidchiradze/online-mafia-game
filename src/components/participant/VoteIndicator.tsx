"use client";

import { VoteIndicatorIcon } from "@/assets/icons";

/**
 * Vote indicator overlay - shows voted badge when player voted for current candidate.
 * Responsive: scales down on small screens to avoid overflow.
 */
export default function VoteIndicator() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <VoteIndicatorIcon className="w-[60%] h-[60%] max-w-[124px] max-h-[124px]" />
    </div>
  );
}
