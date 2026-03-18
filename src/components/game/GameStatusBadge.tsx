"use client";

type GameStatus = "not_started" | "playing" | "finished";

const STATUS_CONFIG: Record<GameStatus, { label: string; className: string }> =
  {
    not_started: {
      label: "Ready",
      className: "bg-green-500/20 border border-green-500/30 text-green-300",
    },
    playing: {
      label: "Playing",
      className: "bg-amber-500/20 border border-amber-500/30 text-amber-300",
    },
    finished: {
      label: "Ended",
      className: "bg-gray-500/20 border border-gray-500/30 text-gray-400",
    },
  };

export default function GameStatusBadge({ status }: { status: GameStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.finished;
  return (
    <span
      className={`px-3 py-1 rounded-lg font-sans text-[0.8rem] font-medium whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  );
}
