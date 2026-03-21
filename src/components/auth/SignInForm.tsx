"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { AuthInput } from "./AuthInput";
import PasswordReset from "./PasswordReset";
import EmailVerification from "./EmailVerification";

export default function SignInForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  if (showReset) {
    return <PasswordReset onBack={() => setShowReset(false)} />;
  }

  if (unverifiedEmail) {
    return (
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          <div className="mb-6">
            <h1 className="text-2xl font-orbitron font-bold text-white mb-2 tracking-tight">
              Verify Your Email
            </h1>
            <p className="text-gray-500 font-sans text-sm">
              Your email hasn&apos;t been verified yet. Check your inbox for the verification code.
            </p>
          </div>
          <EmailVerification
            email={unverifiedEmail}
            onCancel={() => setUnverifiedEmail(null)}
          />
        </div>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;

    try {
      const { signingIn } = await signIn("password", formData);
      if (!signingIn) {
        setUnverifiedEmail(email);
        return;
      }
      router.replace("/lobby");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        <div className="mb-8">
          <h1 className="text-2xl font-orbitron font-bold text-white mb-2 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-gray-500 font-sans text-sm">Sign in to continue your game</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />

          <input name="flow" type="hidden" value="signIn" />

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
                Signing In…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowReset(true)}
            className="text-sm text-gray-500 hover:text-gray-300 font-sans transition-colors"
          >
            Forgot your password?
          </button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-gray-700 font-sans text-xs uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <p className="text-center text-gray-500 font-sans text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
