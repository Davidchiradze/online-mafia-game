"use client";

import { useTranslations } from "next-intl";

type Props = {
  text?: string;
};

/**
 * Loading spinner with optional text.
 */
export function LoadingSpinner({ text }: Props) {
  const t = useTranslations("game");
  return (
    <div className="flex items-center gap-2 text-xs text-white/60">
      <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
      {text ?? t("processingAction")}
    </div>
  );
}
