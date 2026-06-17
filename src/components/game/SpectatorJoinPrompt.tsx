"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { gameSpectators } from "@convex/refs/game";
import { ArrowLeft, Eye, Loader2, Lock } from "lucide-react";
import { useErrorMessage } from "@/lib/i18n/errorMessage";
import type { Id } from "@convex/_generated/dataModel";

type GameSummary = {
  _id: Id<"games">;
  name: string;
  hostId: Id<"profiles">;
  gameType: string;
  gameStatus: string;
  maxPlayers: number;
};

type Props = {
  gameId: string;
  game: GameSummary;
  currentSpectatorCount: number;
  isPrivate?: boolean;
};

export default function SpectatorJoinPrompt({ gameId, game, isPrivate }: Props) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinSpectator = useMutation(gameSpectators.join);
  const getErrorMessage = useErrorMessage();

  const handleJoinAsSpectator = async () => {
    if (isJoining) return;
    setIsJoining(true);
    setError(null);
    try {
      await joinSpectator({ gameId: gameId as Id<"games"> });
      setHasJoined(true);
    } catch (err) {
      setError(getErrorMessage(err));
      setIsJoining(false);
    }
  };

  if (hasJoined) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-gray-400 font-sans text-sm">
          Connecting as spectator…
        </p>
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div
          className="rounded-2xl border border-white/10 p-8 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(20,20,32,0.96) 0%, rgba(10,10,18,0.96) 100%)",
            boxShadow:
              "0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(245,158,11,0.12)",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center mx-auto mb-6"
            style={{ boxShadow: "0 0 30px rgba(245,158,11,0.25)" }}
          >
            <Lock className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-white font-orbitron font-bold text-xl tracking-tight mb-2">
            Private Game
          </h2>
          <p className="text-gray-500 font-sans text-sm leading-relaxed mb-7">
            <span className="text-white font-medium">{game.name}</span> is a
            private room. Spectators are not allowed to join this game.
          </p>

          <div className="h-px bg-white/[0.06] mb-6" />

          <button
            onClick={() => router.push("/lobby")}
            className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 font-sans text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Glass card */}
      <div
        className="rounded-2xl border border-white/10 p-8 text-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(20,20,32,0.96) 0%, rgba(10,10,18,0.96) 100%)",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(59,130,246,0.12)",
        }}
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center mx-auto mb-6"
          style={{ boxShadow: "0 0 30px rgba(59,130,246,0.35)" }}
        >
          <Eye className="w-7 h-7 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-white font-orbitron font-bold text-xl tracking-tight mb-2">
          Game in Progress
        </h2>
        <p className="text-gray-500 font-sans text-sm leading-relaxed mb-7">
          <span className="text-white font-medium">{game.name}</span> has
          already started. Join as a spectator to watch the action unfold.
        </p>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 mb-6 text-left">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <p className="text-sm text-red-400 font-sans">{error}</p>
          </div>
        )}

        {/* Spectator rules card */}
        <div
          className="rounded-xl border border-white/[0.06] p-4 mb-7 text-left space-y-2.5"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-gray-500 font-sans text-xs uppercase tracking-wider mb-3">
            As a spectator you will
          </p>
          {[
            {
              icon: "✓",
              color: "text-green-400",
              text: "Watch all day phase activities",
            },
            {
              icon: "✓",
              color: "text-green-400",
              text: "See player discussions and voting",
            },
            {
              icon: "○",
              color: "text-amber-400",
              text: "Night phases hidden (like dead players)",
            },
            {
              icon: "✗",
              color: "text-red-400",
              text: "Cannot participate or interact",
            },
          ].map(({ icon, color, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className={`font-bold text-sm ${color} w-4 shrink-0`}>
                {icon}
              </span>
              <span className="text-gray-400 font-sans text-sm">{text}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] mb-6" />

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/lobby")}
            disabled={isJoining}
            className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 font-sans text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleJoinAsSpectator}
            disabled={isJoining}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-sans text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining…
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Watch Game
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
