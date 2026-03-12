"use client";

import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";

/**
 * Compact inline display for host to see current night's kill attempts and heals.
 * Only visible to host during night phases.
 */
export default function NightActionsDisplay() {
  const { nightPhaseSession, gameSessionState, isHost } = useGameRoom();

  // Only show for host during night phases
  if (!isHost || !gameSessionState) return null;

  const currentPhase = gameSessionState.gamePhase;

  // Define which phases should show this display
  const nightPhases: string[] = [
    GAME_PHASES[8], // "night_phase"
    GAME_PHASES[9], // "mafia_chooses_target"
    GAME_PHASES[10], // "don_checks_for_detective"
    GAME_PHASES[11], // "right_hand_checks_for_yakuza"
    GAME_PHASES[12], // "yakuza_and_shogun_chooses_target"
    GAME_PHASES[13], // "detective_checks_for_mafia"
    GAME_PHASES[14], // "doctor_heals_player"
  ];

  if (!nightPhases.includes(currentPhase)) return null;

  const mafiaTarget = nightPhaseSession?.mafiaTarget;
  const yakuzaTarget = nightPhaseSession?.yakuzaTarget;
  const healedPlayer = nightPhaseSession?.healedPlayer;

  return (
    <div className="flex items-center gap-2 text-xs mb-1">
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

  const colors = {
    rose: {
      active: "bg-rose-500/20 text-rose-300 border-rose-500/50",
      hasValue: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      empty: "bg-white/5 text-white/40 border-white/10",
    },
    violet: {
      active: "bg-violet-500/20 text-violet-300 border-violet-500/50",
      hasValue: "bg-violet-500/10 text-violet-400 border-violet-500/30",
      empty: "bg-white/5 text-white/40 border-white/10",
    },
    emerald: {
      active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
      hasValue: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      empty: "bg-white/5 text-white/40 border-white/10",
    },
  };

  const style = isActive
    ? colors[color].active
    : hasValue
    ? colors[color].hasValue
    : colors[color].empty;

  return (
    <div
      className={`flex items-center gap-1 px-2.5 py-1 rounded-md border ${style}`}
    >
      <span className="font-medium">{label}:</span>
      <span className={hasValue ? "font-bold" : ""}>
        {hasValue ? `#${value}` : "-"}
      </span>
    </div>
  );
}
