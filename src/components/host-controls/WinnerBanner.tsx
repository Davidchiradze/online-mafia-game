"use client";

import { useTranslations } from "next-intl";
import FinishGameButton from "./FinishGameButton";

type Winner = "mafia" | "yakuza" | "citizens";

type WinnerBannerProps = {
  gameId: string;
  winner: Winner;
  /** When true, show the host's "Finish Game" button (pending-win state). */
  canFinish?: boolean;
};

const WINNER_ACCENT: Record<Winner, string> = {
  mafia: "text-red-400",
  yakuza: "text-purple-400",
  citizens: "text-emerald-400",
};

/**
 * Banner shown when the auto win-detection has decided a winner. The host sees
 * it while the win is pending (`canFinish`) with a "Finish Game" button to
 * confirm the end; everyone sees the title-only version once the game is
 * finished.
 */
export default function WinnerBanner({
  gameId,
  winner,
  canFinish = false,
}: WinnerBannerProps) {
  const t = useTranslations("game.winnerBanner");

  const WINNER_LABELS: Record<Winner, string> = {
    mafia: t("mafiaWinner"),
    yakuza: t("yakuzaWinner"),
    citizens: t("citizensWinner"),
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center">
      <div className="space-y-1">
        <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-slate-400">
          {t("gameOver")}
        </p>
        <h2
          className={`font-orbitron text-2xl font-bold uppercase tracking-wider ${WINNER_ACCENT[winner]}`}
        >
          {t("winSuffix")} - {WINNER_LABELS[winner]}
        </h2>
      </div>

      {canFinish && <FinishGameButton gameId={gameId} />}
    </div>
  );
}
