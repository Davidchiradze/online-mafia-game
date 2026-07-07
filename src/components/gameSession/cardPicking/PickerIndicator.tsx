"use client";

import { useTranslations } from "next-intl";
import { useCardPicking } from "@/hooks/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import type { Id } from "@convex/_generated/dataModel";

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

  if (gameSessionState?.gamePhase !== GAME_PHASES[1]) return null;
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
