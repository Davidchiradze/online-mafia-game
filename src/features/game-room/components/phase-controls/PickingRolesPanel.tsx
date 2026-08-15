"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { CARD_PICK, GAME_PHASES } from "@/shared/lib/constants/game";
import {
  useGameRoom,
  type GameSessionState,
} from "@/features/game-room/context/gameRoomContext";
import { useCardPicking } from "@/features/game-room/hooks/game";
import { useCountdown } from "@/features/game-room/hooks/game/useCountdown";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import {
  orderedSeatChips,
  type HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";

type PickingRolesPanelProps = {
  gameSessionState: GameSessionState;
};

/** The picker's own countdown is display-only; the server auto-picks on expiry. */
const URGENT_SECONDS = 5;

/**
 * Pre-game, dealing roles: the deck is out and seats are picking in order.
 *
 * The chip run is the pick order with a cursor — spent seats grey, the seat on
 * the clock emerald, the rest outlined — so the host reads progress without
 * counting. Confirm stays disabled until the server reports every seat picked.
 */
export default function PickingRolesPanel({
  gameSessionState,
}: PickingRolesPanelProps) {
  const t = useTranslations("game.host");
  const tGame = useTranslations("game");
  const tPhases = useTranslations("game.phases");
  const { ruleset } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const { state } = useCardPicking(gameSessionState.gameId as Id<"games">);

  const isComplete = state?.isComplete ?? false;
  const turnStartedAt = state?.currentTurnStartedAt ?? null;
  const parsedTurnStart = turnStartedAt ? Date.parse(turnStartedAt) : Number.NaN;
  const turnStartedMs = Number.isNaN(parsedTurnStart) ? null : parsedTurnStart;
  const { secondsLeft } = useCountdown(turnStartedMs, CARD_PICK.TIMEOUT_MS);

  const handleConfirmRoles = async () => {
    if (isLoading || !isComplete) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: ruleset.advanceUpdates(GAME_PHASES[1]),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentSeat = state?.currentSeat ?? null;
  const descriptor: HostPanelDescriptor = {
    eyebrow: t("preGame"),
    title: tPhases("picking_roles"),
    timer:
      !isComplete && turnStartedMs !== null
        ? {
            label: t("timerSeconds", { seconds: secondsLeft }),
            isUrgent: secondsLeft <= URGENT_SECONDS,
          }
        : undefined,
    chipsLabel: t("pickedLabel"),
    chips: state
      ? orderedSeatChips(state.pickOrder, state.currentPickIndex)
      : undefined,
    status: isComplete
      ? tGame("allCardsPicked")
      : currentSeat !== null
        ? `${tGame("pickingNow")} ${tGame("seatLabel", { seat: currentSeat })}`
        : undefined,
    actions: [
      {
        id: "confirm-roles",
        label: isComplete ? t("confirmRoles") : t("waitingForPicks"),
        variant: "success",
        onClick: () => {
          void handleConfirmRoles();
        },
        disabled: !isComplete,
        isLoading,
      },
    ],
  };

  return <HostPanel descriptor={descriptor} />;
}
