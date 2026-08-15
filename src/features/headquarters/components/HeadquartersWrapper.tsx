"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { isGuestViewablePath } from "@convex/lib/access";
import { SignedInGuard } from "@/features/auth/components/SignedInGuard";
import { ViewerGate } from "@/features/auth/components/ViewerGate";
import { useViewer } from "@/features/auth/hooks/useViewer";
import AuthorizedHeader from "@/features/headquarters/components/AuthorizedHeader";
import NavigationSidebar from "@/features/headquarters/components/NavigationSidebar";
import FloatingChatWidget from "@/features/headquarters/community-chat/FloatingChatWidget";
import { useMyJoinRequestNotifications } from "@/features/headquarters/hooks/useMyJoinRequestNotifications";

type HeadquartersWrapperProps = {
  children: React.ReactNode;
};

/**
 * Runs the join-request listener. Mounted only for a settled member so its
 * query (`myActiveRequests` → `getAuthenticatedUser`) never fires for a guest
 * or during the auth bootstrap window, where it would throw.
 */
function JoinRequestNotifier() {
  useMyJoinRequestNotifications();
  return null;
}

export default function HeadquartersWrapper({
  children,
}: HeadquartersWrapperProps) {
  const pathname = usePathname();
  const viewer = useViewer();
  // /lobby and /leaderboard render read-only for a guest; every other route in
  // this shell (match history, subscriptions) stays members-only. Derived from
  // the same list the edge middleware uses, so the two can never disagree.
  const guestViewable = isGuestViewablePath(pathname);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  const handleSignOut = () => {
    window.location.href = "/api/auth/logout";
  };
  return (
    <div
      className="relative flex min-h-screen overflow-hidden bg-[#0a0a12] text-white"
      style={{
        background:
          "linear-gradient(180deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)",
      }}
    >
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.mafia.ge/templates/newassets/img/mafiabg.jpg"
          alt=""
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80" />
      </div>

      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`fixed left-0 top-0 z-30 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-white/5 transition-all duration-300 ease-in-out md:flex ${isSidebarHovered ? "w-[280px] bg-black/95" : "w-[72px] bg-black/80"}`}
      >
        <NavigationSidebar
          expanded={isSidebarHovered}
          onSignOut={handleSignOut}
        />
      </aside>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-hidden border-r border-white/10 bg-black/90 md:hidden"
            >
              <NavigationSidebar expanded onSignOut={handleSignOut} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 flex h-screen min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out md:ml-[72px]">
        <AuthorizedHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-black/20 shadow-[-10px_-10px_30px_rgba(0,0,0,0.5)] md:rounded-tl-3xl md:border-l md:border-t md:border-white/10">
          <div className="h-full">
            {guestViewable ? (
              <ViewerGate>
                {viewer.isMember && <JoinRequestNotifier />}
                {children}
              </ViewerGate>
            ) : (
              <SignedInGuard>
                {viewer.isMember && <JoinRequestNotifier />}
                {children}
              </SignedInGuard>
            )}
          </div>
        </main>
      </div>

      {viewer.isMember && <FloatingChatWidget />}
    </div>
  );
}
