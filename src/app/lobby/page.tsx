import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchAllGameRooms } from "@/lib/gameRoom/actions";
import LobbyContent from "@/components/lobby/LobbyContent";

export default async function LobbyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const sessionsRes = await fetchAllGameRooms();
  const initialSessions = sessionsRes.ok ? sessionsRes.data : [];

  return (
    <LobbyContent
      user={{
        id: user.id,
        email: user.email,
        nickname: user.user_metadata?.nickname,
      }}
      initialSessions={initialSessions}
    />
  );
}
