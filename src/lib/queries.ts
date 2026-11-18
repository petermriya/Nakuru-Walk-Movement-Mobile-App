import "server-only";
import { and, asc, desc, eq, gt, gte, ilike, lt, or, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { attendance, blocks, campaigns, chats, clubBans, clubMembers, listings, messages, photos, postLikes, posts, replies, replyLikes, rsvps, user, walks } from "@/db/schema";
import { LISTING_DAYS } from "@/lib/market";

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/** A walk stays under "Coming up" until 12 hours after it starts, so it's still there on the day. */
const STILL_ON_MS = 12 * 3600_000;

const counts = (userId: string) => ({
  coming: sql<number>`(select count(*)::int from ${rsvps} r where r.walk_id = ${walks.id})`,
  mine: sql<boolean>`exists (select 1 from ${rsvps} r where r.walk_id = ${walks.id} and r.user_id = ${userId})`,
  there: sql<number>`(select count(*)::int from ${attendance} a where a.walk_id = ${walks.id})`,
  // Everyone who checks in is credited the walk's set distance (Peter, 12 Nov 2026).
  myKm: sql<number | null>`(select ${walks.distanceKm}::float from ${attendance} a where a.walk_id = ${walks.id} and a.user_id = ${userId})`,
});

export async function homeData(clubId: string, userId: string, now = new Date()) {
  const cut = new Date(now.getTime() - STILL_ON_MS);
  const cols = { walk: walks, campaign: campaigns.name, ...counts(userId) };
  const [upcoming, past] = await Promise.all([
    db.select(cols).from(walks).leftJoin(campaigns, eq(campaigns.id, walks.campaignId)).where(and(eq(walks.clubId, clubId), gte(walks.startsAt, cut))).orderBy(asc(walks.startsAt)).limit(12),
    db.select(cols).from(walks).leftJoin(campaigns, eq(campaigns.id, walks.campaignId)).where(and(eq(walks.clubId, clubId), lt(walks.startsAt, cut), eq(walks.cancelled, false))).orderBy(desc(walks.startsAt)).limit(6),
  ]);
  return { upcoming, past };
}

export async function walkData(walkId: string, clubId: string, userId: string) {
  if (!isId(walkId)) notFound();
  const [row] = await db
    .select({ walk: walks, campaign: campaigns, sweepName: user.name, ...counts(userId) })
    .from(walks)
    .leftJoin(campaigns, eq(campaigns.id, walks.campaignId))
    .leftJoin(user, eq(user.id, walks.sweepUserId))
    .where(and(eq(walks.id, walkId), eq(walks.clubId, clubId)));
  if (!row) notFound();
  return row;
}

/** For the roll call: everyone who said they're coming or is ticked off,
    plus anyone matching a search (most people never RSVP). */
export async function rollCall(walkId: string, clubId: string, q: string) {
  const there = sql<boolean>`exists (select 1 from ${attendance} a where a.walk_id = ${walkId} and a.user_id = ${user.id})`;
  const coming = sql<boolean>`exists (select 1 from ${rsvps} r where r.walk_id = ${walkId} and r.user_id = ${user.id})`;
  const base = db
    .select({ id: user.id, name: user.name, image: user.image, there, coming })
    .from(clubMembers)
    .innerJoin(user, eq(user.id, clubMembers.userId));
  const term = q.trim();
  return term
    ? base.where(and(eq(clubMembers.clubId, clubId), ilike(user.name, `%${term.replace(/[%_\\]/g, "\\$&")}%`))).orderBy(asc(user.name)).limit(40)
    : base.where(and(eq(clubMembers.clubId, clubId), sql`(${there} or ${coming})`)).orderBy(asc(user.name));
}

/** Everyone coming or checked in, for choosing the person at the back. */
export async function walkPeople(walkId: string) {
  const ids = sql`(select user_id from ${attendance} where walk_id = ${walkId} union select user_id from ${rsvps} where walk_id = ${walkId})`;
  return db.select({ id: user.id, name: user.name }).from(user).where(sql`${user.id} in ${ids}`).orderBy(asc(user.name));
}

export async function myWalks(userId: string, clubId: string) {
  return db
    .select({ id: walks.id, title: walks.title, places: walks.places, startsAt: walks.startsAt, distanceKm: walks.distanceKm, km: walks.distanceKm })
    .from(attendance)
    .innerJoin(walks, eq(walks.id, attendance.walkId))
    .where(and(eq(attendance.userId, userId), eq(walks.clubId, clubId)))
    .orderBy(asc(walks.startsAt));
}

export async function clubMembersList(clubId: string, q: string) {
  const term = q.trim().replace(/[%_\\]/g, "\\$&");
  const walksDone = sql<number>`(select count(*)::int from ${attendance} a join ${walks} w on w.id = a.walk_id where a.user_id = ${user.id} and w.club_id = ${clubId})`;
  const where = and(eq(clubMembers.clubId, clubId), term ? sql`(${user.name} ilike ${`%${term}%`} or ${user.phone} ilike ${`%${term}%`})` : undefined);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, image: user.image, phone: user.phone, role: clubMembers.role, walksDone })
      .from(clubMembers)
      .innerJoin(user, eq(user.id, clubMembers.userId))
      .where(where)
      .orderBy(desc(sql`${clubMembers.role} = 'admin'`), asc(user.name))
      .limit(60),
    db.select({ total: sql<number>`count(*)::int` }).from(clubMembers).where(eq(clubMembers.clubId, clubId)),
  ]);
  return { rows, total };
}

export async function campaignsList(clubId: string) {
  return db.select().from(campaigns).where(eq(campaigns.clubId, clubId)).orderBy(asc(campaigns.startsOn));
}

/* ───────────── The club feed ───────────── */

const postCols = (userId: string) => ({
  id: posts.id,
  body: posts.body,
  createdAt: posts.createdAt,
  authorId: user.id,
  authorName: user.name,
  authorImage: user.image,
  likes: sql<number>`(select count(*)::int from ${postLikes} l where l.post_id = ${posts.id})`,
  liked: sql<boolean>`exists (select 1 from ${postLikes} l where l.post_id = ${posts.id} and l.user_id = ${userId})`,
  replyCount: sql<number>`(select count(*)::int from ${replies} r where r.post_id = ${posts.id})`,
  photoIds: sql<string[]>`coalesce((select array_agg(ph.id order by ph.position) from ${photos} ph where ph.post_id = ${posts.id}), '{}')`,
});

export const FEED_PAGE = 20;

/** The newest posts, one trip. `before` (a post's time) pages back to older ones. */
export async function feedData(clubId: string, userId: string, before?: Date) {
  const rows = await db
    .select(postCols(userId))
    .from(posts)
    .innerJoin(user, eq(user.id, posts.userId))
    .where(and(eq(posts.clubId, clubId), before ? lt(posts.createdAt, before) : undefined))
    .orderBy(desc(posts.createdAt))
    .limit(FEED_PAGE + 1);
  return { posts: rows.slice(0, FEED_PAGE), more: rows.length > FEED_PAGE };
}

export async function postData(postId: string, clubId: string, userId: string) {
  if (!isId(postId)) notFound();
  const [[post], thread] = await Promise.all([
    db.select(postCols(userId)).from(posts).innerJoin(user, eq(user.id, posts.userId)).where(and(eq(posts.id, postId), eq(posts.clubId, clubId))),
    db
      .select({
        id: replies.id,
        parentId: replies.parentId,
        body: replies.body,
        createdAt: replies.createdAt,
        authorId: user.id,
        authorName: user.name,
        authorImage: user.image,
        likes: sql<number>`(select count(*)::int from ${replyLikes} k where k.reply_id = ${replies.id})`,
        liked: sql<boolean>`exists (select 1 from ${replyLikes} k where k.reply_id = ${replies.id} and k.user_id = ${userId})`,
      })
      .from(replies)
      .innerJoin(user, eq(user.id, replies.userId))
      .where(eq(replies.postId, postId))
      .orderBy(asc(replies.createdAt))
      .limit(300),
  ]);
  if (!post) notFound();
  return { post, thread };
}

/* ───────────── The Wednesday market ───────────── */

const listingCols = {
  id: listings.id,
  title: listings.title,
  priceKsh: listings.priceKsh,
  priceUnit: listings.priceUnit,
  negotiable: listings.negotiable,
  location: listings.location,
  description: listings.description,
  category: listings.category,
  phone: listings.phone,
  sold: listings.sold,
  postedAt: listings.postedAt,
  sellerId: user.id,
  sellerName: user.name,
  sellerImage: user.image,
  photoIds: sql<string[]>`coalesce((select array_agg(ph.id order by ph.position) from ${photos} ph where ph.listing_id = ${listings.id}), '{}')`,
};

/** Everything up this week, plus all of your own (so you can put old ones up again). One trip. */
export async function marketData(clubId: string, userId: string, now = new Date()) {
  const since = new Date(now.getTime() - LISTING_DAYS * 86400_000);
  const rows = await db
    .select(listingCols)
    .from(listings)
    .innerJoin(user, eq(user.id, listings.userId))
    .where(and(eq(listings.clubId, clubId), or(gt(listings.postedAt, since), eq(listings.userId, userId))))
    .orderBy(asc(listings.sold), desc(listings.postedAt))
    .limit(200);
  return { live: rows.filter((r) => r.postedAt > since), mine: rows.filter((r) => r.sellerId === userId) };
}

export async function listingData(listingId: string, clubId: string) {
  if (!isId(listingId)) notFound();
  const [row] = await db.select(listingCols).from(listings).innerJoin(user, eq(user.id, listings.userId)).where(and(eq(listings.id, listingId), eq(listings.clubId, clubId)));
  if (!row) notFound();
  return row;
}

/** A photo's bytes, only if it belongs to this club. */
export async function photoData(photoId: string, clubId: string) {
  if (!isId(photoId)) return null;
  const [row] = await db
    .select({ mime: photos.mime, bytes: photos.bytes })
    .from(photos)
    .leftJoin(posts, eq(posts.id, photos.postId))
    .leftJoin(listings, eq(listings.id, photos.listingId))
    .leftJoin(clubMembers, and(eq(clubMembers.userId, photos.userId), eq(clubMembers.clubId, clubId)))
    .where(and(eq(photos.id, photoId), or(eq(posts.clubId, clubId), eq(listings.clubId, clubId), sql`${clubMembers.userId} is not null`)));
  return row ?? null;
}

/* ───────────── Unread counts ───────────── */

/** What's new for this member since they last opened each place, in one trip:
    posts by others, live market items by others, and replies and likes on their own posts. */
export async function unreadCounts(userId: string, clubId: string) {
  const since = (col: string) => sql.raw(`coalesce(cm.${col}, cm.joined_at::timestamptz)`);
  const live = new Date(Date.now() - LISTING_DAYS * 86400_000);
  const { rows } = await db.execute<{ community: number; market: number; activity: number; chats: number }>(sql`
    select
      (select count(*)::int from ${messages} m join ${chats} c on c.id = m.chat_id
        join ${clubMembers} om on om.club_id = c.club_id and om.user_id = m.user_id
        where c.club_id = cm.club_id and (c.user_a = cm.user_id or c.user_b = cm.user_id) and m.user_id <> cm.user_id
          and m.created_at > coalesce(case when c.user_a = cm.user_id then c.a_seen_at else c.b_seen_at end, cm.joined_at::timestamptz)) as chats,
      (select count(*)::int from ${posts} p where p.club_id = cm.club_id and p.user_id <> cm.user_id and p.created_at > ${since("community_seen_at")}) as community,
      (select count(*)::int from ${listings} l where l.club_id = cm.club_id and l.user_id <> cm.user_id and not l.sold and l.posted_at > ${live} and l.posted_at > ${since("market_seen_at")}) as market,
      (select count(*)::int from ${replies} r join ${posts} p on p.id = r.post_id left join ${replies} pr on pr.id = r.parent_id
        where (p.user_id = cm.user_id or pr.user_id = cm.user_id) and r.user_id <> cm.user_id and r.created_at > ${since("activity_seen_at")})
      + (select count(*)::int from ${postLikes} k join ${posts} p on p.id = k.post_id where p.user_id = cm.user_id and k.user_id <> cm.user_id and k.created_at > ${since("activity_seen_at")})
      + (select count(*)::int from ${replyLikes} k join ${replies} r on r.id = k.reply_id where r.user_id = cm.user_id and k.user_id <> cm.user_id and k.created_at > ${since("activity_seen_at")}) as activity
    from ${clubMembers} cm
    where cm.club_id = ${clubId} and cm.user_id = ${userId}`);
  return rows[0] ?? { community: 0, market: 0, activity: 0, chats: 0 };
}

/** Opening Community, the Market or Activity clears its count. Pages call this with after(), once they've read the old time. */
export async function setSeen(userId: string, clubId: string, place: "community" | "market" | "activity") {
  const now = new Date();
  const col = place === "community" ? { communitySeenAt: now } : place === "market" ? { marketSeenAt: now } : { activitySeenAt: now };
  await db.update(clubMembers).set(col).where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)));
}

/** When this member last opened each place (before this visit), for the "New" markers. */
export async function seenTimes(userId: string, clubId: string) {
  const [row] = await db
    .select({ community: clubMembers.communitySeenAt, market: clubMembers.marketSeenAt, activity: clubMembers.activitySeenAt, joined: clubMembers.joinedAt })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)));
  const joined = row?.joined ?? new Date(0);
  return { community: row?.community ?? joined, market: row?.market ?? joined, activity: row?.activity ?? joined };
}

/** Replies and likes on this member's posts and comments, newest first. */
export async function activityData(userId: string, clubId: string) {
  const rows = await db.execute<{ kind: "reply" | "like" | "comment_like"; to_comment: boolean; at: Date; post_id: string; post_body: string; who_id: string; who_name: string; who_image: string | null; body: string | null; target_id: string }>(sql`
    select * from (
      select 'reply' as kind, (pr.user_id = ${userId} and p.user_id <> ${userId}) as to_comment, r.created_at as at, p.id as post_id, p.body as post_body,
             u.id as who_id, u.name as who_name, u.image as who_image, r.body as body, p.id::text as target_id
        from ${replies} r join ${posts} p on p.id = r.post_id join ${user} u on u.id = r.user_id left join ${replies} pr on pr.id = r.parent_id
        where p.club_id = ${clubId} and r.user_id <> ${userId} and (p.user_id = ${userId} or pr.user_id = ${userId})
      union all
      select 'like', false, k.created_at, p.id, p.body, u.id, u.name, u.image, null, p.id::text
        from ${postLikes} k join ${posts} p on p.id = k.post_id join ${user} u on u.id = k.user_id
        where p.user_id = ${userId} and p.club_id = ${clubId} and k.user_id <> ${userId}
      union all
      select 'comment_like', true, k.created_at, p.id, r.body, u.id, u.name, u.image, null, r.id::text
        from ${replyLikes} k join ${replies} r on r.id = k.reply_id join ${posts} p on p.id = r.post_id join ${user} u on u.id = k.user_id
        where r.user_id = ${userId} and p.club_id = ${clubId} and k.user_id <> ${userId}
    ) a order by at desc limit 80`);
  return rows.rows.map((r) => ({ ...r, at: new Date(r.at) }));
}

/* ───────────── Profiles ───────────── */

/** A member's profile as other members see it: no kilometres, walk counts or phone number (those stay private). */
export async function profileData(personId: string, clubId: string, viewerId: string) {
  const [person] = await db
    .select({ id: user.id, name: user.name, image: user.image, bio: user.bio, role: clubMembers.role, joinedAt: clubMembers.joinedAt })
    .from(clubMembers)
    .innerJoin(user, eq(user.id, clubMembers.userId))
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, personId)));
  if (!person) notFound();
  const since = new Date(Date.now() - LISTING_DAYS * 86400_000);
  const [theirPosts, items, [{ n }]] = await Promise.all([
    db.select(postCols(viewerId)).from(posts).innerJoin(user, eq(user.id, posts.userId)).where(and(eq(posts.clubId, clubId), eq(posts.userId, personId))).orderBy(desc(posts.createdAt)).limit(20),
    db.select(listingCols).from(listings).innerJoin(user, eq(user.id, listings.userId)).where(and(eq(listings.clubId, clubId), eq(listings.userId, personId), eq(listings.sold, false), gt(listings.postedAt, since))).orderBy(desc(listings.postedAt)),
    db.select({ n: sql<number>`count(*)::int` }).from(posts).where(and(eq(posts.clubId, clubId), eq(posts.userId, personId))),
  ]);
  return { person, posts: theirPosts, items, postCount: n };
}

/* ───────────── Chats ───────────── */

/** This member's conversations, newest first, with the last message and how many are unread.
    Chats with someone who is no longer in the club drop off the list. */
export async function chatList(userId: string, clubId: string) {
  const { rows } = await db.execute<{ id: string; other_id: string; other_name: string; other_image: string | null; last_body: string | null; last_mine: boolean; last_at: Date; unread: number }>(sql`
    select c.id, o.user_id as other_id, u.name as other_name, u.image as other_image, c.last_message_at as last_at,
      (select m.body from ${messages} m where m.chat_id = c.id order by m.created_at desc limit 1) as last_body,
      (select m.user_id = ${userId} from ${messages} m where m.chat_id = c.id order by m.created_at desc limit 1) as last_mine,
      (select count(*)::int from ${messages} m where m.chat_id = c.id and m.user_id <> ${userId}
        and m.created_at > coalesce(case when c.user_a = ${userId} then c.a_seen_at else c.b_seen_at end, 'epoch'::timestamptz)) as unread
    from ${chats} c
    join ${clubMembers} o on o.club_id = c.club_id and o.user_id = case when c.user_a = ${userId} then c.user_b else c.user_a end
    join ${user} u on u.id = o.user_id
    where c.club_id = ${clubId} and (c.user_a = ${userId} or c.user_b = ${userId}) and c.last_message_at is not null
    order by c.last_message_at desc
    limit 100`);
  return rows.map((r) => ({ ...r, last_at: new Date(r.last_at) }));
}

export const CHAT_PAGE = 150;

/** One conversation: who it's with, whether either has blocked the other, and the latest messages (oldest first). */
export async function chatData(chatId: string, clubId: string, userId: string) {
  if (!isId(chatId)) notFound();
  const [c] = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.clubId, clubId), or(eq(chats.userA, userId), eq(chats.userB, userId))));
  if (!c) notFound();
  const otherId = c.userA === userId ? c.userB : c.userA;
  const [[other], blockRows, recent] = await Promise.all([
    db.select({ id: user.id, name: user.name, image: user.image }).from(clubMembers).innerJoin(user, eq(user.id, clubMembers.userId)).where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, otherId))),
    db.select({ blockerId: blocks.blockerId }).from(blocks).where(or(and(eq(blocks.blockerId, userId), eq(blocks.blockedId, otherId)), and(eq(blocks.blockerId, otherId), eq(blocks.blockedId, userId)))),
    db.select({ id: messages.id, userId: messages.userId, body: messages.body, createdAt: messages.createdAt }).from(messages).where(eq(messages.chatId, c.id)).orderBy(desc(messages.createdAt)).limit(CHAT_PAGE),
  ]);
  if (!other) notFound();
  const theirSeen = c.userA === userId ? c.bSeenAt : c.aSeenAt;
  return {
    chat: c,
    other,
    iBlocked: blockRows.some((b) => b.blockerId === userId),
    blockedMe: blockRows.some((b) => b.blockerId === otherId),
    messages: recent.reverse(),
    theirSeen,
  };
}

/** New messages since a time, for the open chat to pick up without a reload. */
export async function messagesSince(chatId: string, clubId: string, userId: string, after: Date) {
  if (!isId(chatId)) return null;
  const [c] = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.clubId, clubId), or(eq(chats.userA, userId), eq(chats.userB, userId))));
  if (!c) return null;
  const rows = await db.select({ id: messages.id, userId: messages.userId, body: messages.body, createdAt: messages.createdAt }).from(messages).where(and(eq(messages.chatId, c.id), gt(messages.createdAt, after))).orderBy(asc(messages.createdAt)).limit(CHAT_PAGE);
  return { messages: rows, theirSeen: c.userA === userId ? c.bSeenAt : c.aSeenAt };
}

/** Opening a chat marks everything in it as read. */
export async function setChatSeen(chatId: string, userId: string) {
  const now = new Date();
  await db.update(chats).set({ aSeenAt: now }).where(and(eq(chats.id, chatId), eq(chats.userA, userId)));
  await db.update(chats).set({ bSeenAt: now }).where(and(eq(chats.id, chatId), eq(chats.userB, userId)));
}

/** Has either of these two blocked the other? */
export async function blockedBetween(x: string, y: string) {
  const [b] = await db.select({ blockerId: blocks.blockerId }).from(blocks).where(or(and(eq(blocks.blockerId, x), eq(blocks.blockedId, y)), and(eq(blocks.blockerId, y), eq(blocks.blockedId, x)))).limit(1);
  return Boolean(b);
}

/* ───────────── Removed members ───────────── */

/** People an admin removed, newest first, for the Club screen. */
export async function removedMembers(clubId: string) {
  const by = sql<string | null>`(select u.name from ${user} u where u.id = ${clubBans.bannedBy})`;
  return db
    .select({ id: user.id, name: user.name, image: user.image, reason: clubBans.reason, at: clubBans.createdAt, by })
    .from(clubBans)
    .innerJoin(user, eq(user.id, clubBans.userId))
    .where(eq(clubBans.clubId, clubId))
    .orderBy(desc(clubBans.createdAt))
    .limit(100);
}

/** Was this person removed from a club? For the screen they land on afterwards. */
export async function removalOf(userId: string) {
  const [b] = await db.select({ reason: clubBans.reason, at: clubBans.createdAt }).from(clubBans).where(eq(clubBans.userId, userId)).orderBy(desc(clubBans.createdAt)).limit(1);
  return b ?? null;
}

/* ───────────── Members directory ───────────── */

export const DIRECTORY_PAGE = 200;

/** Everyone in the club, for the Members list under Community. Names, photos and bios only:
    phone numbers and walk records stay private. Admins first, then by name. */
export async function memberDirectory(clubId: string, q: string) {
  const term = q.trim().replace(/[%_\\]/g, "\\$&");
  const where = and(eq(clubMembers.clubId, clubId), term ? ilike(user.name, `%${term}%`) : undefined);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, image: user.image, bio: user.bio, role: clubMembers.role })
      .from(clubMembers)
      .innerJoin(user, eq(user.id, clubMembers.userId))
      .where(where)
      .orderBy(desc(sql`${clubMembers.role} = 'admin'`), asc(user.name))
      .limit(DIRECTORY_PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(clubMembers).where(eq(clubMembers.clubId, clubId)),
  ]);
  return { rows, total };
}
