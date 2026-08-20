"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Crosshair } from "lucide-react";

type RoomPinChipProps = {
  pin: string;
};

/**
 * The host's view of a private room's access PIN, sitting where the "Mafia"
 * wordmark sits for everyone else — the host has to read this out or paste it
 * to invite anyone, so it earns the most visible slot in the header.
 *
 * Rendered only for the host: `lobby/games:getPin` is the sole read path for
 * `games.pin` and refuses everyone else.
 */
export default function RoomPinChip({ pin }: RoomPinChipProps) {
  const t = useTranslations("game.header");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)]">
        <Crosshair className="w-3.5 h-3.5 text-white" />
      </div>

      <button
        type="button"
        onClick={handleCopy}
        title={copied ? t("pinCopied") : t("copyPin")}
        aria-label={t("copyPin")}
        className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 transition hover:bg-white/10 cursor-pointer"
      >
        <span className="hidden text-[0.65rem] uppercase tracking-wider text-gray-500 font-sans sm:inline">
          {t("roomPin")}
        </span>
        <span className="font-orbitron text-sm font-bold tracking-[0.2em] text-white">
          {pin}
        </span>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-gray-500 transition-colors group-hover:text-white" />
        )}
      </button>
    </div>
  );
}
