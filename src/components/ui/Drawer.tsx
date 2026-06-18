"use client";
import { ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left";
  size?: "sm" | "md" | "lg";
  variant?: "default" | "dark";
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
  variant = "default",
}: Props) {
  const t = useTranslations("common");

  if (!open) return null;

  const isDark = variant === "dark";

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 ${isDark ? "bg-black/75 backdrop-blur-sm" : "bg-black/50"}`}
        onClick={onClose}
      />
      <div
        className={`absolute top-0 ${side === "right" ? "right-0" : "left-0"} h-full ${sizeClass[size]} flex flex-col ${
          isDark
            ? "dark-panel border-white/10"
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-2xl"
        } ${side === "right" ? "border-l" : "border-r"}`}
      >
        <div
          className={`px-5 py-4 flex items-center justify-between shrink-0 ${
            isDark
              ? "border-b border-white/10"
              : "border-b border-gray-200 dark:border-gray-800"
          }`}
        >
          {title && (
            <h3
              className={
                isDark
                  ? "text-white font-orbitron font-bold text-base tracking-tight"
                  : "text-lg font-semibold text-gray-900 dark:text-white"
              }
            >
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
              isDark
                ? "text-gray-500 hover:text-white hover:bg-white/10"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            aria-label={t("close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-auto">{children}</div>

        {footer && (
          <div
            className={`p-5 shrink-0 ${
              isDark
                ? "border-t border-white/10"
                : "border-t border-gray-200 dark:border-gray-800"
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
