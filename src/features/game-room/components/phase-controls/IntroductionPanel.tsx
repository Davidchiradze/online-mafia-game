"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import type { GameSessionState } from "@/features/game-room/context/gameRoomContext";
import { useSpeakingRunControls } from "@/features/game-room/hooks/game/useSpeakingRunControls";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";

type IntroductionPanelProps = {
  gameId: string;
  gameSessionState: GameSessionState;
};

/**
 * Day 1 introduction: every seat speaks once, in order, then night falls.
 *
 * The run itself is the shared day-speaking machinery; the only thing this
 * phase owns is the exit — once everyone has spoken there is no vote, the
 * host goes straight to night.
 */
export default function IntroductionPanel({
  gameId,
  gameSessionState,
}: IntroductionPanelProps) {
  const t = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const { fields, action } = useSpeakingRunControls(gameId, gameSessionState);
  const [isEnteringNight, setIsEnteringNight] = useState(false);
  const enterNight = useMutation(nightPhase.enterNight);

  const handleStartNight = async () => {
    if (isEnteringNight) return;
    setIsEnteringNight(true);
    try {
      await enterNight({ gameId: gameId as Id<"games"> });
    } catch (error) {
      console.error("Failed to start night phase:", error);
    } finally {
      setIsEnteringNight(false);
    }
  };

  const descriptor: HostPanelDescriptor = {
    eyebrow: t("dayCounter", {
      day: dayRoundFromNightNumber(gameSessionState.currentNightNumber),
    }),
    title: tPhases("introduction_phase"),
    ...fields,
    actions: [
      action ?? {
        id: "start-night",
        label: t("startNight"),
        variant: "primary",
        onClick: () => void handleStartNight(),
        isLoading: isEnteringNight,
      },
    ],
  };

  return <HostPanel descriptor={descriptor} />;
}
