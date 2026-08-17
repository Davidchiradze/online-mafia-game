"use client";

import { useTranslations } from "next-intl";
import { useCardPicking } from "@/features/game-room/hooks/game";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import type { Id } from "@convex/_generated/dataModel";
import { GamePhase } from "@/shared/lib/constants/game";

/**
 * PickerIndicator
 *
 * Renders a small status line under the phase title during `picking_roles`:
 *   - while picking is in progress: "Seat N is picking..."
 *   - after the last pick:          "All cards picked"
 *
 * Designed to sit next to `<PhaseTitle />` in both the host's
 * `GamePhaseControls` and non-pickers' `PlayerCircle` center panel. Renders
 * nothing outside the picking phase or before any session exists.
 */
export default function PickerIndicator() {
  const t = useTranslations("game");
  const { gameId, gameSessionState } = useGameRoom();
  const { state } = useCardPicking(gameId as Id<"games">);

  if (gameSessionState?.gamePhase !== GamePhase.PICKING_ROLES) return null;
  if (!state) return null;

  if (state.isComplete) {
    return (
      <p className="text-center text-xs font-medium uppercase tracking-[0.25em] text-emerald-400/90">
        {t("allCardsPicked")}
      </p>
    );
  }

  if (state.currentSeat === null) return null;

  return (
    <p className="text-center text-xs font-medium uppercase tracking-[0.25em] text-amber-300/90">
      <span className="text-white/60">{t("pickingNow")}</span>{" "}
      <span className="text-amber-200">{t("seatLabel", { seat: state.currentSeat })}</span>
    </p>
  );
}
