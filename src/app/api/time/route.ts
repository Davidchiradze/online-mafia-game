export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { t: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
