import { useTranslations } from "next-intl";
import { Eye, Lock, LogIn, Users } from "lucide-react";
import { LobbyGame } from "@/features/lobby/components/LobbyContent";

type Props = {
  room: LobbyGame;
  isPlayer: boolean;
  canPlay: boolean;
  canSpectate: boolean;
  canSpectateAny: boolean;
  isGuest: boolean;
  full: boolean;
  onJoin: () => void;
  onSpectate: () => void;
};

const joinClass =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-[9px] bg-gradient-to-r from-red-500 to-red-700 px-[18px] py-2 font-orbitron text-[0.74rem] font-semibold tracking-[0.06em] text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] transition hover:-translate-y-px hover:shadow-[0_0_32px_rgba(220,38,38,0.6)] cursor-pointer";
const ghostClass =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/20 bg-white/10 px-[18px] py-2 font-orbitron text-[0.74rem] font-semibold tracking-[0.06em] text-white transition hover:bg-white/20 cursor-pointer";
const disabledClass =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/10 bg-white/5 px-[18px] py-2 font-orbitron text-[0.74rem] font-semibold tracking-[0.06em] text-gray-500 cursor-not-allowed";

/**
 * The footer call-to-action. Mirrors the lobby's join/spectate/subscription
 * rules: rejoin if already seated, spectate public playing games (staff may
 * watch private ones), and a lock icon when an active subscription is required.
 */
export default function RoomFooterAction({
  room,
  isPlayer,
  canPlay,
  canSpectate,
  canSpectateAny,
  isGuest,
  full,
  onJoin,
  onSpectate,
}: Props) {
  const t = useTranslations("game");

  if (room.gameStatus === "finished") {
    return (
      <button disabled className={disabledClass}>
        {t("row.ended")}
      </button>
    );
  }

  if (room.gameStatus === "playing") {
    if (isPlayer) {
      return (
        <button onClick={onJoin} className={joinClass}>
          {canPlay || isGuest ? (
            <LogIn className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          {t("row.rejoin")}
        </button>
      );
    }
    // A private game is watchable behind its PIN — the prompt on the game page
    // asks for it. Staff with GAME_SPECTATE_ANY skip the PIN entirely.
    const pinGated = room.isPrivate && !canSpectateAny;
    return (
      <button onClick={onSpectate} className={ghostClass}>
        {pinGated || !(canSpectate || isGuest) ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
        {t("row.spectate")}
      </button>
    );
  }

  // not_started
  if (full && !isPlayer) {
    return (
      <button disabled className={disabledClass}>
        <Users className="h-3.5 w-3.5" />
        {t("row.full")}
      </button>
    );
  }
  return (
    <button onClick={onJoin} className={joinClass}>
      {canPlay || isGuest ? (
        <LogIn className="h-3.5 w-3.5" />
      ) : (
        <Lock className="h-3.5 w-3.5" />
      )}
      {t("row.join")}
    </button>
  );
}
