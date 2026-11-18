import { getSession } from "@/lib/auth";
import { membershipOf } from "@/lib/club";
import { unreadCounts } from "@/lib/queries";

/* The unread counts for the tab bar and the app icon. Asked for when a screen
   opens, when the app comes back to the front, and once a minute while it's open. */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ community: 0, market: 0, activity: 0, chats: 0 }, { status: 401 });
  const m = await membershipOf(session.user.id);
  if (!m) return Response.json({ community: 0, market: 0, activity: 0, chats: 0 });
  return Response.json(await unreadCounts(session.user.id, m.club.id), { headers: { "Cache-Control": "private, no-store" } });
}
