"use client";

import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

type CollisionPadding =
  | number
  | Partial<Record<"top" | "bottom" | "left" | "right", number>>;

type TooltipProps = {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  collisionPadding?: CollisionPadding;
  className?: string;
  disabled?: boolean;
};

export default function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  sideOffset = 8,
  collisionPadding = 8,
  className = "",
  disabled = false,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={150} skipDelayDuration={300}>
      <TooltipPrimitive.Root open={disabled ? false : undefined}>
        <TooltipPrimitive.Trigger asChild>
          <span className="inline-flex items-center">{children}</span>
        </TooltipPrimitive.Trigger>
        {!disabled && (
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              side={side}
              align={align}
              sideOffset={sideOffset}
              collisionPadding={collisionPadding}
              className={`z-50 rounded-md bg-gray-900 text-white text-xs shadow-lg px-2 py-1 ${className}`}
            >
              {content}
              <TooltipPrimitive.Arrow
                className="fill-gray-900"
                width={8}
                height={4}
              />
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        )}
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
