"use client";

import { motion, AnimatePresence } from "motion/react";
import type { Id } from "@convex/_generated/dataModel";
import { OnlinePanel } from "./OnlinePanel";
import type { OnlineUser } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  users: OnlineUser[] | undefined;
  count: number;
  myId: Id<"profiles"> | undefined;
};

/** Slide-in online-players panel for mobile (hidden on `lg+`). */
export function OnlineUsersDrawer({ open, onClose, users, count, myId }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed inset-y-0 right-0 w-[280px] max-w-[85vw] flex flex-col z-50 backdrop-blur-xl bg-black/90 border-l border-white/10 lg:hidden"
          >
            <OnlinePanel users={users} count={count} myId={myId} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
