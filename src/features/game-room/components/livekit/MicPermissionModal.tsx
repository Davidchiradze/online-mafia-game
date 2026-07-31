"use client";

import { useTranslations } from "next-intl";
import { Mic, MicOff } from "lucide-react";
import AnimatedModal from "@/shared/ui/AnimatedModal";
import { useMicPermission } from "@/hooks/livekit";

/**
 * Prompts the player to grant microphone access up front (in the lobby / on
 * join) rather than mid-turn. Shown to players only — spectators can't publish.
 *
 * - `prompt`  → an "Enable microphone" button that triggers the browser prompt.
 * - `denied`  → instructions to unblock, since the prompt can't be re-triggered.
 * - `granted` → nothing (modal closed); LiveKit will open the mic on the
 *               player's turn with no further prompt.
 */
export default function MicPermissionModal() {
  const { state, isRequesting, requestAccess } = useMicPermission();
  const t = useTranslations("game.livekit");

  const isDenied = state === "denied";
  // `unknown` = still resolving; don't flash the modal before we know.
  const isOpen = state === "prompt" || state === "denied";

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={() => void requestAccess()}
      closeOnBackdropClick={false}
      closeOnEsc={false}
    >
      <div
        className="
          bg-gradient-to-br from-gray-900 via-gray-800 to-black
          border border-white/10 rounded-2xl p-8 shadow-2xl
          max-w-sm w-full text-center cursor-default
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="relative mx-auto mb-5 w-16 h-16 flex items-center justify-center">
          {!isDenied && (
            <div className="absolute inset-0 rounded-full bg-white/5 animate-ping" />
          )}
          <div
            className={`relative w-16 h-16 rounded-full border flex items-center justify-center ${
              isDenied
                ? "bg-red-500/10 border-red-500/20"
                : "bg-white/10 border-white/10"
            }`}
          >
            {isDenied ? (
              <MicOff className="w-7 h-7 text-red-400/90" />
            ) : (
              <Mic className="w-7 h-7 text-white/80" />
            )}
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white tracking-wide">
          {isDenied ? t("micBlockedTitle") : t("enableMicTitle")}
        </h2>

        <p className="mt-2 text-sm text-white/50 leading-relaxed max-w-[280px] mx-auto">
          {isDenied ? t("micBlockedBody") : t("enableMicBody")}
        </p>

        {isDenied ? (
          <ol className="mt-5 text-left text-sm text-white/60 space-y-2 max-w-[280px] mx-auto list-decimal list-inside">
            <li>{t("micBlockedStep1")}</li>
            <li>{t("micBlockedStep2")}</li>
          </ol>
        ) : (
          <button
            onClick={() => void requestAccess()}
            disabled={isRequesting}
            className="
              mt-6 w-full px-6 py-3 rounded-xl font-medium text-white
              bg-white/10 hover:bg-white/20 active:bg-white/25
              border border-white/15 hover:border-white/25
              transition duration-200 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isRequesting ? t("enableMicRequesting") : t("enableMicButton")}
          </button>
        )}
      </div>
    </AnimatedModal>
  );
}
