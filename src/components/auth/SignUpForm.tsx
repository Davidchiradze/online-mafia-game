"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { AuthInput } from "./AuthInput";
import EmailVerification from "./EmailVerification";

export default function SignUpForm() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"signUp" | { email: string }>("signUp");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (step !== "signUp") {
    return (
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          <div className="mb-6">
            <h1 className="text-2xl font-orbitron font-bold text-white mb-2 tracking-tight">
              Verify Your Email
            </h1>
            <p className="text-gray-500 font-sans text-sm">
              Enter the code we sent to complete sign up
            </p>
          </div>
          <EmailVerification
            email={step.email}
            onCancel={() => setStep("signUp")}
          />
        </div>
      </div>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const email = formData.get("email") as string;

    formData.delete("confirmPassword");

    signIn("password", formData)
      .then(() => {
        setStep({ email });
      })
      .catch((error) => {
        console.error("Sign up error:", error);
        setError("Could not create account. The email may already be in use.");
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        <div className="mb-8">
          <h1 className="text-2xl font-orbitron font-bold text-white mb-2 tracking-tight">
            Create Account
          </h1>
          <p className="text-gray-500 font-sans text-sm">
            Join the game and pick your alias
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthInput
            id="nickname"
            name="nickname"
            label="Nickname"
            type="text"
            placeholder="Your in-game alias"
            required
            minLength={2}
            maxLength={20}
            pattern="^[a-zA-Z0-9_\-\.]+$"
            title="Letters, numbers, _ - . only"
          />

          <AuthInput
            id="email"
            name="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <AuthInput
            id="password"
            name="password"
            label="Password"
            isPassword
            placeholder="Create a password"
            required
            minLength={8}
            autoComplete="new-password"
          />

          <AuthInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            isPassword
            placeholder="Repeat your password"
            required
            minLength={8}
            autoComplete="new-password"
          />

          <input name="flow" type="hidden" value="signUp" />

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <p className="text-sm text-red-400 font-sans">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full relative py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-semibold font-sans text-sm shadow-[0_0_25px_rgba(220,38,38,0.35)] hover:shadow-[0_0_40px_rgba(220,38,38,0.55)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                Creating Account…
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-gray-700 font-sans text-xs uppercase tracking-widest">
            or
          </span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <p className="text-center text-gray-500 font-sans text-sm">
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
