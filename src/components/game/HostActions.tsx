"use client";

import { useState } from "react";
import JoinRequestsDrawer from "@/components/host-controls/JoinRequestsDrawer";

export default function HostView({ gameId }: { gameId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-row gap-6">
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md bg-blue-600 text-white"
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
