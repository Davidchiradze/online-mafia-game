"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SignUpFormData, signUpSchema } from "@/lib/auth/schemas";
import { signUpAction, type SignUpActionResult } from "@/lib/auth/actions";
import { AuthInput } from "./AuthInput";

export default function SignUpForm() {
  const [nonFieldError, setNonFieldError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", nickname: "" },
    mode: "onChange",
    criteriaMode: "all",
    reValidateMode: "onChange",
  });

  async function onSubmit(values: SignUpFormData) {
    setNonFieldError(null);
    clearErrors();
    const res = (await signUpAction(values)) as SignUpActionResult | void;
    if (!res) return;
    if (!res.success) {
      if (res.fieldErrors?.email)
        setError("email", { type: "manual", message: res.fieldErrors.email });
      if (res.fieldErrors?.nickname)
        setError("nickname", { type: "manual", message: res.fieldErrors.nickname });
      if (res.message) setNonFieldError(res.message);
    }
  }

  const isSubmitDisabled = isSubmitting || !isValid || Object.keys(errors).length > 0;

  return (
    <div className="w-full max-w-[420px]">
      {/* Glass card */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-orbitron font-bold text-white mb-2 tracking-tight">
            Create Account
          </h1>
          <p className="text-gray-500 font-sans text-sm">Join the game and pick your alias</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Non-field error */}
          {nonFieldError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <p className="text-sm text-red-400 font-sans">{nonFieldError}</p>
            </div>
          )}

          {/* Nickname */}
          <Controller
            name="nickname"
            control={control}
            render={({ field }) => (
              <AuthInput
                id="nickname"
                label="Nickname"
                type="text"
                placeholder="Your in-game alias"
                error={errors.nickname?.message as string | undefined}
                {...field}
              />
            )}
          />

          {/* Email */}
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <AuthInput
                id="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message as string | undefined}
                {...field}
              />
            )}
          />

          {/* Password */}
          <AuthInput
            id="password"
            label="Password"
            isPassword
            placeholder="Create a password"
            error={errors.password?.message as string | undefined}
            {...register("password")}
          />

          {/* Confirm Password */}
          <AuthInput
            id="confirmPassword"
            label="Confirm Password"
            isPassword
            placeholder="Repeat your password"
            error={errors.confirmPassword?.message as string | undefined}
            {...register("confirmPassword")}
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full relative py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-semibold font-sans text-sm shadow-[0_0_25px_rgba(220,38,38,0.35)] hover:shadow-[0_0_40px_rgba(220,38,38,0.55)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                Creating Account…
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-gray-700 font-sans text-xs uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Switch to Sign In */}
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
