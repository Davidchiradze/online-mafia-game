"use client";

import { useAudioPlayback } from "@livekit/components-react";
import { Room } from "livekit-client";
import { useTranslations } from "next-intl";
import AnimatedModal from "@/components/ui/AnimatedModal";

export default function AudioPlaybackModal({ room }: { room: Room }) {
  const { canPlayAudio, startAudio } = useAudioPlayback(room);
  const t = useTranslations("game.livekit");

  return (
    <AnimatedModal
      isOpen={!canPlayAudio}
      onClose={startAudio}
      closeOnBackdropClick={true}
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
          <div className="absolute inset-0 rounded-full bg-white/5 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="w-7 h-7 text-white/80"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white tracking-wide">
          {t("enableAudioTitle")}
        </h2>

        <p className="mt-2 text-sm text-white/50 leading-relaxed max-w-[260px] mx-auto">
          {t("enableAudioBody")}
        </p>

        <button
          onClick={startAudio}
          className="
            mt-6 w-full px-6 py-3 rounded-xl font-medium text-white
            bg-white/10 hover:bg-white/20 active:bg-white/25
            border border-white/15 hover:border-white/25
            transition-all duration-200 cursor-pointer
          "
        >
          {t("enableAudioButton")}
        </button>

        <p className="mt-4 text-xs text-white/30">
          {t("enableAudioHint")}
        </p>
      </div>
    </AnimatedModal>
  );
}
