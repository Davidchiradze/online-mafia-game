"use client";

import { Hash, Users, Circle } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  onlineCount: number;
  /** Opens the online-players drawer on mobile. */
  onOpenUsers: () => void;
};

export function ChatHeader({ onlineCount, onOpenUsers }: Props) {
  const t = useTranslations("communityChat");

  return (
    <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-white/5 backdrop-blur-md bg-black/20 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)]">
        <Hash className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <h1
          className="text-white tracking-[0.15em] uppercase"
          style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.05rem", fontWeight: 700 }}
        >
          {t("title")}
        </h1>
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
          <Circle className="w-2 h-2 fill-green-500 text-green-500" />
          <span>{t("playersOnline", { count: onlineCount })}</span>
        </div>
      </div>

      {/* Mobile: open online players drawer */}
      <button
        onClick={onOpenUsers}
        className="lg:hidden ml-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
      >
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium">{onlineCount}</span>
      </button>
    </div>
  );
}
