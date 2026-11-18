import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getSession } from "@/lib/auth";

/* The service worker calls this when the phone replaces its push address
   (pushsubscriptionchange). The new address takes over the old one's owner;
   if the old one is unknown, the signed-in person owns it. */
export async function POST(req: Request) {
  let body: { old?: string | null; sub?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const sub = body.sub;
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return new Response("Bad request", { status: 400 });

  const [prev] = body.old ? await db.select({ userId: pushSubscriptions.userId }).from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, String(body.old))) : [];
  const userId = prev?.userId ?? (await getSession())?.user.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await db.transaction(async (tx) => {
    if (body.old) await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, String(body.old)));
    await tx
      .insert(pushSubscriptions)
      .values({ userId, endpoint: sub.endpoint!.slice(0, 1000), p256dh: sub.keys!.p256dh!.slice(0, 200), auth: sub.keys!.auth!.slice(0, 200) })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh: sub.keys!.p256dh!, auth: sub.keys!.auth! } });
  });
  return Response.json({ ok: true });
}
