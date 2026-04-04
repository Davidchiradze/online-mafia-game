"use client";

import { useState, forwardRef, InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  isPassword?: boolean;
}

/**
 * Reusable dark-themed input for auth forms.
 * Handles password visibility toggle and error display internally.
 */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    { label, error, isPassword = false, id, type, className = "", ...props },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const resolvedType = isPassword
      ? showPassword
        ? "text"
        : "password"
      : type;

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-400 font-sans"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={resolvedType}
            className={`w-full px-4 py-3 ${isPassword ? "pr-12" : ""} rounded-xl bg-white/[0.05] border ${
              error
                ? "border-red-500/50 focus:border-red-500"
                : "border-white/[0.08] focus:border-red-500/50"
            } text-white placeholder-gray-600 font-sans text-sm focus:outline-none focus:ring-2 ${
              error ? "focus:ring-red-500/20" : "focus:ring-red-500/10"
            } transition-all duration-200 ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-400 font-sans">{error}</p>}
      </div>
    );
  },
);

AuthInput.displayName = "AuthInput";
