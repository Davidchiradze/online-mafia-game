import { useTranslations } from "next-intl";
import { LobbyGame } from "@/components/lobby/LobbyContent";

export default function StatusBadge({
  status,
}: {
  status: LobbyGame["gameStatus"];
}) {
  const t = useTranslations("game.statusBadge");

  if (status === "not_started") {
    return (
      <span className="whitespace-nowrap rounded-lg border border-green-500/35 bg-green-500/20 px-2.5 py-[3px] font-orbitron text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-green-300">
        {t("ready")}
      </span>
    );
  }
  if (status === "playing") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-500/35 bg-amber-500/20 px-2.5 py-[3px] font-orbitron text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
        {t("playing")}
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap rounded-lg border border-gray-500/35 bg-gray-500/[0.22] px-2.5 py-[3px] font-orbitron text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-gray-400">
      {t("ended")}
    </span>
  );
}
