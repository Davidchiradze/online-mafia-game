"use client";

import { MicOffIcon, MicOnIcon } from "@/shared/ui/icons";

interface MicIndicatorProps {
  isMuted: boolean;
  containerClass: string;
  iconClass: string;
}

/** Remote player's read-only microphone indicator. */
export default function MicIndicator({
  isMuted,
  containerClass,
  iconClass,
}: MicIndicatorProps) {
  const Glyph = isMuted ? MicOffIcon : MicOnIcon;
  return (
    <div
      className={`px-1 py-0.5 tsm:px-1.5 tsm:py-1 rounded-md flex items-center gap-1.5 transition ${containerClass}`}
    >
      <Glyph
        className={`w-2 h-2 tsm:w-2.5 tsm:h-2.5 tlg:w-3 tlg:h-3 ${iconClass}`}
      />
    </div>
  );
}
