"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { AuthInput } from "./AuthInput";

interface EmailVerificationProps {
  email: string;
  onCancel: () => void;
}

export default function EmailVerification({
  email,
  onCancel,
}: EmailVerificationProps) {
  const { signIn } = useAuthActions();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    signIn("password", formData)
      .catch(() => {
        setError("Invalid code. Please check your email and try again.");
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
          <MailCheck className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm text-gray-500 font-sans">
          We sent a verification code to
        </p>
        <p className="mt-1 font-medium text-white font-sans text-sm">
          {email}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput
          id="code"
          name="code"
          label="Verification code"
          type="text"
          inputMode="numeric"
          placeholder="12345678"
          required
          autoComplete="one-time-code"
          className="text-center text-lg tracking-widest"
        />

        <input name="flow" type="hidden" value="email-verification" />
        <input name="email" type="hidden" value={email} />

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <p className="text-sm text-red-400 font-sans">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full relative py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-semibold font-sans text-sm shadow-[0_0_25px_rgba(220,38,38,0.35)] hover:shadow-[0_0_40px_rgba(220,38,38,0.55)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Verifying…
            </>
          ) : (
            "Verify Email"
          )}
        </button>
      </form>

      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-gray-500 hover:text-gray-300 font-sans transition-colors"
      >
        Back to sign up
      </button>
    </div>
  );
}
