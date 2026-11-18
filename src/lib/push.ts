import "server-only";
import { inArray } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

const ready = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (ready)
  webpush.setVapidDetails(
    // Push services ask for a contact; the app's own address keeps personal email out of it.
    // It must be https (or mailto), so local http addresses fall back to the live site.
    process.env.BETTER_AUTH_URL?.startsWith("https://") ? process.env.BETTER_AUTH_URL : "https://nakuru-walk.vercel.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

export const pushReady = ready;
/** tag: notes with the same tag replace each other on the phone (one per kind,
    or one per check-in). renotify: buzz again when replacing. */
export type Note = { title: string; body: string; url: string; tag?: string; renotify?: boolean };
type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Send one note to some phones. Phones that have gone away are forgotten. */
export async function sendTo(subs: Sub[], note: Note) {
  // Local testing only: PUSH_LOG=1 prints what would be sent.
  if (process.env.PUSH_LOG) console.log(`[push] to ${subs.length} phone(s):`, JSON.stringify(note));
  if (!ready) return { sent: 0, gone: 0 };
  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(note), {
          TTL: 6 * 3600, // a reminder older than 6 hours isn't worth showing
          // "high" wakes a sleeping Android phone right away; "normal" can be
          // held back for a long time while the phone is idle.
          urgency: "high",
        });
        sent++;
      } catch (e) {
        const err = e as { statusCode?: number; body?: string; message?: string };
        const code = err.statusCode;
        // 404/410: the phone dropped this address (app removed, notifications turned off). Forget it.
        if (code === 404 || code === 410) gone.push(s.id);
        // Anything else is worth seeing in the logs: a wrong key (403), too big (413), the push service busy (429/5xx), or no network.
        else console.error(`[push] failed ${code ?? "no status"} at ${new URL(s.endpoint).host}: ${(err.body || err.message || "").slice(0, 200)}`);
      }
    }),
  );
  if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
  return { sent, gone: gone.length };
}

/** Send the same note to many people, a batch at a time, so 3,000 members don't open 3,000 connections at once. */
export async function sendToMany(subs: Sub[], note: Note) {
  let sent = 0;
  for (let i = 0; i < subs.length; i += 100) sent += (await sendTo(subs.slice(i, i + 100), note)).sent;
  return sent;
}
