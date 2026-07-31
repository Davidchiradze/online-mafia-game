"use client";

import { VideoOffIcon, VideoOnIcon } from "@/shared/ui/icons";
import { TOGGLE_BUTTON_CLASS, TOGGLE_ICON_CLASS } from "./toggleStyles";

interface CameraToggleButtonProps {
  cameraOff: boolean;
  containerClass: string;
  iconClass: string;
  label: string;
  onToggle?: () => void;
}

/** Local player's interactive camera toggle. */
export default function CameraToggleButton({
  cameraOff,
  containerClass,
  iconClass,
  label,
  onToggle,
}: CameraToggleButtonProps) {
  const Glyph = cameraOff ? VideoOffIcon : VideoOnIcon;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
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
