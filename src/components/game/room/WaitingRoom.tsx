"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock, CheckCircle, X, LogOut } from "lucide-react";
import { JOIN_REQUEST_STATUSES } from "@/shared/lib/constants/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";

type Props = {
  status: string;
  gameId: string;
  userId: string;
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function AnimatedDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => (c >= 3 ? 1 : c + 1)), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-block w-6 text-left">{".".repeat(count)}</span>
  );
}

export default function WaitingRoom({ status, gameId }: Props) {
  const router = useRouter();
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setWaitingSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const handleLeave = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    router.push("/lobby");
  };

  const isPending = status === JOIN_REQUEST_STATUSES.PENDING;
  const isAccepted = status === JOIN_REQUEST_STATUSES.ACCEPTED;
  const isRejected = status === JOIN_REQUEST_STATUSES.REJECTED;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Main card */}
      <div
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {/* Header */}
        <RoomHeader
          gameId={gameId}
          onLeave={handleLeave}
          isLeaving={isLeaving}
        />

        {/* Body */}
        <div className="px-6 sm:px-8 py-8 sm:py-10">
          {isPending && <PendingState waitingSeconds={waitingSeconds} />}
          {isAccepted && <AcceptedState />}
          {isRejected && (
            <RejectedState onLeave={handleLeave} isLeaving={isLeaving} />
          )}
        </div>

        {/* Footer — leave button only for pending */}
        {isPending && (
          <WaitingRoomFooter handleLeave={handleLeave} isLeaving={isLeaving} />
        )}
      </div>

      {/* Tip */}
      {isPending && <WaitingRoomTip />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Room header — name, host, player count, leave X
// ---------------------------------------------------------------------------
function RoomHeader({
  gameId,
  onLeave,
  isLeaving,
}: {
  gameId: string;
  onLeave: () => void;
  isLeaving: boolean;
}) {
  const t = useTranslations("game.waitingRoom");
  const tg = useTranslations("game");
  const { gameData } = useGameRoom();
  const modeLabel = gameData
    ? tg(`gameTypes.${gameData.gameType}` as Parameters<typeof tg>[0])
    : null;
  const roomName = gameData?.name ?? `Room #${gameId.slice(0, 6)}`;

  return (
    <div
      className="px-6 sm:px-8 py-5 border-b border-white/10"
      style={{ background: "rgba(0,0,0,0.3)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="font-orbitron font-bold text-xl sm:text-2xl text-white bg-gradient-to-r from-white via-red-100 to-white bg-clip-text text-transparent truncate mb-2">
            {roomName}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            {modeLabel && (
              <span className="px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 text-gray-300 font-sans text-[0.8rem] font-medium">
                {modeLabel}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onLeave}
          disabled={isLeaving}
          title={t("leaveRoomTitle")}
          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition cursor-pointer disabled:opacity-40 shrink-0 group"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer leave button (pending state)
// ---------------------------------------------------------------------------
function WaitingRoomFooter({
  handleLeave,
  isLeaving,
}: {
  handleLeave: () => void;
  isLeaving: boolean;
}) {
  const t = useTranslations("game.waitingRoom");
  return (
    <div
      className="px-6 sm:px-8 py-5 border-t border-white/10"
      style={{ background: "rgba(0,0,0,0.3)" }}
    >
      <button
        onClick={handleLeave}
        disabled={isLeaving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 hover:border-white/20 font-sans text-sm font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogOut className="w-4 h-4" />
        {t("leaveRoom")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tip box (pending state)
// ---------------------------------------------------------------------------
function WaitingRoomTip() {
  const t = useTranslations("game.waitingRoom");
  return (
    <div
      className="mt-4 px-5 py-3 rounded-xl border border-white/10 text-center"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
      }}
    >
      <p className="text-gray-500 font-sans text-[0.8rem]">
        <span className="text-gray-400">{t("tipTitle")}:</span> {t("tip")}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending state
// ---------------------------------------------------------------------------
function PendingState({ waitingSeconds }: { waitingSeconds: number }) {
  const t = useTranslations("game.waitingRoom");
  return (
    <>
      {/* Animated clock icon */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-pulse" />
          <div
            className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-800 flex items-center justify-center border-4 border-amber-500/30"
            style={{ boxShadow: "0 0 40px rgba(245,158,11,0.4)" }}
          >
            <Clock className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>
      </div>

      {/* Status text */}
      <div className="text-center mb-8">
        <h2 className="font-orbitron font-bold text-xl sm:text-2xl text-white mb-2">
          {t("awaitingApproval")}
          <AnimatedDots />
        </h2>
        <p className="text-gray-400 font-sans text-sm mb-3">
          {t("joinRequestSent")}
        </p>
        <div className="flex items-center justify-center gap-2 text-gray-500 font-sans text-[0.85rem]">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono">{formatTime(waitingSeconds)}</span>
        </div>
      </div>

      {/* Players in room */}
      {/* <PlayersList players={players} hostUserId={hostUserId} /> */}
    </>
  );
}

// ---------------------------------------------------------------------------
// Accepted state
// ---------------------------------------------------------------------------
function AcceptedState() {
  const t = useTranslations("game.waitingRoom");
  return (
    <div className="flex flex-col items-center text-center py-4">
      <div
        className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-800 flex items-center justify-center mb-6 border-4 border-green-500/30"
        style={{ boxShadow: "0 0 40px rgba(34,197,94,0.4)" }}
      >
        <CheckCircle className="w-10 h-10 text-white" />
      </div>
      <h2 className="font-orbitron font-bold text-xl sm:text-2xl text-white mb-2">
        {t("youreIn")}
      </h2>
      <p className="text-gray-400 font-sans text-sm mb-6">
        {t("hostApproved")}
      </p>
      <div className="flex items-center gap-3 text-gray-500 font-sans text-sm">
        <div className="relative w-5 h-5">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 animate-spin" />
        </div>
        {t("settingUpSeat")}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rejected state
// ---------------------------------------------------------------------------
function RejectedState({
  onLeave,
  isLeaving,
}: {
  onLeave: () => void;
  isLeaving: boolean;
}) {
  const t = useTranslations("game.waitingRoom");
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center mb-6 border-4 border-red-500/30"
        style={{ boxShadow: "0 0 40px rgba(220,38,38,0.4)" }}
      >
        <X className="w-10 h-10 text-white" />
      </div>
      <h2 className="font-orbitron font-bold text-xl sm:text-2xl text-white mb-2">
        {t("requestDeclined")}
      </h2>
      <p className="text-gray-400 font-sans text-sm mb-6">
        {t("hostDeclined")}
      </p>

      <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 mb-7 text-left">
        <p className="text-amber-400/80 font-sans text-[0.8rem] leading-relaxed">
          {t("declinedReason")}
        </p>
      </div>

      <button
        onClick={onLeave}
        disabled={isLeaving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-sans text-sm font-semibold shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogOut className="w-4 h-4" />
        {t("backToLobby")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Players list
// ---------------------------------------------------------------------------
// function PlayersList({
//   players,
//   hostUserId,
// }: {
//   players: ReturnType<typeof useGameRoom>["players"];
//   hostUserId: string | null;
// }) {
//   if (players.length === 0) return null;

//   return (
//     <div
//       className="rounded-xl border border-white/10 overflow-hidden"
//       style={{ background: "rgba(0,0,0,0.2)" }}
//     >
//       <div
//         className="flex items-center justify-between px-5 py-3 border-b border-white/10"
//         style={{ background: "rgba(0,0,0,0.2)" }}
//       >
//         <h3 className="font-orbitron font-semibold text-white text-[0.85rem]">
//           Players in Room
//         </h3>
//         <span className="text-gray-500 font-sans text-[0.8rem]">
//           {players.length} joined
//         </span>
//       </div>
//       <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
//         {players.map((player) => {
//           const isHost = player.player_id === hostUserId;
//           const initial = (player.nickname ?? "P").charAt(0).toUpperCase();
//           return (
//             <div
//               key={player.player_id}
//               className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 border border-white/10"
//             >
//               <div className="flex items-center gap-3">
//                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-red-600 flex items-center justify-center shrink-0">
//                   <span className="text-white font-sans font-semibold text-[0.8rem]">
//                     {initial}
//                   </span>
//                 </div>
//                 <span className="text-white font-sans text-[0.9rem] font-medium">
//                   {player.nickname ?? "Player"}
//                 </span>
//               </div>
//               {isHost ? (
//                 <span className="px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 text-red-300 font-sans text-[0.7rem] font-bold uppercase tracking-wide">
//                   Host
//                 </span>
//               ) : (
//                 <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }
