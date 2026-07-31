"use client";

import { useTranslations } from "next-intl";
import {
  JAPANESE_MAFIA_ROLES,
  MAFIA_TEAM_ROLES,
  YAKUZA_TEAM_ROLES,
} from "@/shared/lib/constants/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";

const MAFIA_ROLE_SET = new Set<string>(MAFIA_TEAM_ROLES);
const YAKUZA_ROLE_SET = new Set<string>(YAKUZA_TEAM_ROLES);
const KNOWN_ROLES = new Set<string>(JAPANESE_MAFIA_ROLES);

const BADGE_BASE =
  "font-inter text-[7px] tsm:text-[9px] tlg:text-[11px] font-medium shrink-0 px-1 py-0.5 tsm:px-1.5 rounded";

function getRoleColorClass(role: string): string {
  if (MAFIA_ROLE_SET.has(role))
    return "text-white font-semibold bg-black ring-1 ring-white/30 shadow-[0_0_8px_rgba(255,255,255,0.15)]";
  if (YAKUZA_ROLE_SET.has(role))
    return "text-white font-semibold bg-purple-600 ring-1 ring-purple-400/50 shadow-[0_0_8px_rgba(168,85,247,0.4)]";
  return "text-white font-semibold bg-red-600 ring-1 ring-red-400/50 shadow-[0_0_8px_rgba(239,68,68,0.4)]";
}

interface ParticipantRoleBadgeProps {
  /** The role to display, or null when none is assigned/visible for this tile. */
  playerRole: string | null;
  /** Whether this tile belongs to the local player. */
  isLocal: boolean;
  /** Whether the game has finished (all roles auto-revealed). */
  gameFinished: boolean;
}

/**
 * ParticipantRoleBadge — the faction-coloured role label in a participant tile.
 *
 * Roles are hidden by default. The local player reveals their own + teammates'
 * roles via a focus-gated "Reveal role" button, and can toggle back to hidden.
 * At game end every role shows automatically as a static label.
 */
export default function ParticipantRoleBadge({
  playerRole,
  isLocal,
  gameFinished,
}: ParticipantRoleBadgeProps) {
  const tg = useTranslations("game");
  const { rolesRevealed, setRolesRevealed, isHost, hostVisionEnabled } =
    useGameRoom();

  // No role assigned/visible for this tile → nothing to render.
  if (!playerRole) return null;

  const label = KNOWN_ROLES.has(playerRole)
    ? tg(`roles.${playerRole as (typeof JAPANESE_MAFIA_ROLES)[number]}`)
    : playerRole;

  // The host and staff spectators with host-vision already receive every role
  // from the server, so they bypass the local opt-in gate and always see them.
  const alwaysVisible = gameFinished || isHost || hostVisionEnabled;
  const showRoles = rolesRevealed || alwaysVisible;

  // Hidden: only the local player gets a focus/hover-gated reveal button.
  if (!showRoles) {
    if (!isLocal) return null;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setRolesRevealed(true);
        }}
        className={`${BADGE_BASE} cursor-pointer bg-black/75 text-white/90 ring-1 ring-white/20 transition opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto hover:brightness-125 active:scale-95`}
      >
        {tg("revealRole")}
      </button>
    );
  }

  // Revealed via opt-in: the local player can toggle back to hidden. When roles
  // are always visible (host / game end) the label stays static.
  if (isLocal && !alwaysVisible) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setRolesRevealed(false);
        }}
        className={`${BADGE_BASE} cursor-pointer transition hover:brightness-110 active:scale-95 ${getRoleColorClass(playerRole)}`}
      >
        {label}
      </button>
    );
  }

  // Teammates' badges (and everyone's at game end) are static labels.
  return (
    <span className={`${BADGE_BASE} ${getRoleColorClass(playerRole)}`}>
      {label}
    </span>
  );
}
