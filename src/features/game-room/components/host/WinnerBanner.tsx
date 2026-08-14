"use client";

import { useTranslations } from "next-intl";
import { GAME_CLEANUP } from "@convex/lib/constants";
import { useCountdown } from "@/features/game-room/hooks/game/useCountdown";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";

type Winner = "mafia" | "yakuza" | "citizens";
type Outcome = Winner | "no_contest";

type WinnerBannerProps = {
  /**
   * Decided winning faction, `"no_contest"` for a total mutual elimination
   * (nobody left alive), or `null` when the game was finished with no winner
   * at all (e.g. an admin force-end).
   */
  winner: Outcome | null;
};

const WINNER_ACCENT: Record<Winner, string> = {
  mafia: "text-red-400",
  yakuza: "text-purple-400",
  citizens: "text-emerald-400",
};

/**
 * The end screen everyone EXCEPT the host sees.
 *
 * Read-only by construction: the host's version is `EndGamePanel`, which is
 * the same information plus the two things only a host can do (confirm the
 * end, leave for the lobby). Both `"no_contest"` (total mutual elimination)
 * and `null` (finished with no winner at all, e.g. an admin force-end) show
 * the same "No Contest" state rather than a faction win.
 */
export default function WinnerBanner({ winner }: WinnerBannerProps) {
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

      {finishedAt != null && (
        <p className="font-orbitron text-[11px] uppercase tracking-[0.2em] text-slate-400">
          {t("roomClosing", { seconds: isExpired ? 0 : secondsLeft })}
        </p>
      )}
    </div>
  );
}
