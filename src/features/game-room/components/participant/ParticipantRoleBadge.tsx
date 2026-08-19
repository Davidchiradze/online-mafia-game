"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ALL_ROLES,
  MAFIA_TEAM_ROLES,
  YAKUZA_TEAM_ROLES,
} from "@/shared/lib/constants/game";
import { getRoleIcon } from "@/features/game-room/lib/roleIcons";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";

const MAFIA_ROLE_SET = new Set<string>(MAFIA_TEAM_ROLES);
const YAKUZA_ROLE_SET = new Set<string>(YAKUZA_TEAM_ROLES);
// Every variant's roles, not just Japanese's — an unlisted role renders no
// badge at all, which reads as "no role assigned" rather than as a bug.
const KNOWN_ROLES = new Set<string>(ALL_ROLES);

const BADGE_BASE =
  "font-inter text-[7px] tsm:text-[9px] tlg:text-[11px] font-medium shrink-0 px-1 py-0.5 tsm:px-1.5 rounded";

/**
 * Holds the icon and the text pill as siblings so CSS can pick one. The pill's
 * own padding/background live on the inner span, not here — below `tsm` only
 * the bare icon shows, and a pill around it would clip the diamond's corners.
 */
const REVEALED_WRAPPER = "shrink-0 inline-flex items-center";

/** Sized to match `SeatIndicator`'s dial, its neighbour in the same info bar. */
const ROLE_ICON =
  "w-4 h-4 tsm:hidden drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]";

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
    ? tg(`roles.${playerRole as (typeof ALL_ROLES)[number]}`)
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

  const icon = getRoleIcon(playerRole);

  // Below `tsm` a tile is too small for a 7px label to be legible, so the role
  // shows as its icon and the text pill is dropped. Both are rendered and
  // swapped in CSS rather than picked in JS: `tsm` gates on viewport *height*
  // as well as width (see globals.css), so a JS media query would have to
  // re-measure on every resize, once per tile, for a purely visual choice.
  // A role with no artwork keeps its label at every size instead of vanishing.
  const revealed = (
    <>
      {icon && <Image src={icon} alt={label} className={ROLE_ICON} />}
      <span
        className={`${icon ? "hidden tsm:inline-block" : "inline-block"} ${BADGE_BASE} ${getRoleColorClass(playerRole)}`}
      >
        {label}
      </span>
    </>
  );

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
        className={`${REVEALED_WRAPPER} cursor-pointer transition hover:brightness-110 active:scale-95`}
      >
        {revealed}
      </button>
    );
  }

  // Teammates' badges (and everyone's at game end) are static labels.
  return <span className={REVEALED_WRAPPER}>{revealed}</span>;
}
