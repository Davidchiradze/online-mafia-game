"use client";

import { MoreVerticalIcon } from "@/assets/icons";
import PopupMenu from "@/components/ui/PopupMenu";

interface MenuItem {
  label: string;
  onClick: () => void | Promise<void>;
  className?: string;
}

interface ParticipantMenuButtonProps {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  items: MenuItem[];
  ariaLabel?: string;
}

/**
 * Reusable menu button component for participant tiles.
 */
export default function ParticipantMenuButton({
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  items,
  ariaLabel = "Participant settings",
}: ParticipantMenuButtonProps) {
  return (
    <div className="absolute right-1 top-1 md:right-2 md:top-2 z-20">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onToggleMenu}
        className="rounded-md border border-white/10 bg-black/40 backdrop-blur p-1 md:p-1.5 text-white opacity-0 group-hover:opacity-100 transition"
      >
        <MoreVerticalIcon width={16} height={16} />
      </button>

      <PopupMenu
        open={menuOpen}
        onClose={onCloseMenu}
        items={items}
        className="absolute right-0 mt-2 w-44"
      />
    </div>
  );
}
