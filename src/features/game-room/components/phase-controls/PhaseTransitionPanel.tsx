"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions, farewellSpeech, dayPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import {
  useGameRoom,
  type GameSessionState,
} from "@/features/game-room/context/gameRoomContext";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";
import { GamePhase } from "@/shared/lib/constants/game";

type PhaseTransitionPanelProps = {
  gameSessionState: GameSessionState;
};

/**
 * The neutral sleep buffer between two night groups.
 *
 * Everyone is asleep and nothing leaks: the buffer exists so the previous role
 * is not glimpsed as the next one wakes. The host sees where the game is
 * headed — players never do, which is why the destination label is built here
 * and not in the shared `PhaseTitle`.
 *
 * Starting dispatches on the stashed `nextPhase`, and two of those values are
 * resolve-MARKERS rather than plain destinations:
 *  - `farewell_speech` — the Doctor→wake exit. `startFarewellSpeech` resolves
 *    the night's kills and lands on `farewell_speech` (someone died) or
 *    `day_phase` (nobody did); which one is not known until it runs, so the
 *    title says "Day".
 *  - `introduction_phase` / `day_phase` — precompute the speaking order (and
 *    run the win check) so the host sees the opener before pressing Start.
 */
export default function PhaseTransitionPanel({
  gameSessionState,
}: PhaseTransitionPanelProps) {
  const t = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const tTitle = useTranslations("game.phaseTitle");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const startFarewellSpeech = useMutation(farewellSpeech.startFarewellSpeech);
  const enterIntroductionPhase = useMutation(dayPhase.enterIntroductionPhase);
  const enterDayPhase = useMutation(dayPhase.enterDayPhase);

  const nextPhase = gameSessionState.nextPhase;

  const handleStart = async () => {
    if (isLoading || !nextPhase) return;
    setIsLoading(true);
    try {
      const id = gameId as Id<"games">;
      if (nextPhase === GamePhase.FAREWELL_SPEECH) {
        await startFarewellSpeech({ gameId: id });
      } else if (nextPhase === GamePhase.INTRODUCTION_PHASE) {
        await enterIntroductionPhase({ gameId: id });
      } else if (nextPhase === GamePhase.DAY_PHASE) {
        await enterDayPhase({ gameId: id });
      } else {
        await updateSession({
          sessionId: gameSessionState._id,
          updates: { gamePhase: nextPhase, nextPhase: null },
        });
      }
    } catch (error) {
      console.error("Failed to start next phase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // The farewell marker resolves to day-or-farewell only once it runs, so the
  // honest thing to show the host is the destination it always passes through.
  const destination = nextPhase === GamePhase.FAREWELL_SPEECH ? GamePhase.DAY_PHASE : nextPhase;

  const descriptor: HostPanelDescriptor = {
    eyebrow: tPhases(GamePhase.PHASE_TRANSITION),
    title: destination
      ? tTitle("nextPhase", { label: tPhases(destination) })
      : tPhases(GamePhase.PHASE_TRANSITION),
    // No status line — the eyebrow already says everyone is asleep.
    actions: [
      {
        id: "buffer-start",
        label: t("start"),
        variant: "success",
        onClick: () => void handleStart(),
        disabled: !nextPhase,
        isLoading,
      },
    ],
  };

  return <HostPanel descriptor={descriptor} />;
}
