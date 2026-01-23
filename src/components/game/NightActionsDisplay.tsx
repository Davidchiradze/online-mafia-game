"use client";

import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";

/**
 * Compact display for host to see current night's kill attempts and heals.
 * Shows in a responsive layout that works on both desktop and mobile.
 * Only visible to host during night phases.
 */
export default function NightActionsDisplay() {
  const { nightPhaseSession, gameSessionState, isHost } = useGameRoom();

  // Only show for host during night phases
  if (!isHost || !gameSessionState) return null;

  const currentPhase = gameSessionState.game_phase;
  const nightNumber = gameSessionState.current_night_number || 0;

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

  const mafiaTarget = nightPhaseSession?.mafia_target;
  const yakuzaTarget = nightPhaseSession?.yakuza_target;
  const healedPlayer = nightPhaseSession?.healed_player;

  // Check if there's anything to display
  const hasAnyAction = mafiaTarget || yakuzaTarget || healedPlayer;

  return (
    <div className="w-full bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-2 md:p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Night {nightNumber}
        </span>
        <span className="text-[10px] md:text-xs text-slate-500">
          🌙 Actions
        </span>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-3 gap-1.5 md:gap-2">
        {/* Mafia Target */}
        <ActionBadge
          icon="🔫"
          label="Mafia"
          value={mafiaTarget}
          color="red"
          isActive={currentPhase === GAME_PHASES[9]}
        />

        {/* Yakuza Target */}
        <ActionBadge
          icon="⚔️"
          label="Yakuza"
          value={yakuzaTarget}
          color="violet"
          isActive={currentPhase === GAME_PHASES[12]}
        />

        {/* Doctor Heal */}
        <ActionBadge
          icon="💊"
          label="Doctor"
          value={healedPlayer}
          color="green"
          isActive={currentPhase === GAME_PHASES[14]}
        />
      </div>

      {/* No actions message */}
      {!hasAnyAction && (
        <div className="text-center text-[10px] md:text-xs text-slate-500 mt-1">
          Waiting for actions...
        </div>
      )}
    </div>
  );
}

interface ActionBadgeProps {
  icon: string;
  label: string;
  value: number | null | undefined;
  color: "red" | "violet" | "green";
  isActive: boolean;
}

function ActionBadge({
  icon,
  label,
  value,
  color,
  isActive,
}: ActionBadgeProps) {
  const colorClasses = {
    red: {
      bg: value ? "bg-red-500/20" : "bg-slate-700/50",
      border: value ? "border-red-500/50" : "border-slate-600/50",
      text: value ? "text-red-400" : "text-slate-500",
      glow: isActive ? "shadow-red-500/20 shadow-lg" : "",
    },
    violet: {
      bg: value ? "bg-violet-500/20" : "bg-slate-700/50",
      border: value ? "border-violet-500/50" : "border-slate-600/50",
      text: value ? "text-violet-400" : "text-slate-500",
      glow: isActive ? "shadow-violet-500/20 shadow-lg" : "",
    },
    green: {
      bg: value ? "bg-emerald-500/20" : "bg-slate-700/50",
      border: value ? "border-emerald-500/50" : "border-slate-600/50",
      text: value ? "text-emerald-400" : "text-slate-500",
      glow: isActive ? "shadow-emerald-500/20 shadow-lg" : "",
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={`
        flex flex-col items-center justify-center
        rounded-md border p-1.5 md:p-2
        transition-all duration-200
        ${classes.bg} ${classes.border} ${classes.glow}
        ${isActive ? "ring-1 ring-offset-1 ring-offset-slate-800" : ""}
        ${isActive && color === "red" ? "ring-red-500/50" : ""}
        ${isActive && color === "violet" ? "ring-violet-500/50" : ""}
        ${isActive && color === "green" ? "ring-emerald-500/50" : ""}
      `}
    >
      <span className="text-sm md:text-base">{icon}</span>
      <span className="text-[9px] md:text-[10px] text-slate-400 mt-0.5">
        {label}
      </span>
      <span className={`text-sm md:text-base font-bold ${classes.text}`}>
        {value !== null && value !== undefined ? `#${value}` : "—"}
      </span>
    </div>
  );
}
