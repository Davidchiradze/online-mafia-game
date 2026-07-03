"use client";

import { useTranslations } from "next-intl";
import FinishGameButton from "./FinishGameButton";

type Winner = "mafia" | "yakuza" | "citizens";

type WinnerBannerProps = {
  gameId: string;
  /** Decided winning faction, or `null` when the game ended with no contest. */
  winner: Winner | null;
  /** When true, show the host's "Finish Game" button (pending-win state). */
  canFinish?: boolean;
};

const WINNER_ACCENT: Record<Winner, string> = {
  mafia: "text-red-400",
  yakuza: "text-purple-400",
  citizens: "text-emerald-400",
};

/**
 * Banner shown when a game ends. The host sees it while a win is pending
 * (`canFinish`) with a "Finish Game" button to confirm the end; everyone sees
 * the title-only version once the game is finished. When `winner` is `null`
 * (e.g. an admin force-ended the game), it shows a "No Contest" end state
 * instead of a faction win.
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
    <div className="w-full min-h-full flex flex-col items-center justify-center gap-3 py-2 text-center sm:gap-4">
      <div className="space-y-1">
        <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-slate-400">
          {t("gameOver")}
        </p>
        <h2
          className={`font-orbitron text-lg font-bold uppercase tracking-wider break-words sm:text-2xl ${
            winner ? WINNER_ACCENT[winner] : "text-slate-300"
          }`}
        >
          {winner
            ? `${t("winSuffix")} - ${WINNER_LABELS[winner]}`
            : t("noContest")}
        </h2>
      </div>

      {canFinish && winner && <FinishGameButton gameId={gameId} />}
    </div>
  );
}
