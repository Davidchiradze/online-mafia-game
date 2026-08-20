"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { joinRequests } from "@convex/refs/lobby";
import { ROOM_PIN } from "@convex/lib/constants";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import PromptCard, {
  BACK_BUTTON_CLASS,
} from "@/features/game-room/components/room/PromptCard";
import { useErrorMessage } from "@/shared/lib/i18n/errorMessage";
import { cn } from "@/shared/lib/cn";
import type { Id } from "@convex/_generated/dataModel";

type RoomPinPromptProps = {
  gameId: Id<"games">;
  gameName: string;
};

/**
 * The gate on a private room: type the PIN the host shared, and you are in.
 *
 * There is no host approval and no waiting room behind this — a correct PIN
 * writes the grant itself, `myStatus` flips to `accepted`, and the page
 * re-renders straight into the room. Nothing here needs to navigate.
 *
 * `submitPin` reports a wrong or throttled PIN as `ok: false` rather than
 * throwing (a throw would roll back the attempt counter server-side), so the
 * failure arrives as a code this maps through `useErrorMessage`.
 */
export default function RoomPinPrompt({ gameId, gameName }: RoomPinPromptProps) {
  const t = useTranslations("game.pinPrompt");
  const router = useRouter();
  const submitPin = useMutation(joinRequests.submitPin);
  const getErrorMessage = useErrorMessage();

  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = ROOM_PIN.PATTERN.test(pin) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitPin({ gameId, pin });
      if (result.ok) return; // `myStatus` flips; the page swaps this out.
      // `useErrorMessage` reads a ConvexError's `.data`; hand it that shape so
      // a RETURNED failure translates exactly like a thrown one would.
      setError(getErrorMessage({ data: { code: result.code } }));
      setPin("");
      setSubmitting(false);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <PromptCard
      icon={KeyRound}
      accent="amber"
      title={t("title")}
      description={t("description", { name: gameName })}
    >
      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-left">
          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
          <p className="font-sans text-sm text-red-400">{error}</p>
        </div>
      )}

      <input
        value={pin}
        onChange={(e) =>
          setPin(e.target.value.replace(/\D/g, "").slice(0, ROOM_PIN.LENGTH))
        }
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder={t("placeholder")}
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        maxLength={ROOM_PIN.LENGTH}
        aria-label={t("title")}
        className="mb-6 w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-center font-orbitron text-2xl tracking-[0.6em] text-white placeholder-gray-600 transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
      />

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/lobby")}
          disabled={submitting}
          className={BACK_BUTTON_CLASS}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 py-3 font-sans text-sm font-semibold text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] transition",
            "hover:from-amber-500 hover:to-amber-600 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("unlocking")}
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              {t("enter")}
            </>
          )}
        </button>
      </div>
    </PromptCard>
  );
}
