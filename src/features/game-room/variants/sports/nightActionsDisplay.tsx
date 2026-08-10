"use client";

import { useQuery } from "convex/react";
import { Crosshair } from "lucide-react";
import { sportsNightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";

/**
 * Sports host night-actions summary (docs/variants/sports.md §5). The Sports night
 * is the `unanimous-vote` model: every living mafia PRIVATELY picks a target in
 * a 5s window. Per-mafia picks are server-private (§5.4) — only the host may see
 * who each mafia chose, via the host-only `getHostSelections` query.
 *
 * Renders one pill per living mafia — `#<mafiaSeat> → #<targetSeat>` (or `-`
 * while that mafia hasn't picked). Highlighted during `mafia_chooses_target`.
 */
const SPORTS_NIGHT_PHASES: string[] = [
  "mafia_chooses_target",
  "don_checks_for_detective",
  "detective_checks_for_mafia",
];

export default function SportsNightActionsDisplay() {
  const { gameId, gameSessionState, isHost } = useGameRoom();

  const currentPhase = gameSessionState?.gamePhase;
  const inNightPhase =
    currentPhase !== undefined && SPORTS_NIGHT_PHASES.includes(currentPhase);

  const selections = useQuery(
    sportsNightPhase.getHostSelections,
    isHost && inNightPhase ? { gameId: gameId as Id<"games"> } : "skip",
  );

  if (!isHost || !inNightPhase) return null;
  if (!selections || selections.length === 0) return null;

  const isActive = currentPhase === "mafia_chooses_target";

  return (
    <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
      {selections.map(({ mafiaSeat, targetSeat }) => (
        <MafiaTargetItem
          key={mafiaSeat}
          mafiaSeat={mafiaSeat}
          targetSeat={targetSeat}
          isActive={isActive}
        />
      ))}
    </div>
  );
}

function MafiaTargetItem({
  mafiaSeat,
  targetSeat,
  isActive,
}: {
  mafiaSeat: number;
  targetSeat: number | null;
  isActive: boolean;
}) {
  const hasValue = targetSeat !== null;

  // The pill highlights (rose glow) only while mafia are actively choosing;
  // once a pick lands the pill goes neutral so the emphasis stays on the
  // target number, not the container.
  // Two distinct visual roles, not two look-alike "#N" numbers:
  //   · mafia seat  → a solid dark seat token (who is choosing / identity)
  //   · target      → a crosshair + filled rose chip (the kill decision)
  const pillClass = isActive
    ? "night-action-pill night-action-pill-rose-active"
    : hasValue
      ? "night-action-pill night-action-pill-rose-value"
      : "night-action-pill night-action-pill-empty";

  return (
    <div className={`${pillClass} flex items-center gap-2 !px-2 !py-1`}>
      {/* Mafia seat — neutral identity token */}
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 font-orbitron text-xs font-bold text-white/90 ring-1 ring-white/20">
        {mafiaSeat}
      </span>

      {/* Crosshair connector — always rose so the "→ kill" reads at a glance */}
      <Crosshair
        className={`h-3.5 w-3.5 shrink-0 ${hasValue ? "text-rose-400" : "text-white/30"}`}
        strokeWidth={2.5}
        aria-hidden
      />

      {/* Target — filled rose chip when chosen, dashed placeholder when not */}
      {hasValue ? (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 font-orbitron text-xs font-bold text-white shadow-[0_0_10px_rgba(244,63,94,0.6)]">
          {targetSeat}
        </span>
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-white/25 font-orbitron text-xs font-bold text-white/30">
          ?
        </span>
      )}
    </div>
  );
}
