"use client";

import { Menu } from "lucide-react";
import LanguageSwitcher from "@/shared/ui/LanguageSwitcher";
import { useViewer } from "@/features/auth/hooks/useViewer";
import HeaderUserChip from "@/features/headquarters/components/HeaderUserChip";
import HeaderSignInButton from "@/features/headquarters/components/HeaderSignInButton";

type AuthorizedHeaderProps = {
  onOpenMobileMenu: () => void;
};

export default function AuthorizedHeader({
  onOpenMobileMenu,
}: AuthorizedHeaderProps) {
  const viewer = useViewer();

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/5 bg-black/30 px-4 transition-colors sm:px-6 lg:px-8">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="-ml-2 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        {viewer.status === "member" ? (
          <HeaderUserChip profile={viewer.profile} />
        ) : viewer.status === "guest" ? (
          <HeaderSignInButton />
        ) : (
          // loading/syncing: fixed-size skeleton so the header doesn't jump.
          <div className="h-[46px] w-[168px] rounded-lg border border-white/5 bg-white/[0.03]" />
        )}
      </div>
    </header>
  );
}
