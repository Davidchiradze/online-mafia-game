"use client";

import { Eye, LogIn, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

type ModalType = "join" | "spectate";

interface LobbyConfirmModalProps {
  type: ModalType;
  roomName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const CONFIG = {
  join: {
    icon: LogIn,
    iconBg: "from-red-600 to-red-900",
    iconGlow: "rgba(220,38,38,0.4)",
    title: "Join Room",
    body: (name: string) => (
      <>
        You are about to join{" "}
        <span className="text-white font-semibold">{name}</span>. Once inside,
        you will be assigned a hidden role and the game may begin.
      </>
    ),
    confirmLabel: "Join Game",
    confirmClass:
      "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_0_20px_rgba(220,38,38,0.35)] hover:shadow-[0_0_35px_rgba(220,38,38,0.55)]",
  },
  spectate: {
    icon: Eye,
    iconBg: "from-blue-600 to-blue-900",
    iconGlow: "rgba(59,130,246,0.35)",
    title: "Spectate Room",
    body: (name: string) => (
      <>
        You are about to watch{" "}
        <span className="text-white font-semibold">{name}</span> as a spectator.
        You can observe but cannot participate.
      </>
    ),
    confirmLabel: "Watch Game",
    confirmClass:
      "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:shadow-[0_0_35px_rgba(59,130,246,0.55)]",
  },
} as const;

export function LobbyConfirmModal({
  type,
  roomName,
  onConfirm,
  onCancel,
  loading = false,
}: LobbyConfirmModalProps) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;

  return (
    <Modal
      open
      onClose={!loading ? onCancel : () => {}}
      title={cfg.title}
      variant="dark"
      size="md"
      footer={
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 font-sans text-sm font-medium transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl text-white font-sans text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 ${cfg.confirmClass}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </>
            ) : (
              cfg.confirmLabel
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cfg.iconBg} flex items-center justify-center mb-5`}
          style={{ boxShadow: `0 0 30px ${cfg.iconGlow}` }}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>

        <p className="text-gray-500 font-sans text-sm leading-relaxed">
          {cfg.body(roomName)}
        </p>
      </div>
    </Modal>
  );
}
