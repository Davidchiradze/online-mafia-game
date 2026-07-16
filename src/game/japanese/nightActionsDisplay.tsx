"use client";

import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";

/**
 * Japanese host night-actions summary (docs/game-types.md §2.4). Shows the
 * single-authority scalars the night records: Mafia (M), Yakuza (Y), and the
 * Doctor's heal (H), highlighting the pill for the phase currently choosing.
 *
 * Moved verbatim from the old shared `NightActionsDisplay` (Japanese phase
 * indices + `mafiaTarget`/`yakuzaTarget`/`healedPlayer`) into the Japanese
 * ruleset; the shared component now dispatches to `ruleset.nightActionsDisplay`.
 */
export default function JapaneseNightActionsDisplay() {
  const { nightPhaseSession, gameSessionState, isHost } = useGameRoom();

  if (!isHost || !gameSessionState) return null;

  const currentPhase = gameSessionState.gamePhase;

  const nightPhases: string[] = [
    GAME_PHASES[8],
    GAME_PHASES[9],
    GAME_PHASES[10],
    GAME_PHASES[11],
    GAME_PHASES[12],
    GAME_PHASES[13],
    GAME_PHASES[14],
  ];

  if (!nightPhases.includes(currentPhase)) return null;

  const mafiaTarget = nightPhaseSession?.mafiaTarget;
  const yakuzaTarget = nightPhaseSession?.yakuzaTarget;
  const healedPlayer = nightPhaseSession?.healedPlayer;

  return (
    <div className="flex items-center justify-center gap-2 mb-1">
      <ActionItem
        label="M"
        value={mafiaTarget}
        isActive={currentPhase === GAME_PHASES[9]}
        color="rose"
      />
      <ActionItem
        label="Y"
        value={yakuzaTarget}
        isActive={currentPhase === GAME_PHASES[12]}
        color="violet"
      />
      <ActionItem
        label="H"
        value={healedPlayer}
        isActive={currentPhase === GAME_PHASES[14]}
        color="emerald"
      />
    </div>
  );
}

function ActionItem({
  label,
  value,
  isActive,
  color,
}: {
  label: string;
  value: number | null | undefined;
  isActive: boolean;
  color: "rose" | "violet" | "emerald";
}) {
  const hasValue = value !== null && value !== undefined;

  const getPillClass = () => {
    if (isActive) return `night-action-pill night-action-pill-${color}-active`;
    if (hasValue) return `night-action-pill night-action-pill-${color}-value`;
    return "night-action-pill night-action-pill-empty";
  };

  const getTextClass = () => {
    if (isActive) return `text-${color}-300`;
    if (hasValue) return `text-${color}-400`;
    return "text-white/40";
  };

  return (
    <div className={getPillClass()}>
      <span className={`font-orbitron text-xs font-semibold ${getTextClass()}`}>
        {label}: {hasValue ? `#${value}` : "-"}
      </span>
    </div>
  );
}
