"use client";

import { useTranslations } from "next-intl";
import FinishGameButton from "./FinishGameButton";
import { GAME_CLEANUP } from "@convex/lib/constants";
import { useCountdown } from "@/features/game-room/hooks/game/useCountdown";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";

type Winner = "mafia" | "yakuza" | "citizens";
type Outcome = Winner | "no_contest";

type WinnerBannerProps = {
  gameId: string;
  /**
   * Decided winning faction, `"no_contest"` for a total mutual elimination
   * (nobody left alive, still host-confirmable), or `null` when the game was
   * already finished with no winner (e.g. an admin force-end).
   */
  winner: Outcome | null;
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
 * the title-only version once the game is finished. Both `"no_contest"` (a total
 * mutual elimination, still host-confirmable) and `null` (a game already
 * finished with no winner, e.g. an admin force-end) show the same "No Contest"
 * end state instead of a faction win.
 */
export default function WinnerBanner({
  gameId,
  winner,
  canFinish = false,
}: WinnerBannerProps) {
  const t = useTranslations("game.winnerBanner");
  const { gameSessionState } = useGameRoom();

  const WINNER_LABELS: Record<Winner, string> = {
    mafia: t("mafiaWinner"),
    yakuza: t("yakuzaWinner"),
    citizens: t("citizensWinner"),
  };

  // Room-closing countdown — starts once the game is actually finished
  // (`finishedAt` set). Mirrors the server's scheduled cleanup delay.
  const finishedAt = gameSessionState?.finishedAt ?? null;
  const { secondsLeft, isExpired } = useCountdown(
    finishedAt,
    GAME_CLEANUP.DELAY_MS,
  );

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-center gap-3 py-2 text-center sm:gap-4">
      <div className="space-y-1">
        <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-slate-400">
          {t("gameOver")}
        </p>
        <h2
          className={`font-orbitron text-lg font-bold uppercase tracking-wider break-words sm:text-2xl ${
            winner && winner !== "no_contest"
              ? WINNER_ACCENT[winner]
              : "text-slate-300"
          }`}
        >
          {winner && winner !== "no_contest"
            ? `${t("winSuffix")} - ${WINNER_LABELS[winner]}`
            : t("noContest")}
        </h2>
      </div>

      {canFinish && winner && <FinishGameButton gameId={gameId} />}

      {finishedAt != null && (
        <p className="font-orbitron text-[11px] uppercase tracking-[0.2em] text-slate-400">
          {t("roomClosing", { seconds: isExpired ? 0 : secondsLeft })}
        </p>
      )}
    </div>
  );
}
