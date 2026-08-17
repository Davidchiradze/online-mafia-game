"use client";

import { useTranslations } from "next-intl";
import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import type { GameSessionState } from "@/features/game-room/context/gameRoomContext";
import { useSpeakingRunControls } from "@/features/game-room/hooks/game/useSpeakingRunControls";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";
import DayPhaseDonePanel from "./DayPhaseDonePanel";
import { GamePhase } from "@/shared/lib/constants/game";

type DayPhasePanelProps = {
  gameId: string;
  gameSessionState: GameSessionState;
};

/**
 * The day round: every living seat speaks once and nominations accumulate.
 *
 * Nominated seats ride along in their own rose capsule for the whole run —
 * they are a standing fact the host needs while listening, not something that
 * only matters at the end. Once the run completes the exit branches enough to
 * be its own component.
 */
export default function DayPhasePanel({
  gameId,
  gameSessionState,
}: DayPhasePanelProps) {
  const t = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const { run, fields, action } = useSpeakingRunControls(
    gameId,
    gameSessionState,
  );

  if (run.mode === "completed") {
    return (
      <DayPhaseDonePanel gameId={gameId} gameSessionState={gameSessionState} />
    );
  }

  const nominatedSeats = gameSessionState.nominatedPlayers ?? [];
  const descriptor: HostPanelDescriptor = {
    eyebrow: t("dayCounter", {
      day: dayRoundFromNightNumber(gameSessionState.currentNightNumber),
    }),
    title: tPhases(GamePhase.DAY_PHASE),
    nominated:
      nominatedSeats.length > 0
        ? { label: t("nominatedLabel"), seats: nominatedSeats }
        : undefined,
    ...fields,
    actions: action ? [action] : [],
  };

  return <HostPanel descriptor={descriptor} />;
}
