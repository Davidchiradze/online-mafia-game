"use client";

import { useTranslations } from "next-intl";

type GameStatus = "not_started" | "playing" | "finished";

const STATUS_CLASS: Record<GameStatus, string> = {
  not_started: "bg-green-500/20 border border-green-500/30 text-green-300",
  playing: "bg-amber-500/20 border border-amber-500/30 text-amber-300",
  finished: "bg-gray-500/20 border border-gray-500/30 text-gray-400",
};

export default function GameStatusBadge({ status }: { status: GameStatus }) {
  const t = useTranslations("game.statusBadge");
  const className = STATUS_CLASS[status] ?? STATUS_CLASS.finished;

  const label =
    status === "not_started"
      ? t("ready")
      : status === "playing"
        ? t("playing")
        : t("ended");

  return (
    <span
      className={`px-3 py-1 rounded-lg font-sans text-[0.8rem] font-medium whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  );
}
