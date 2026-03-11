"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { api } = require("@convex/_generated/api");

type Profile = {
  nickname: string;
} | null;

export default function UserButton() {
  const { signOut } = useAuthActions();
  const profile = useQuery(api.auth.profiles.currentProfile) as Profile | undefined;

  if (!profile) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.1] text-sm font-medium text-red-400 font-orbitron">
        {profile.nickname[0]?.toUpperCase() ?? "?"}
      </div>
      <span className="text-sm text-gray-300 font-sans">
        {profile.nickname}
      </span>
      <button
        onClick={() => void signOut()}
        className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/[0.08] font-sans transition-all"
      >
        Sign out
      </button>
    </div>
  );
}
