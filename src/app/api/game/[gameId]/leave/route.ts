// import { NextRequest, NextResponse } from "next/server";
// import { leaveGamePlayer } from "@/lib/gamePlayers/actions";

// export async function POST(
//   request: NextRequest,
//   { params }: { params: Promise<{ gameId: string }> }
// ) {
//   try {
//     const { gameId } = await params;
//     const result = await leaveGamePlayer(gameId);

//     if (!result.ok) {
//       return NextResponse.json({ error: result.message }, { status: 400 });
//     }

//     return NextResponse.json({ ok: true });
//   } catch (error) {
//     return NextResponse.json(
//       { error: "Failed to leave game" },
//       { status: 500 }
//     );
//   }
// }
