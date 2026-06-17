"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { authProfiles } from "@convex/refs/lobby";
import { LogOut, User, ChevronDown } from "lucide-react";
import { LandingLogo } from "@/components/landing/LandingLogo";
import UserAvatar from "../ui/UserAvatar";

export default function LobbyHeader() {
  const profile = useQuery(authProfiles.currentProfile);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = () => {
    window.location.href = "/api/auth/logout";
  };

  const displayName = profile?.nickname ?? "Player";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <LandingLogo size="md" />

        {/* User pill */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 hover:border-white/20 transition-all"
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-red-600 flex items-center justify-center shadow-lg">
                <UserAvatar
                  src={profile?.avatar}
                  name={profile?.nickname}
                  size={28}
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0a0a12]" />
            </div>

            <div className="text-left hidden sm:block">
              <div className="text-white font-sans text-sm font-semibold leading-tight">
                {displayName}
              </div>
              <div className="text-gray-500 font-sans text-xs leading-tight">
                Online
              </div>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-20 w-44 rounded-xl border border-white/10 bg-[#12121f] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-sans text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
