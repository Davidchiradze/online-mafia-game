"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import AuthorizedHeader from "@/components/dashboard/AuthorizedHeader";
import NavigationSidebar from "@/components/dashboard/NavigationSidebar";

type HeadquartersWrapperProps = {
  children: React.ReactNode;
};

export default function HeadquartersWrapper({
  children,
}: HeadquartersWrapperProps) {
  const pathname = usePathname();
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  // const handleSignOut = () => {
  //   window.location.href = "/api/auth/logout";
  // };
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
        className={`fixed left-0 top-0 z-30 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-white/5 bg-black/80 backdrop-blur-xl transition-all duration-300 ease-in-out md:flex ${isSidebarHovered ? "w-[240px]" : "w-[72px]"}`}
      >
        <NavigationSidebar expanded={isSidebarHovered} />
      </aside>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col overflow-hidden border-r border-white/10 bg-black/90 backdrop-blur-xl md:hidden"
            >
              <NavigationSidebar
                expanded
                // onSignOut={handleSignOut}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 flex h-screen min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out md:ml-[72px]">
        <AuthorizedHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-black/20 shadow-[-10px_-10px_30px_rgba(0,0,0,0.5)] md:rounded-tl-3xl md:border-l md:border-t md:border-white/10">
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
