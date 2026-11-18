import { pgTable, text, timestamp, boolean, integer, numeric, date, uuid, primaryKey, index, uniqueIndex, customType, type AnyPgColumn } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

/* ───────────── Auth (Better Auth) ───────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** The member's own mobile number, optional. Only club admins see it. */
  phone: text("phone"),
  /** A line or two about themselves, shown on their profile to club members. */
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ───────────── Clubs ───────────── */

/** A walking club. Nakuru Walk Movement is the first; others can join later. */
export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** The one join link admins paste into every WhatsApp group: /join/<code>. */
  joinCode: text("join_code").notNull().unique(),
  timezone: text("timezone").notNull().default("Africa/Nairobi"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clubMembers = pgTable(
  "club_members",
  {
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    /** "admin" or "member". Room for more roles later (for example a paid member). */
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    /** When they last opened each place, for the unread counts. Empty means "since they joined". */
    communitySeenAt: timestamp("community_seen_at", { withTimezone: true }),
    marketSeenAt: timestamp("market_seen_at", { withTimezone: true }),
    activitySeenAt: timestamp("activity_seen_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.clubId, t.userId] }), index("club_members_user_idx").on(t.userId)],
);

/* ───────────── Campaigns ───────────── */

/** Awareness days and campaigns a walk can support, such as World Mental Health Day. */
export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("campaigns_club_idx").on(t.clubId, t.startsOn)],
);

/* ───────────── Walks ───────────── */

export const walks = pgTable(
  "walks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    /** The route name, for example "Menengai Crater loop". */
    title: text("title").notNull(),
    /** Places along the way, in order. */
    places: text("places").array().notNull().default([]),
    distanceKm: numeric("distance_km", { precision: 5, scale: 1, mode: "number" }).notNull(),
    meetingPoint: text("meeting_point").notNull(),
    /** A Google Maps link or pin for the meeting point. */
    mapUrl: text("map_url"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    dressCode: text("dress_code"),
    notes: text("notes"),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    cancelled: boolean("cancelled").notNull().default(false),
    /** In the QR code admins show on the day; only people at the walk see it. */
    checkinCode: text("checkin_code").notNull(),
    /** The person at the back, who confirms everyone finished. */
    sweepUserId: text("sweep_user_id").references(() => user.id, { onDelete: "set null" }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    finishedCount: integer("finished_count"),
    finishedNote: text("finished_note"),
    finishedBy: text("finished_by").references(() => user.id, { onDelete: "set null" }),
    /** When each reminder went out, so it goes only once. */
    eveSentAt: timestamp("eve_sent_at", { withTimezone: true }),
    soonSentAt: timestamp("soon_sent_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("walks_club_idx").on(t.clubId, t.startsAt)],
);

/** "I'm coming." */
export const rsvps = pgTable(
  "rsvps",
  {
    walkId: uuid("walk_id").notNull().references(() => walks.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.walkId, t.userId] }), index("rsvps_user_idx").on(t.userId)],
);

/** Who was there. Records credit the walk's set distance; km keeps the distance at check-in, for later use. */
export const attendance = pgTable(
  "attendance",
  {
    walkId: uuid("walk_id").notNull().references(() => walks.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    km: numeric("km", { precision: 5, scale: 1, mode: "number" }).notNull(),
    /** "qr" (they scanned) or "admin" (ticked off the list). */
    method: text("method").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.walkId, t.userId] }), index("attendance_user_idx").on(t.userId)],
);

/* ───────────── Notifications ───────────── */

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("push_user_idx").on(t.userId)],
);

/* ───────────── Community: the club feed ───────────── */

/** A message any member posts for the whole club, with up to 3 photos. */
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("posts_club_idx").on(t.clubId, t.createdAt)],
);

export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
);

export const replies = pgTable(
  "replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    /** Set when this answers another comment. Always the top comment of its thread, so threads stay one level deep. */
    parentId: uuid("parent_id").references((): AnyPgColumn => replies.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("replies_post_idx").on(t.postId, t.createdAt)],
);

/** Likes on comments (replies). */
export const replyLikes = pgTable(
  "reply_likes",
  {
    replyId: uuid("reply_id").notNull().references(() => replies.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.replyId, t.userId] })],
);

/* ───────────── The Wednesday market ───────────── */

/** Something a member is selling or offering. Free to post, on Wednesdays (club time).
    It shows for a week from postedAt; the seller can put it up again on a later Wednesday. */
export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** Whole Kenya shillings. Empty means "ask for the price". */
    priceKsh: integer("price_ksh"),
    /** What the price is for: "item" (a fixed price), or per "night", "day", "week", "month", "hour", "session", "person", "kg". */
    priceUnit: text("price_unit").notNull().default("item"),
    negotiable: boolean("negotiable").notNull().default(false),
    /** Where it is, in the seller's words: "Milimani, Nakuru". */
    location: text("location"),
    description: text("description"),
    category: text("category").notNull(),
    /** The number buyers reach the seller on. Club members see it on this listing. */
    phone: text("phone").notNull(),
    sold: boolean("sold").notNull().default(false),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("listings_club_idx").on(t.clubId, t.postedAt), index("listings_user_idx").on(t.userId)],
);

/** Photos on posts and listings, shrunk on the phone before they're sent, and kept
    here for now (Peter, 17 Nov 2026). They can move to file storage later. */
export const photos = pgTable(
  "photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    /** A member's own profile photo. */
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    mime: text("mime").notNull(),
    bytes: bytea("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("photos_post_idx").on(t.postId), index("photos_listing_idx").on(t.listingId), index("photos_user_idx").on(t.userId)],
);

/* ───────────── Chats: one-to-one messages between members ───────────── */

/** A private conversation between two members of a club. userA is always the
    smaller id, so each pair has exactly one chat. Admins can't read it. */
export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    userA: text("user_a").notNull().references(() => user.id, { onDelete: "cascade" }),
    userB: text("user_b").notNull().references(() => user.id, { onDelete: "cascade" }),
    /** When each side last opened the chat, for the unread counts. */
    aSeenAt: timestamp("a_seen_at", { withTimezone: true }),
    bSeenAt: timestamp("b_seen_at", { withTimezone: true }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("chats_pair_idx").on(t.clubId, t.userA, t.userB), index("chats_a_idx").on(t.userA), index("chats_b_idx").on(t.userB)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_chat_idx").on(t.chatId, t.createdAt), index("messages_user_idx").on(t.userId, t.createdAt)],
);

/** "Block": neither person can message the other. Only the blocker can undo it. */
export const blocks = pgTable(
  "blocks",
  {
    blockerId: text("blocker_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index("blocks_blocked_idx").on(t.blockedId)],
);

/* ───────────── Removed members ───────────── */

/** Someone an admin removed from the club, for example for breaking the club's rules.
    While this row exists the join link won't let them back in. "Let back in" deletes it. */
export const clubBans = pgTable(
  "club_bans",
  {
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    reason: text("reason"),
    bannedBy: text("banned_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clubId, t.userId] })],
);
