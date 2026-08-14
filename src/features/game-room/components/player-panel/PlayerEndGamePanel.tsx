"use client";

import { useTranslations } from "next-intl";
import { GAME_CLEANUP } from "@convex/lib/constants";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { useCountdown } from "@/features/game-room/hooks/game/useCountdown";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type { EndGameOutcome } from "@/features/game-room/lib/endGame";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";

type PlayerEndGamePanelProps = {
  /** Null when the game was force-ended, which recorded no winner. */
  outcome: EndGameOutcome | null;
};

/**
 * The result, for everyone who is not the host.
 *
 * Reached only once the end is COMMITTED. A decided-but-unconfirmed win sits in
 * `winner` while the host is still running the reveal, and showing it here would
 * announce the result before they do — so `PlayerPanel` gates this on
 * `isFinished`, not on a winner existing.
 *
 * The countdown is the room's own: cleanup is scheduled from `finishedAt`, so
 * the sentence and the deletion cannot disagree.
 */
export default function PlayerEndGamePanel({
  outcome,
}: PlayerEndGamePanelProps) {
  const t = useTranslations("game.winnerBanner");
  const { gameSessionState } = useGameRoom();

  const finishedAt = gameSessionState?.finishedAt ?? null;
  const { secondsLeft, isExpired } = useCountdown(
    finishedAt,
    GAME_CLEANUP.DELAY_MS,
  );

  const OUTCOME_LABELS: Record<EndGameOutcome, string> = {
    mafia: t("mafiaWinner"),
    yakuza: t("yakuzaWinner"),
    citizens: t("citizensWinner"),
    no_contest: t("noContest"),
  };

  const descriptor: HostPanelDescriptor = {
    eyebrow: t("gameOver"),
    title:
      outcome === null || outcome === "no_contest"
        ? t("noContest")
        : `${OUTCOME_LABELS[outcome]} — ${t("winSuffix")}`,
    status:
      finishedAt != null
        ? t("roomClosing", { seconds: isExpired ? 0 : secondsLeft })
        : undefined,
    actions: [],
  };

  return <HostPanel descriptor={descriptor} />;
}
