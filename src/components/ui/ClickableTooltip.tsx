"use client";

import React, { useState } from "react";
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

/**
 * A popover that works with both hover (desktop) and click (mobile).
 * Uses Radix Popover for proper click-outside handling.
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
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
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
          className={`z-50 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm shadow-xl border border-gray-200 dark:border-gray-700 p-0 min-w-[180px] max-w-[280px] overflow-hidden animate-in fade-in-0 zoom-in-95 ${className}`}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
          onCloseAutoFocus={(e: Event) => e.preventDefault()}
        >
          {content}
          <PopoverPrimitive.Arrow className="fill-white dark:fill-gray-800" width={10} height={5} />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

