import { getSession } from "@/lib/auth";
import { membershipOf } from "@/lib/club";
import { messagesSince, setChatSeen } from "@/lib/queries";

/* New messages in an open chat, asked for every few seconds while it's on screen. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in again." }, { status: 401 });
  const m = await membershipOf(session.user.id);
  if (!m) return Response.json({ error: "Not in the club." }, { status: 403 });
  const raw = new URL(req.url).searchParams.get("after");
  const after = raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw) : new Date(0);
  const r = await messagesSince(id, m.club.id, session.user.id, after);
  if (!r) return Response.json({ error: "That chat is gone." }, { status: 404 });
  // They're looking at it, so anything new is read.
  if (r.messages.some((x) => x.userId !== session.user.id)) await setChatSeen(id, session.user.id);
  return Response.json(
    { messages: r.messages.map((x) => ({ ...x, createdAt: x.createdAt.toISOString() })), theirSeen: r.theirSeen?.toISOString() ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
