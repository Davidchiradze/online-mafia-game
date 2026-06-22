"use client";

import { useState } from "react";
import { useCommunityChat } from "./useCommunityChat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { OnlinePanel } from "./OnlinePanel";
import { OnlineUsersDrawer } from "./OnlineUsersDrawer";

export function CommunityChat() {
  const { messages, online, myId, canModerate, send, remove } = useCommunityChat();
  const [showUsersMobile, setShowUsersMobile] = useState(false);

  const onlineCount = online?.count ?? 0;
  const users = online?.users;

  return (
    <div className="h-full flex font-inter">
      {/* Chat Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader onlineCount={onlineCount} onOpenUsers={() => setShowUsersMobile(true)} />
        <MessageList
          messages={messages}
          myId={myId}
          canModerate={canModerate}
          onRemove={remove}
        />
        <Composer onSend={send} />
      </div>

      {/* Online Users Panel — Desktop */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-l border-white/5 backdrop-blur-md bg-black/20">
        <OnlinePanel users={users} count={onlineCount} myId={myId} />
      </aside>

      {/* Online Users Panel — Mobile Drawer */}
      <OnlineUsersDrawer
        open={showUsersMobile}
        onClose={() => setShowUsersMobile(false)}
        users={users}
        count={onlineCount}
        myId={myId}
      />
    </div>
  );
}
