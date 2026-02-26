"use client";

import { FormProvider } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { useAuthForm } from "@/hooks/auth";
import Link from "next/link";
import { AuthInput } from "./AuthInput";

export default function SignInForm() {
  const { form, onSubmit, serverError } = useAuthForm("signin");
  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="w-full max-w-[420px]">
      {/* Glass card */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-orbitron font-bold text-white mb-2 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-gray-500 font-sans text-sm">Sign in to continue your game</p>
        </div>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <AuthInput
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={form.formState.errors.email?.message as string | undefined}
              {...form.register("email" as const)}
            />

            <AuthInput
              id="password"
              label="Password"
              isPassword
              placeholder="Enter your password"
              error={form.formState.errors.password?.message as string | undefined}
              {...form.register("password" as const)}
            />

            {/* Server error */}
            {serverError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-sm text-red-400 font-sans">{serverError as string}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full relative py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-semibold font-sans text-sm shadow-[0_0_25px_rgba(220,38,38,0.35)] hover:shadow-[0_0_40px_rgba(220,38,38,0.55)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  Signing In…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </FormProvider>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-gray-700 font-sans text-xs uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Switch to Sign Up */}
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
