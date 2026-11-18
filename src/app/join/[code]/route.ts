import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clubBans, clubMembers, clubs } from "@/db/schema";
import { getSession } from "@/lib/auth";

/* The one link admins paste into every WhatsApp group. Opening it signs you
   in (if you aren't already) and puts you straight into the club. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const at = (path: string) => Response.redirect(new URL(path, req.url), 303);
  const [club] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.joinCode, code.slice(0, 40)));
  if (!club) return at("/welcome?link=old");
  const session = await getSession();
  if (!session) return at(`/sign-in?next=${encodeURIComponent(`/join/${code}`)}`);
  // Someone an admin removed stays out until an admin lets them back in.
  const [ban] = await db.select({ userId: clubBans.userId }).from(clubBans).where(and(eq(clubBans.clubId, club.id), eq(clubBans.userId, session.user.id)));
  if (ban) return at("/welcome");
  await db.insert(clubMembers).values({ clubId: club.id, userId: session.user.id }).onConflictDoNothing();
  return at("/home?joined=1");
}
