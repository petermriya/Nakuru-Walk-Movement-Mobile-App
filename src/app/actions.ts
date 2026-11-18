"use server";

/* Every change anyone makes goes through here, and each one checks who is
   allowed: members change only their own things, admins run their club. */

import { and, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { attendance, blocks, campaigns, chats, clubBans, clubMembers, clubs, listings, messages, photos, postLikes, posts, pushSubscriptions, replies, replyLikes, rsvps, user, walks } from "@/db/schema";
import { auth, requireUser } from "@/lib/auth";
import { membershipOf, requireAdmin, requireMember } from "@/lib/club";
import { LISTING_DAYS, MAX_LIVE_LISTINGS, MAX_PHOTOS, PHOTO_MAX_BYTES, REPLY_MAX, BIO_MAX, commentReplyNote, marketOpen, parseListing, parsePost, photoType, postNote, replyNote } from "@/lib/market";
import { MESSAGES_PER_DAY, messageNote, pair, parseMessage, parseReason, sideOf } from "@/lib/chat";
import { pushReady, sendToMany } from "@/lib/push";
import { blockedBetween } from "@/lib/queries";
import { checkinOpen } from "@/lib/time";
import { parseCampaign, parsePhone, parseWalk } from "@/lib/walk-form";

type Result = { error?: string; ok?: boolean } | undefined;

const code = () => randomBytes(6).toString("base64url");
const isId = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

async function walkOf(walkId: unknown, clubId: string) {
  if (!isId(walkId)) return null;
  const [w] = await db.select().from(walks).where(and(eq(walks.id, walkId), eq(walks.clubId, clubId)));
  return w ?? null;
}

const refreshWalk = (id: string) => {
  revalidatePath(`/w/${id}`, "layout");
  revalidatePath("/home");
  revalidatePath("/me");
};

/* ───────────── Members ───────────── */

/** "I'm coming" (or not any more). */
export async function setComing(walkId: string, coming: boolean): Promise<Result> {
  const { me, club } = await requireMember();
  const w = await walkOf(walkId, club.id);
  if (!w || w.cancelled) return { error: "That walk isn’t on." };
  if (coming) await db.insert(rsvps).values({ walkId: w.id, userId: me.id }).onConflictDoNothing();
  else await db.delete(rsvps).where(and(eq(rsvps.walkId, w.id), eq(rsvps.userId, me.id)));
  refreshWalk(w.id);
  return { ok: true };
}

/** Scanned the QR code at the walk. */
export async function checkIn(walkId: string, checkinCode: string): Promise<Result> {
  const { me, club } = await requireMember();
  const w = await walkOf(walkId, club.id);
  if (!w || w.cancelled) return { error: "That walk isn’t on." };
  if (w.checkinCode !== checkinCode) return { error: "That code is out of date. Ask an admin to show the code again." };
  if (!checkinOpen(w.startsAt, new Date())) return { error: "Checking in opens 3 hours before the walk and closes the day after." };
  await db.insert(attendance).values({ walkId: w.id, userId: me.id, km: w.distanceKm, method: "qr" }).onConflictDoNothing();
  await db.insert(rsvps).values({ walkId: w.id, userId: me.id }).onConflictDoNothing();
  refreshWalk(w.id);
  return { ok: true };
}

/** The person at the back: everyone is in. */
export async function confirmFinish(walkId: string, count: string, note: string): Promise<Result> {
  const { me, club, admin } = await requireMember();
  const w = await walkOf(walkId, club.id);
  if (!w) return { error: "That walk isn’t on." };
  if (!admin && w.sweepUserId !== me.id) return { error: "Only the person at the back or an admin can confirm this." };
  const n = Math.round(Number(count));
  if (!Number.isFinite(n) || n < 0 || n > 10000) return { error: "Enter how many people finished." };
  await db.update(walks).set({ finishedAt: new Date(), finishedCount: n, finishedNote: note.trim().slice(0, 280) || null, finishedBy: me.id }).where(eq(walks.id, w.id));
  refreshWalk(w.id);
  return { ok: true };
}

/** Name, phone, a short bio and a profile photo. The photo is optional: a new one replaces the old, "remove" takes it off. */
export async function saveProfile(_: unknown, form: FormData): Promise<Result> {
  const { me } = await requireMember();
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  if (!name) return { error: "Add your name, so the admins know who’s coming." };
  const phone = parsePhone(form.get("phone"));
  if (phone === false) return { error: "That doesn’t look like a phone number. Try 0712 345 678." };
  const bio = String(form.get("bio") ?? "").replace(/\r\n/g, "\n").trim().slice(0, BIO_MAX) || null;
  const pics = await readPhotos(form);
  if ("error" in pics) return pics;
  const removePhoto = form.get("removePhoto") === "1";

  await db.transaction(async (tx) => {
    let image: string | null | undefined;
    if (pics.length || removePhoto) {
      await tx.delete(photos).where(eq(photos.userId, me.id));
      image = null;
      if (pics.length) {
        const [ph] = await tx.insert(photos).values({ userId: me.id, ...pics[0] }).returning({ id: photos.id });
        image = `/api/photo/${ph.id}`;
      }
    }
    await tx.update(user).set({ name, phone, bio, ...(image !== undefined ? { image } : {}), updatedAt: new Date() }).where(eq(user.id, me.id));
  });
  // The signed-in copy of their name and photo is kept for a few minutes; read it afresh so every screen shows the new one now.
  try {
    await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
  } catch {}
  // Names and photos show all over the app.
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ───────────── Notifications ───────────── */

/** The name as it is now. The signed-in copy can be a few minutes old after someone edits their profile. */
async function nameNow(userId: string, fallback: string) {
  const [u] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId));
  return u?.name ?? fallback;
}

type Note = Parameters<typeof sendToMany>[1];

/** Every phone in the club with notifications on, except the person who did it. Never throws: a failed send mustn't undo a post. */
async function notifyClub(clubId: string, exceptUserId: string, note: Note) {
  try {
    const who = sql`(select ${clubMembers.userId} from ${clubMembers} where ${clubMembers.clubId} = ${clubId} and ${clubMembers.userId} <> ${exceptUserId})`;
    const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, who));
    await sendToMany(subs, note);
  } catch (e) {
    console.error("Community notification failed", note.url, e);
  }
}

/** These people's phones, as long as they're still in the club. */
async function notifyPeople(clubId: string, userIds: string[], note: Note) {
  try {
    const stillIn = sql`(select ${clubMembers.userId} from ${clubMembers} where ${clubMembers.clubId} = ${clubId})`;
    const subs = await db.select().from(pushSubscriptions).where(and(inArray(pushSubscriptions.userId, userIds), inArray(pushSubscriptions.userId, stillIn)));
    await sendToMany(subs, note);
  } catch (e) {
    console.error("Notification failed", note.url, e);
  }
}

/* ───────────── Photos ───────────── */

type Photo = { mime: string; bytes: Buffer };

/** The photos sent with a form: at most 3, each a real image and small enough.
    Phones shrink them before sending, so anything large here isn't from the app. */
async function readPhotos(form: FormData): Promise<Photo[] | { error: string }> {
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return { error: `Up to ${MAX_PHOTOS} photos.` };
  const out: Photo[] = [];
  for (const f of files) {
    if (f.size > PHOTO_MAX_BYTES) return { error: "That photo is too large. Try another one." };
    const bytes = Buffer.from(await f.arrayBuffer());
    const mime = photoType(bytes);
    if (!mime) return { error: "Photos need to be JPEG, PNG or WebP." };
    out.push({ mime, bytes });
  }
  return out;
}

/* ───────────── The club feed ───────────── */

const refreshFeed = (postId?: string) => {
  revalidatePath("/community");
  if (postId) revalidatePath(`/community/${postId}`);
};

async function postOf(postId: unknown, clubId: string) {
  if (!isId(postId)) return null;
  const [p] = await db.select({ id: posts.id, userId: posts.userId }).from(posts).where(and(eq(posts.id, postId), eq(posts.clubId, clubId)));
  return p ?? null;
}

export async function createPost(_: unknown, form: FormData): Promise<Result> {
  const { me, club } = await requireMember();
  const pics = await readPhotos(form);
  if ("error" in pics) return pics;
  const parsed = parsePost(form.get("body"), pics.length);
  if ("error" in parsed) return { error: parsed.error };
  // A gentle cap, so one person (or a stuck phone) can't flood the feed.
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(posts).where(and(eq(posts.userId, me.id), gt(posts.createdAt, new Date(Date.now() - 86400_000))));
  if (n >= 20) return { error: "That’s a lot of posts for one day. Try again tomorrow." };
  const postId = await db.transaction(async (tx) => {
    const [p] = await tx.insert(posts).values({ clubId: club.id, userId: me.id, body: parsed.value }).returning({ id: posts.id });
    if (pics.length) await tx.insert(photos).values(pics.map((ph, i) => ({ postId: p.id, position: i, ...ph })));
    return p.id;
  });
  refreshFeed();
  // Tell everyone else in the club, after the poster already has their answer.
  const note = postNote({ id: postId, authorName: await nameNow(me.id, me.name), body: parsed.value, photoCount: pics.length });
  after(() => notifyClub(club.id, me.id, note));
  return { ok: true };
}

/** Your own post, or any post if you're an admin. */
export async function deletePost(postId: string): Promise<Result> {
  const { me, club, admin } = await requireMember();
  const p = await postOf(postId, club.id);
  if (!p) return { error: "That post is gone." };
  if (p.userId !== me.id && !admin) return { error: "Only the person who posted it or an admin can remove it." };
  await db.delete(posts).where(eq(posts.id, p.id));
  refreshFeed(p.id);
  return { ok: true };
}

export async function setLiked(postId: string, liked: boolean): Promise<Result> {
  const { me, club } = await requireMember();
  const p = await postOf(postId, club.id);
  if (!p) return { error: "That post is gone." };
  if (liked) await db.insert(postLikes).values({ postId: p.id, userId: me.id }).onConflictDoNothing();
  else await db.delete(postLikes).where(and(eq(postLikes.postId, p.id), eq(postLikes.userId, me.id)));
  refreshFeed(p.id);
  return { ok: true };
}

/** A comment on a post, or an answer to someone's comment (parentId). Answers hang under the top comment, so threads stay one level deep. */
export async function addReply(_: unknown, form: FormData): Promise<Result> {
  const { me, club } = await requireMember();
  const p = await postOf(form.get("postId"), club.id);
  if (!p) return { error: "That post is gone." };
  const body = String(form.get("body") ?? "").replace(/\r\n/g, "\n").trim().slice(0, REPLY_MAX);
  if (!body) return { error: "Write a reply first." };

  let parent: { id: string; userId: string } | null = null;
  const parentId = form.get("parentId");
  if (isId(parentId)) {
    const [r] = await db.select({ id: replies.id, userId: replies.userId, parentId: replies.parentId }).from(replies).where(and(eq(replies.id, parentId), eq(replies.postId, p.id)));
    if (!r) return { error: "That comment is gone." };
    parent = { id: r.parentId ?? r.id, userId: r.userId };
  }
  await db.insert(replies).values({ postId: p.id, userId: me.id, body, parentId: parent?.id ?? null });
  refreshFeed(p.id);

  // Whoever wrote the comment hears about the answer; the person who posted hears about any reply.
  // Nobody hears about their own words, and nobody hears twice.
  const commenter = parent && parent.userId !== me.id ? parent.userId : null;
  const myName = commenter || p.userId !== me.id ? await nameNow(me.id, me.name) : me.name;
  const poster = p.userId !== me.id && p.userId !== commenter ? p.userId : null;
  if (commenter) {
    const note = commentReplyNote({ postId: p.id, authorName: myName, body });
    after(() => notifyPeople(club.id, [commenter], note));
  }
  if (poster) {
    const note = replyNote({ postId: p.id, authorName: myName, body });
    after(() => notifyPeople(club.id, [poster], note));
  }
  return { ok: true };
}

/** Like someone's comment, or take the like back. */
export async function setReplyLiked(replyId: string, liked: boolean): Promise<Result> {
  const { me, club } = await requireMember();
  if (!isId(replyId)) return { error: "That comment is gone." };
  const [r] = await db.select({ id: replies.id, postId: replies.postId }).from(replies).innerJoin(posts, eq(posts.id, replies.postId)).where(and(eq(replies.id, replyId), eq(posts.clubId, club.id)));
  if (!r) return { error: "That comment is gone." };
  if (liked) await db.insert(replyLikes).values({ replyId: r.id, userId: me.id }).onConflictDoNothing();
  else await db.delete(replyLikes).where(and(eq(replyLikes.replyId, r.id), eq(replyLikes.userId, me.id)));
  revalidatePath(`/community/${r.postId}`);
  return { ok: true };
}

export async function deleteReply(replyId: string): Promise<Result> {
  const { me, club, admin } = await requireMember();
  if (!isId(replyId)) return { error: "That reply is gone." };
  const [r] = await db
    .select({ id: replies.id, userId: replies.userId, postId: replies.postId })
    .from(replies)
    .innerJoin(posts, eq(posts.id, replies.postId))
    .where(and(eq(replies.id, replyId), eq(posts.clubId, club.id)));
  if (!r) return { error: "That reply is gone." };
  if (r.userId !== me.id && !admin) return { error: "Only the person who wrote it or an admin can remove it." };
  await db.delete(replies).where(eq(replies.id, r.id));
  refreshFeed(r.postId);
  return { ok: true };
}

/* ───────────── The Wednesday market ───────────── */

/** On your Mac only, MARKET_ALWAYS_OPEN=1 lets you try posting on any day. It does nothing live. */
const marketOpenNow = () =>
  marketOpen(new Date()) || (process.env.MARKET_ALWAYS_OPEN === "1" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.BETTER_AUTH_URL ?? ""));

const refreshMarket = (id?: string) => {
  revalidatePath("/market");
  if (id) revalidatePath(`/market/${id}`);
};

async function listingOf(id: unknown, clubId: string) {
  if (!isId(id)) return null;
  const [l] = await db.select({ id: listings.id, userId: listings.userId }).from(listings).where(and(eq(listings.id, id), eq(listings.clubId, clubId)));
  return l ?? null;
}

const liveCount = async (userId: string, except?: string) => {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(eq(listings.userId, userId), eq(listings.sold, false), gt(listings.postedAt, new Date(Date.now() - LISTING_DAYS * 86400_000)), except ? ne(listings.id, except) : undefined));
  return n;
};

export async function createListing(_: unknown, form: FormData): Promise<Result> {
  const { me, club } = await requireMember();
  if (!marketOpenNow()) return { error: "The market opens for new items on Wednesdays." };
  const parsed = parseListing((k) => form.get(k), parsePhone);
  if ("error" in parsed) return { error: parsed.error };
  const pics = await readPhotos(form);
  if ("error" in pics) return pics;
  if ((await liveCount(me.id)) >= MAX_LIVE_LISTINGS) return { error: `You can have ${MAX_LIVE_LISTINGS} items up at a time. Mark one as sold or take one down first.` };
  const id = await db.transaction(async (tx) => {
    const [l] = await tx.insert(listings).values({ ...parsed.value, clubId: club.id, userId: me.id }).returning({ id: listings.id });
    if (pics.length) await tx.insert(photos).values(pics.map((ph, i) => ({ listingId: l.id, position: i, ...ph })));
    return l.id;
  });
  refreshMarket();
  redirect(`/market/${id}?posted=1`);
}

/** The seller changes their item: any day, since it doesn't put up anything new. New photos replace the old ones. */
export async function updateListing(_: unknown, form: FormData): Promise<Result> {
  const { me, club } = await requireMember();
  const l = await listingOf(form.get("id"), club.id);
  if (!l || l.userId !== me.id) return { error: "Only the seller can change this." };
  const parsed = parseListing((k) => form.get(k), parsePhone);
  if ("error" in parsed) return { error: parsed.error };
  const pics = await readPhotos(form);
  if ("error" in pics) return pics;
  await db.transaction(async (tx) => {
    await tx.update(listings).set(parsed.value).where(eq(listings.id, l.id));
    if (pics.length) {
      await tx.delete(photos).where(eq(photos.listingId, l.id));
      await tx.insert(photos).values(pics.map((ph, i) => ({ listingId: l.id, position: i, ...ph })));
    }
  });
  refreshMarket(l.id);
  redirect(`/market/${l.id}?saved=1`);
}

/** The seller only: sold, or back on sale. */
export async function setSold(listingId: string, sold: boolean): Promise<Result> {
  const { me, club } = await requireMember();
  const l = await listingOf(listingId, club.id);
  if (!l || l.userId !== me.id) return { error: "Only the seller can change this." };
  await db.update(listings).set({ sold }).where(eq(listings.id, l.id));
  refreshMarket(l.id);
  return { ok: true };
}

/** Put it up for another week. Like posting, this is for market day. */
export async function renewListing(listingId: string): Promise<Result> {
  const { me, club } = await requireMember();
  const l = await listingOf(listingId, club.id);
  if (!l || l.userId !== me.id) return { error: "Only the seller can put this up again." };
  if (!marketOpenNow()) return { error: "You can put items up again on Wednesdays." };
  if ((await liveCount(me.id, l.id)) >= MAX_LIVE_LISTINGS) return { error: `You can have ${MAX_LIVE_LISTINGS} items up at a time.` };
  await db.update(listings).set({ postedAt: new Date(), sold: false }).where(eq(listings.id, l.id));
  refreshMarket(l.id);
  return { ok: true };
}

/** The seller, or an admin keeping the market tidy. */
export async function deleteListing(listingId: string): Promise<Result> {
  const { me, club, admin } = await requireMember();
  const l = await listingOf(listingId, club.id);
  if (!l) return { error: "That item is gone." };
  if (l.userId !== me.id && !admin) return { error: "Only the seller or an admin can take this down." };
  await db.delete(listings).where(eq(listings.id, l.id));
  refreshMarket(l.id);
  redirect("/market");
}

/* ───────────── Admins: walks ───────────── */

export async function saveWalk(_: unknown, form: FormData): Promise<Result> {
  const { me, club } = await requireAdmin();
  const parsed = parseWalk((k) => form.get(k));
  if ("error" in parsed) return { error: parsed.error };
  const v = parsed.value;
  if (v.campaignId) {
    const [c] = await db.select({ id: campaigns.id }).from(campaigns).where(and(eq(campaigns.id, v.campaignId), eq(campaigns.clubId, club.id)));
    if (!c) v.campaignId = null;
  }
  const id = form.get("id");
  let walkId: string;
  if (isId(id)) {
    const w = await walkOf(id, club.id);
    if (!w) return { error: "That walk is gone." };
    // A new start time means the reminders should go out again for it.
    const moved = w.startsAt.getTime() !== v.startsAt.getTime();
    await db.update(walks).set({ ...v, ...(moved ? { eveSentAt: null, soonSentAt: null } : {}) }).where(eq(walks.id, w.id));
    walkId = w.id;
  } else {
    const [w] = await db.insert(walks).values({ ...v, clubId: club.id, checkinCode: code(), createdBy: me.id }).returning({ id: walks.id });
    walkId = w.id;
  }
  refreshWalk(walkId);
  redirect(`/w/${walkId}`);
}

export async function setCancelled(walkId: string, cancelled: boolean): Promise<Result> {
  const { club } = await requireAdmin();
  const w = await walkOf(walkId, club.id);
  if (!w) return { error: "That walk is gone." };
  await db.update(walks).set({ cancelled }).where(eq(walks.id, w.id));
  refreshWalk(w.id);
  return { ok: true };
}

/** Roll call: tick someone off, or untick them. */
export async function markPresent(walkId: string, userId: string, present: boolean): Promise<Result> {
  const { club } = await requireAdmin();
  const w = await walkOf(walkId, club.id);
  if (!w) return { error: "That walk is gone." };
  const [m] = await db.select({ u: clubMembers.userId }).from(clubMembers).where(and(eq(clubMembers.clubId, club.id), eq(clubMembers.userId, userId)));
  if (!m) return { error: "They aren’t in the club." };
  if (present) await db.insert(attendance).values({ walkId: w.id, userId, km: w.distanceKm, method: "admin" }).onConflictDoNothing();
  else await db.delete(attendance).where(and(eq(attendance.walkId, w.id), eq(attendance.userId, userId)));
  refreshWalk(w.id);
  return { ok: true };
}

export async function setSweep(walkId: string, userId: string): Promise<Result> {
  const { club } = await requireAdmin();
  const w = await walkOf(walkId, club.id);
  if (!w) return { error: "That walk is gone." };
  if (userId) {
    const [m] = await db.select({ u: clubMembers.userId }).from(clubMembers).where(and(eq(clubMembers.clubId, club.id), eq(clubMembers.userId, userId)));
    if (!m) return { error: "They aren’t in the club." };
  }
  await db.update(walks).set({ sweepUserId: userId || null }).where(eq(walks.id, w.id));
  refreshWalk(w.id);
  return { ok: true };
}

/** A fresh QR code, if a photo of the old one got shared around. */
export async function newCheckinCode(walkId: string): Promise<Result> {
  const { club } = await requireAdmin();
  const w = await walkOf(walkId, club.id);
  if (!w) return { error: "That walk is gone." };
  await db.update(walks).set({ checkinCode: code() }).where(eq(walks.id, w.id));
  revalidatePath(`/w/${w.id}/qr`);
  return { ok: true };
}

/* ───────────── Admins: campaigns ───────────── */

export async function saveCampaign(_: unknown, form: FormData): Promise<Result> {
  const { club } = await requireAdmin();
  const parsed = parseCampaign((k) => form.get(k));
  if ("error" in parsed) return { error: parsed.error };
  const id = form.get("id");
  if (isId(id)) await db.update(campaigns).set(parsed.value).where(and(eq(campaigns.id, id), eq(campaigns.clubId, club.id)));
  else await db.insert(campaigns).values({ ...parsed.value, clubId: club.id });
  revalidatePath("/club/campaigns");
  redirect("/club/campaigns");
}

export async function deleteCampaign(id: string): Promise<Result> {
  const { club } = await requireAdmin();
  if (!isId(id)) return { error: "That campaign is gone." };
  await db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.clubId, club.id)));
  revalidatePath("/club/campaigns");
  redirect("/club/campaigns");
}

/* ───────────── Admins: the club ───────────── */

export async function setAdmin(userId: string, makeAdmin: boolean): Promise<Result> {
  const { me, club } = await requireAdmin();
  if (!makeAdmin) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(clubMembers).where(and(eq(clubMembers.clubId, club.id), eq(clubMembers.role, "admin"), ne(clubMembers.userId, userId)));
    if (n === 0) return { error: "The club needs at least one admin." };
  }
  await db.update(clubMembers).set({ role: makeAdmin ? "admin" : "member" }).where(and(eq(clubMembers.clubId, club.id), eq(clubMembers.userId, userId)));
  revalidatePath("/club", "layout");
  if (userId === me.id && !makeAdmin) redirect("/home");
  return { ok: true };
}

/** Takes someone out of the club, for example for breaking the club's rules. The join link
    won't let them back in until an admin lets them back. Their chats disappear for everyone.
    With "wipe", their posts, comments and market items in this club go too. */
export async function removeMember(userId: string, reason: string, wipe: boolean): Promise<Result> {
  const { me, club } = await requireAdmin();
  if (typeof userId !== "string" || !userId) return { error: "That person isn’t in the club." };
  if (userId === me.id) return { error: "You can’t remove yourself. Use Delete account instead." };
  const [m] = await db.select({ role: clubMembers.role }).from(clubMembers).where(and(eq(clubMembers.clubId, club.id), eq(clubMembers.userId, userId)));
  if (!m) return { error: "That person isn’t in the club any more." };
  if (m.role === "admin") return { error: "They’re an admin. Tap Admin to make them a member first, then remove them." };
  const why = parseReason(reason);
  await db.transaction(async (tx) => {
    await tx.delete(clubMembers).where(and(eq(clubMembers.clubId, club.id), eq(clubMembers.userId, userId)));
    await tx
      .insert(clubBans)
      .values({ clubId: club.id, userId, reason: why, bannedBy: me.id })
      .onConflictDoUpdate({ target: [clubBans.clubId, clubBans.userId], set: { reason: why, bannedBy: me.id, createdAt: new Date() } });
    await tx.delete(rsvps).where(and(eq(rsvps.userId, userId), inArray(rsvps.walkId, db.select({ id: walks.id }).from(walks).where(and(eq(walks.clubId, club.id), gt(walks.startsAt, new Date()))))));
    if (wipe) {
      const clubPosts = db.select({ id: posts.id }).from(posts).where(eq(posts.clubId, club.id));
      await tx.delete(replies).where(and(eq(replies.userId, userId), inArray(replies.postId, clubPosts)));
      await tx.delete(posts).where(and(eq(posts.clubId, club.id), eq(posts.userId, userId)));
      await tx.delete(listings).where(and(eq(listings.clubId, club.id), eq(listings.userId, userId)));
    }
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Undoes a removal: they're a member again, straight away. */
export async function letBackIn(userId: string): Promise<Result> {
  const { club } = await requireAdmin();
  if (typeof userId !== "string" || !userId) return { error: "That person isn’t on the list." };
  const [b] = await db.select({ userId: clubBans.userId }).from(clubBans).where(and(eq(clubBans.clubId, club.id), eq(clubBans.userId, userId)));
  if (!b) return { error: "That person isn’t on the list." };
  await db.transaction(async (tx) => {
    await tx.delete(clubBans).where(and(eq(clubBans.clubId, club.id), eq(clubBans.userId, userId)));
    await tx.insert(clubMembers).values({ clubId: club.id, userId }).onConflictDoNothing();
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ───────────── Chats ───────────── */

/** Opens the chat with another member, starting one if this is the first message. */
export async function startChat(personId: string): Promise<Result> {
  const { me, club } = await requireMember();
  if (typeof personId !== "string" || !personId || personId === me.id) return { error: "Pick someone else to message." };
  const [m] = await db.select({ userId: clubMembers.userId }).from(clubMembers).where(and(eq(clubMembers.clubId, club.id), eq(clubMembers.userId, personId)));
  if (!m) return { error: "That person isn’t in the club any more." };
  if (await blockedBetween(me.id, personId)) return { error: "You can’t message this person." };
  const p = pair(me.id, personId);
  await db.insert(chats).values({ clubId: club.id, ...p }).onConflictDoNothing();
  const [c] = await db.select({ id: chats.id }).from(chats).where(and(eq(chats.clubId, club.id), eq(chats.userA, p.userA), eq(chats.userB, p.userB)));
  redirect(`/chats/${c.id}`);
}

export type SentMessage = { id: string; userId: string; body: string; createdAt: string };

export async function sendMessage(chatId: string, body: string): Promise<{ error?: string; message?: SentMessage }> {
  const { me, club } = await requireMember();
  if (!isId(chatId)) return { error: "That chat is gone." };
  const [c] = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.clubId, club.id)));
  const side = c ? sideOf(c, me.id) : null;
  if (!c || !side) return { error: "That chat is gone." };
  const otherId = side === "a" ? c.userB : c.userA;
  const [m] = await db.select({ userId: clubMembers.userId }).from(clubMembers).where(and(eq(clubMembers.clubId, club.id), eq(clubMembers.userId, otherId)));
  if (!m) return { error: "That person isn’t in the club any more." };
  if (await blockedBetween(me.id, otherId)) return { error: "You can’t message this person." };
  const parsed = parseMessage(body);
  if ("error" in parsed) return { error: parsed.error };
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.userId, me.id), gt(messages.createdAt, new Date(Date.now() - 86400_000))));
  if (n >= MESSAGES_PER_DAY) return { error: "That’s a lot of messages for one day. Try again tomorrow." };

  const now = new Date();
  const [row] = await db.transaction(async (tx) => {
    const inserted = await tx.insert(messages).values({ chatId: c.id, userId: me.id, body: parsed.value, createdAt: now }).returning();
    await tx.update(chats).set({ lastMessageAt: now, ...(side === "a" ? { aSeenAt: now } : { bSeenAt: now }) }).where(eq(chats.id, c.id));
    return inserted;
  });
  const note = messageNote({ chatId: c.id, authorName: await nameNow(me.id, me.name), body: parsed.value });
  after(() => notifyPeople(club.id, [otherId], note));
  revalidatePath("/chats");
  return { message: { id: row.id, userId: row.userId, body: row.body, createdAt: row.createdAt.toISOString() } };
}

/** Block or unblock someone. While blocked, neither of you can message the other. */
export async function setBlocked(personId: string, blocked: boolean): Promise<Result> {
  const { me } = await requireMember();
  if (typeof personId !== "string" || !personId || personId === me.id) return { error: "Pick someone else." };
  if (blocked) await db.insert(blocks).values({ blockerId: me.id, blockedId: personId }).onConflictDoNothing();
  else await db.delete(blocks).where(and(eq(blocks.blockerId, me.id), eq(blocks.blockedId, personId)));
  revalidatePath("/chats", "layout");
  return { ok: true };
}

/** A new join link. The old one stops working, so only do this if it leaked. */
export async function newJoinLink(): Promise<Result> {
  const { club } = await requireAdmin();
  await db.update(clubs).set({ joinCode: randomBytes(5).toString("base64url") }).where(eq(clubs.id, club.id));
  revalidatePath("/club");
  return { ok: true };
}

/* ───────────── Notifications ───────────── */

export async function saveReminder(sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }): Promise<Result> {
  const { me } = await requireMember();
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { error: "This phone didn’t give a notification address." };
  await db
    .insert(pushSubscriptions)
    .values({ userId: me.id, endpoint: sub.endpoint.slice(0, 1000), p256dh: sub.keys.p256dh.slice(0, 200), auth: sub.keys.auth.slice(0, 200) })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: me.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  return { ok: true };
}

/** "Send me a test": a notification to every phone of yours, so you can see it arrive. */
export async function sendTestNotification(): Promise<Result> {
  const { me } = await requireMember();
  if (!pushReady) return { error: "Notifications aren’t set up on the server yet." };
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, me.id));
  if (!subs.length) return { error: "This phone isn’t signed up for notifications yet. Turn them on first." };
  const sent = await sendToMany(subs, { title: "Nakuru Walk", body: "Notifications work on this phone. See you on the next walk!", url: "/me", tag: "test", renotify: true });
  if (!sent) return { error: "The notification couldn’t be sent. Turn notifications off and on again, then try once more." };
  return { ok: true };
}

export async function removeReminder(endpoint: string): Promise<Result> {
  const { me } = await requireMember();
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, String(endpoint)), eq(pushSubscriptions.userId, me.id)));
  return { ok: true };
}

/* ───────────── Account ───────────── */

/** Deletes the person and everything that is only theirs (RSVPs, check-ins,
    notifications, posts, replies, likes, profile photo and market items). Walks they created stay for the club, without their name. */
export async function deleteAccount(_: unknown, form: FormData): Promise<Result> {
  const me = await requireUser();
  const m = await membershipOf(me.id);
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== "delete") return { error: "Type DELETE to confirm." };
  if (m?.role === "admin") {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(clubMembers).where(and(eq(clubMembers.clubId, m.club.id), eq(clubMembers.role, "admin"), ne(clubMembers.userId, me.id)));
    if (n === 0) return { error: "You’re the club’s only admin. Make someone else an admin first, under Club." };
  }
  await db.delete(user).where(eq(user.id, me.id));
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {}
  redirect("/sign-in?deleted=1");
}
