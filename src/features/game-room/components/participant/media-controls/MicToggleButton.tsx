"use client";

import { MicOffIcon, MicOnIcon } from "@/shared/ui/icons";
import { TOGGLE_BUTTON_CLASS, TOGGLE_ICON_CLASS } from "./toggle-styles";

interface MicToggleButtonProps {
  isMuted: boolean;
  containerClass: string;
  iconClass: string;
  onToggle?: () => void;
}

/** Local player's interactive microphone toggle. */
export default function MicToggleButton({
  isMuted,
  containerClass,
  iconClass,
  onToggle,
}: MicToggleButtonProps) {
  const Glyph = isMuted ? MicOffIcon : MicOnIcon;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      className={`${TOGGLE_BUTTON_CLASS} ${containerClass}`}
    >
      <Glyph className={`${TOGGLE_ICON_CLASS} ${iconClass}`} />
    </button>
  );
}
