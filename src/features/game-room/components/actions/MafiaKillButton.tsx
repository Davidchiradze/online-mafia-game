"use client";

import { useTranslations } from "next-intl";
import Skull from "@/shared/ui/icons/Skull";

interface MafiaKillButtonProps {
  /** Highlighted as the viewer's current target. */
  isSelected: boolean;
  /** In-flight selection (shows a spinner, blocks clicks). */
  isLoading: boolean;
  /** Whether the button is non-interactive (e.g. a locked single-authority pick). */
  disabled: boolean;
  onClick: () => void;
}

/**
 * Presentational mafia kill button. It owns no game logic — the caller
 * (`MafiaKillControl`) injects `onClick` (already bound to the right variant
 * mutation + seat) and the display flags, so this component is variant-agnostic.
 */
export default function MafiaKillButton({
  isSelected,
  isLoading,
  disabled,
  onClick,
}: MafiaKillButtonProps) {
  const t = useTranslations("game.actions");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden
        flex items-center justify-center gap-1.5
        px-4 py-1.5 lg:px-5 lg:py-2
        rounded-t-lg
        text-[0.6rem] lg:text-[0.7rem]
        font-semibold uppercase tracking-widest
        transition duration-200
        border border-b-0
        ${
          isSelected
            ? "bg-white/20 border-white/20 text-white shadow-[0_0_16px_rgba(255,255,255,0.15)]"
            : "bg-black/75 border-white/10 text-white/80 hover:text-white hover:border-white/20 hover:bg-black/70 cursor-pointer active:scale-95"
        }
        ${isLoading ? "opacity-50 cursor-wait" : ""}
      `}
      aria-label={isSelected ? t("targetSelected") : t("selectAsTarget")}
    >
      {isLoading ? (
        <span className="w-3 h-3 border-[1.5px] border-white/20 border-t-white rounded-full animate-spin" />
      ) : isSelected ? (
        <>
          <Skull size={11} className="text-white/90" />
          <span>{t("target")}</span>
        </>
      ) : (
        <span>{t("kill")}</span>
      )}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] ${
          isSelected
            ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]"
            : "bg-white/30"
        }`}
      />
    </button>
  );
}
