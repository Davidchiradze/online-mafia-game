"use client";

import { useState } from "react";
import JoinRequestsDrawer from "@/components/host-controls/JoinRequestsDrawer";

export default function HostView({ gameId }: { gameId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 h-[480px]">
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 h-[480px]"></div>
    </div>
  );
}
