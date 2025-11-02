"use client";

import React, { useEffect, useRef } from "react";

type MenuItem = {
  label: string;
  onClick: () => void | Promise<void>;
  className?: string;
};

type PopupMenuProps = {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  className?: string;
};

export default function PopupMenu({
  open,
  onClose,
  items,
  className,
}: PopupMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={
        "rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 " +
        (className || "")
      }
    >
      <div className="py-1">
        {items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={item.onClick}
            className={
              "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 " +
              (item.className || "text-gray-800 dark:text-gray-200")
            }
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
