"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { AuthInput } from "./AuthInput";

interface PasswordResetProps {
  onBack: () => void;
}

export default function PasswordReset({ onBack }: PasswordResetProps) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"forgot" | { email: string }>("forgot");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (step === "forgot") {
    return (
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          <div className="mb-8">
            <h1 className="text-2xl font-orbitron font-bold text-white mb-2 tracking-tight">
              Reset Password
            </h1>
            <p className="text-gray-500 font-sans text-sm">
              Enter your email to receive a reset code
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              setLoading(true);

              const formData = new FormData(event.currentTarget);
              const email = formData.get("email") as string;

              signIn("password", formData)
                .then(() => setStep({ email }))
                .catch(() => setError("Could not send reset code. Please try again."))
                .finally(() => setLoading(false));
            }}
            className="space-y-5"
          >
            <AuthInput
              id="reset-email"
              name="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />

            <input name="flow" type="hidden" value="reset" />

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
                  Sending Code…
                </>
              ) : (
                "Send Reset Code"
              )}
            </button>
          </form>

          <div className="mt-6">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-gray-300 font-sans transition-colors w-full text-center"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        <div className="mb-8">
          <h1 className="text-2xl font-orbitron font-bold text-white mb-2 tracking-tight">
            New Password
          </h1>
          <p className="text-gray-500 font-sans text-sm">
            Enter the code and your new password
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center mx-auto mb-2 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-gray-500 font-sans">
            Reset code sent to
          </p>
          <p className="mt-0.5 font-medium text-white font-sans text-sm">
            {step.email}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            setLoading(true);

            const formData = new FormData(event.currentTarget);
            signIn("password", formData)
              .catch(() => setError("Invalid code or password. Please try again."))
              .finally(() => setLoading(false));
          }}
          className="space-y-5"
        >
          <AuthInput
            id="reset-code"
            name="code"
            label="Reset code"
            type="text"
            inputMode="numeric"
            placeholder="12345678"
            required
            autoComplete="one-time-code"
            className="text-center text-lg tracking-widest"
          />

          <AuthInput
            id="new-password"
            name="newPassword"
            label="New password"
            isPassword
            placeholder="Create a new password"
            required
            minLength={8}
            autoComplete="new-password"
          />

          <input name="email" type="hidden" value={step.email} />
          <input name="flow" type="hidden" value="reset-verification" />

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
                Resetting…
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setStep("forgot")}
            className="text-sm text-gray-500 hover:text-gray-300 font-sans transition-colors w-full text-center"
          >
            Try a different email
          </button>
        </div>
      </div>
    </div>
  );
}
