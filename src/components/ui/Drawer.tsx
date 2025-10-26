"use client";
import { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left";
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "w-80",
  md: "w-96",
  lg: "w-[32rem]",
};

export default function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = "right",
  size = "md",
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`absolute top-0 ${
          side === "right" ? "right-0" : "left-0"
        } h-full ${
          sizeClass[size]
        } bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col`}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        <div className="p-5 flex-1 overflow-auto">{children}</div>
        {footer ? (
          <div className="p-5 border-t border-gray-200 dark:border-gray-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
