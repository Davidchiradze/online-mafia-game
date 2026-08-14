"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { GAME_CLEANUP } from "@convex/lib/constants";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { useCountdown } from "@/features/game-room/hooks/game/useCountdown";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type {
  EndGameOutcome,
  EndGameState,
} from "@/features/game-room/lib/endGame";
import type {
  HostPanelAction,
  HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";
import FinishGameModal from "./FinishGameModal";

type EndGamePanelProps = {
  state: EndGameState;
};

/**
 * The end screen, for the host.
 *
 * Two states, both driven by `endGameState`: a decided win waiting to be
 * confirmed, and a game already over. They differ in the one thing that
 * matters — whether there is still an irreversible action to take.
 *
 * Once finished, the action becomes "Return to Lobby". That is not decoration:
 * the room is cascade-deleted by a scheduled job, and until now the host's only
 * option on this screen was to sit and watch the countdown run out.
 */
export default function EndGamePanel({ state }: EndGamePanelProps) {
  const t = useTranslations("game.winnerBanner");
  const tHost = useTranslations("game.host");
  const tFinish = useTranslations("game.finishGame");
  const { gameId, gameSessionState } = useGameRoom();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const finishGame = useMutation(gameSessions.finishGame);

  // Counts only once the end is committed — `finishedAt` is what the scheduled
  // cleanup counts from, so the sentence and the deletion agree by construction.
  // A bare countdown pill would not say WHAT is expiring, and on this screen
  // that is the only thing worth saying, so it goes in words.
  const finishedAt = gameSessionState?.finishedAt ?? null;
  const { secondsLeft, isExpired } = useCountdown(
    finishedAt,
    GAME_CLEANUP.DELAY_MS,
  );

  const handleFinish = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await finishGame({ gameId: gameId as Id<"games"> });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to finish game:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const OUTCOME_LABELS: Record<EndGameOutcome, string> = {
    mafia: t("mafiaWinner"),
    yakuza: t("yakuzaWinner"),
    citizens: t("citizensWinner"),
    no_contest: t("noContest"),
  };

  const { outcome } = state;
  const title =
    outcome === null || outcome === "no_contest"
      ? t("noContest")
      : `${OUTCOME_LABELS[outcome]} — ${t("winSuffix")}`;

  const action: HostPanelAction =
    state.kind === "pending"
      ? {
          id: "end-game-finish",
          label: tFinish("buttonLabel"),
          variant: "danger",
          onClick: () => {
            setIsModalOpen(true);
          },
          isLoading,
        }
      : {
          id: "end-game-lobby",
          label: tHost("returnToLobby"),
          variant: "secondary",
          onClick: () => {
            router.push("/lobby");
          },
        };

  // The result IS the headline, so it goes in the title rather than into a
  // coloured note under a generic one. Nothing else belongs on this screen.
  const descriptor: HostPanelDescriptor = {
    eyebrow: t("gameOver"),
    title,
    status:
      finishedAt != null
        ? t("roomClosing", { seconds: isExpired ? 0 : secondsLeft })
        : undefined,
    actions: [action],
  };

  return (
    <>
      <HostPanel descriptor={descriptor} />
      <FinishGameModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onConfirm={() => void handleFinish()}
        isLoading={isLoading}
      />
    </>
  );
}
