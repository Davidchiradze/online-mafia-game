"use client";

import { useState } from "react";
import JoinRequestsDrawer from "@/components/host-controls/JoinRequestsDrawer";

export default function HostActions({ gameId }: { gameId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-row gap-2">
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
      >
        Manage Join Requests
      </button>
      <JoinRequestsDrawer
        gameId={gameId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
