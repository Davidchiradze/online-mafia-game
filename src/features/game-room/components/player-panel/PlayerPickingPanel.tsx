"use client";

import { useTranslations } from "next-intl";
import type { Id } from "@convex/_generated/dataModel";
import { CARD_PICK } from "@/shared/lib/constants/game";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { useCardPicking } from "@/features/game-room/hooks/game";
import { useCountdown } from "@/features/game-room/hooks/game/useCountdown";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import {
  orderedSeatChips,
  type HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";

/** Matches the host panel's warning point on the same clock. */
const URGENT_SECONDS = 5;

/**
 * Pre-game, dealing roles: the table watches the deck go round.
 *
 * The pick order and whose turn it is are public — everyone is looking at the
 * same board — so this is the host's panel minus the Confirm button. What it
 * must never show is a card's ROLE; that stays in `CardPickingBoard`, which
 * only renders faces the server decided the viewer may see.
 *
 * Its own component rather than a branch of `PlayerPhasePanel` so the card
 * subscription mounts for this phase only.
 */
export default function PlayerPickingPanel() {
  const t = useTranslations("game.host");
  const tGame = useTranslations("game");
  const tPhases = useTranslations("game.phases");
  const { gameId } = useGameRoom();
  const { state } = useCardPicking(gameId as Id<"games">);

  const isComplete = state?.isComplete ?? false;
  const turnStartedAt = state?.currentTurnStartedAt ?? null;
  const parsedTurnStart = turnStartedAt ? Date.parse(turnStartedAt) : Number.NaN;
  const turnStartedMs = Number.isNaN(parsedTurnStart) ? null : parsedTurnStart;
  const { secondsLeft } = useCountdown(turnStartedMs, CARD_PICK.TIMEOUT_MS);

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
    actions: [],
  };

  return <HostPanel descriptor={descriptor} />;
}
