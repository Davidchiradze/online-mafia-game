"use client";

import React, { useState, useRef, useCallback } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

type CollisionPadding =
  | number
  | Partial<Record<"top" | "bottom" | "left" | "right", number>>;

type ClickableTooltipProps = {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  collisionPadding?: CollisionPadding;
  className?: string;
};

const CLOSE_DELAY_MS = 150;

/**
 * A popover that works with both hover (desktop) and click (mobile).
 * Uses Radix Popover for proper click-outside handling.
 * Hover uses a close delay so the user can move between trigger and content.
 */
export default function ClickableTooltip({
  children,
  content,
  side = "top",
  align = "center",
  sideOffset = 8,
  collisionPadding = 8,
  className = "",
}: ClickableTooltipProps) {
  const [open, setOpen] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  }, []);

  const handleOpen = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const handleDelayedClose = useCallback(() => {
    cancelClose();
    closeTimeout.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <span
          className="inline-flex items-center cursor-pointer"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          role="button"
          tabIndex={0}
          onMouseEnter={handleOpen}
          onMouseLeave={handleDelayedClose}
        >
          {children}
        </span>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={`z-50 rounded-xl text-white text-sm p-0 min-w-[220px] max-w-[280px] overflow-hidden animate-in fade-in-0 zoom-in-95 ${className}`}
          style={{
            background: "linear-gradient(135deg, rgba(20,20,30,0.97) 0%, rgba(10,10,18,0.97) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(220,38,38,0.15)",
          }}
          onMouseEnter={handleOpen}
          onMouseLeave={handleDelayedClose}
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
          onCloseAutoFocus={(e: Event) => e.preventDefault()}
        >
          {content}
          <PopoverPrimitive.Arrow
            className="fill-[rgba(20,20,30,0.97)]"
            width={10}
            height={5}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
