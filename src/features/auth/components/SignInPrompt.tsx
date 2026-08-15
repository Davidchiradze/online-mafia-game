"use client";

import { useTranslations } from "next-intl";
import { Eye, LogIn } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import { phpLoginUrl } from "@/features/auth/lib/phpLogin";

type SignInPromptReason = "join" | "spectate";

type SignInPromptProps = {
  reason: SignInPromptReason;
  /** Defaults to the current path so mafia.ge returns here after login. */
  returnTo?: string;
  onClose: () => void;
};

const CONFIG = {
  join: {
    icon: LogIn,
    iconBg: "from-red-600 to-red-900",
    iconGlow: "rgba(220,38,38,0.4)",
    titleKey: "guestJoinTitle",
    bodyKey: "guestJoinBody",
  },
  spectate: {
    icon: Eye,
    iconBg: "from-blue-600 to-blue-900",
    iconGlow: "rgba(59,130,246,0.35)",
    titleKey: "guestSpectateTitle",
    bodyKey: "guestSpectateBody",
  },
} as const;

/**
 * Modal shown when a guest clicks Join/Spectate on a room card. A hard
 * cross-origin redirect with no explanation is a worse experience than one
 * extra click — this is the only place we can say "you'll come back here"
 * before sending them to mafia.ge. Mirrors `LobbyConfirmModal`'s shape.
 */
export function SignInPrompt({ reason, returnTo, onClose }: SignInPromptProps) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const cfg = CONFIG[reason];
  const Icon = cfg.icon;

  return (
    <Modal
      open
      onClose={onClose}
      title={t(cfg.titleKey)}
      variant="dark"
      size="md"
      footer={
        <div className="flex w-full gap-3">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl border border-white/10 py-3 font-sans text-sm font-medium text-gray-400 transition hover:border-white/20 hover:text-white"
          >
            {tc("cancel")}
          </button>
          <a
            href={phpLoginUrl(returnTo)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 py-3 font-sans text-sm font-semibold text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] transition hover:from-red-500 hover:to-red-600 hover:shadow-[0_0_35px_rgba(220,38,38,0.55)]"
          >
            {t("signInOnSite")}
          </a>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${cfg.iconBg}`}
          style={{ boxShadow: `0 0 30px ${cfg.iconGlow}` }}
        >
          <Icon className="h-7 w-7 text-white" />
        </div>
        <p className="font-sans text-sm leading-relaxed text-gray-500">
          {t(cfg.bodyKey)}
        </p>
      </div>
    </Modal>
  );
}
