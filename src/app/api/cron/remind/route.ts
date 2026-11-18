import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { clubMembers, clubs, pushSubscriptions, rsvps, walks } from "@/db/schema";
import { pushReady, sendToMany } from "@/lib/push";
import { reminderNote } from "@/lib/reminders";
import { dueReminder } from "@/lib/time";

/* Runs every hour (vercel.json). For each walk in the next 30 hours it sends
   at most two reminders: 7 pm the evening before, to every member, and about
   two hours before the start, to people who said they're coming.
   Only Vercel Cron can call it: it sends CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  if (!pushReady) return Response.json({ ok: false, reason: "push keys not set" });

  const now = new Date();
  const soon = await db
    .select({ walk: walks, tz: clubs.timezone })
    .from(walks)
    .innerJoin(clubs, eq(clubs.id, walks.clubId))
    .where(and(eq(walks.cancelled, false), gte(walks.startsAt, now), lte(walks.startsAt, new Date(now.getTime() + 30 * 3600_000))));

  const report: { walk: string; kind: string; sent: number }[] = [];
  for (const { walk, tz } of soon) {
    const kind = dueReminder(walk, now, tz);
    if (!kind) continue;
    // Claim it first, so two runs at once can't both send.
    const col = kind === "eve" ? walks.eveSentAt : walks.soonSentAt;
    const claimed = await db.update(walks).set(kind === "eve" ? { eveSentAt: now } : { soonSentAt: now, eveSentAt: walk.eveSentAt ?? now }).where(and(eq(walks.id, walk.id), isNull(col))).returning({ id: walks.id });
    if (!claimed.length) continue;

    const who =
      kind === "eve"
        ? sql`(select ${clubMembers.userId} from ${clubMembers} where ${clubMembers.clubId} = ${walk.clubId})`
        : sql`(select ${rsvps.userId} from ${rsvps} where ${rsvps.walkId} = ${walk.id})`;
    try {
      const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, who));
      const sent = await sendToMany(subs, reminderNote(kind, walk));
      report.push({ walk: walk.title, kind, sent });
    } catch (e) {
      // Nothing went out: give the claim back so the next hourly run tries again.
      await db.update(walks).set(kind === "eve" ? { eveSentAt: null } : { soonSentAt: null }).where(eq(walks.id, walk.id));
      console.error("Reminder failed", walk.id, kind, e);
      report.push({ walk: walk.title, kind, sent: -1 });
    }
  }
  return Response.json({ ok: true, report });
}
