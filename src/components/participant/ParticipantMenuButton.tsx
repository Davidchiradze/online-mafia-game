"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useTranslations } from "next-intl";
import { MoreVerticalIcon } from "@/assets/icons";

interface MenuItem {
  label: string;
  onClick: () => void | Promise<void>;
  /** Render in a destructive (red) style. */
  destructive?: boolean;
}

interface ParticipantMenuButtonProps {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  items: MenuItem[];
  ariaLabel?: string;
}

/**
 * Menu button for participant tiles. Uses Radix Popover (same primitive as
 * ClickableTooltip) so the menu is portaled out of the tile — it can't be
 * clipped on small screens and is positioned with collision handling.
 */
export default function ParticipantMenuButton({
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  items,
  ariaLabel,
}: ParticipantMenuButtonProps) {
  const tg = useTranslations("game");
  const resolvedAriaLabel = ariaLabel ?? tg("participantSettings");
  return (
    <PopoverPrimitive.Root
      open={menuOpen}
      onOpenChange={(open) => (open ? onToggleMenu() : onCloseMenu())}
    >
      <div className="absolute right-1 top-1 md:right-2 md:top-2 z-20">
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={resolvedAriaLabel}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg border border-white/10 bg-black/50 backdrop-blur p-1 md:p-1.5 text-white/80 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/70 transition data-[state=open]:opacity-100 data-[state=open]:text-white"
          >
            <MoreVerticalIcon width={16} height={16} />
          </button>
        </PopoverPrimitive.Trigger>
      </div>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          onClick={(e) => e.stopPropagation()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 w-44 overflow-hidden rounded-xl p-1 text-sm text-white animate-in fade-in-0 zoom-in-95"
          style={{
            background:
              "linear-gradient(135deg, rgba(20,20,30,0.97) 0%, rgba(10,10,18,0.97) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void item.onClick();
                onCloseMenu();
              }}
              className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                item.destructive
                  ? "text-red-400 hover:bg-red-500/15 hover:text-red-300"
                  : "text-white/90 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
