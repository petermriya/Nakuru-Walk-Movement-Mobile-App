/* Rules for the club feed and the Wednesday market. Plain functions, so they can be tested. */

import { addDays, formatDay, TZ, utcToZoned } from "@/lib/time";

/* ───────────── Market day ─────────────
   Peter's choice (17 Nov 2026): posting is open on Wednesdays only, in club
   time, like the WhatsApp Wednesday marketing board. Listings stay up for a week. */

export const MARKET_WEEKDAY = 3; // Wednesday
export const LISTING_DAYS = 7;
export const MAX_LIVE_LISTINGS = 5;
export const MAX_PHOTOS = 3;
export const DESCRIPTION_MAX = 1500;

export function marketOpen(now: Date, tz = TZ) {
  return utcToZoned(now, tz).weekday === MARKET_WEEKDAY;
}

/** The next market day on or after today, as "2026-11-18". */
export function nextMarketDay(now: Date, tz = TZ) {
  const { day, weekday } = utcToZoned(now, tz);
  return addDays(day, (MARKET_WEEKDAY - weekday + 7) % 7);
}

/** "Wed 18 Nov" */
export function nextMarketDayText(now: Date, tz = TZ) {
  return formatDay(new Date(`${nextMarketDay(now, tz)}T09:00:00Z`), tz);
}

export function listingLive(postedAt: Date, now: Date) {
  return now.getTime() - postedAt.getTime() < LISTING_DAYS * 86400_000;
}

/** Whole days a listing has left: 7 on the day it goes up, 1 on its last day, 0 once it's down. */
export function daysLeft(postedAt: Date, now: Date) {
  const ms = postedAt.getTime() + LISTING_DAYS * 86400_000 - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86400_000);
}

export const CATEGORIES = [
  { key: "food", label: "Food and drink" },
  { key: "clothing", label: "Clothing and shoes" },
  { key: "fitness", label: "Walking and fitness" },
  { key: "stays", label: "Stays and rentals" },
  { key: "electronics", label: "Phones and electronics" },
  { key: "home", label: "Home and farm" },
  { key: "vehicles", label: "Vehicles and transport" },
  { key: "beauty", label: "Beauty and health" },
  { key: "services", label: "Services" },
  { key: "other", label: "Anything else" },
] as const;

/** What a price is for. "item" is a plain price; the rest read "KSh 3,500 / night". */
export const PRICE_UNITS = [
  { key: "item", label: "Fixed price", per: "" },
  { key: "night", label: "Per night", per: "night" },
  { key: "day", label: "Per day", per: "day" },
  { key: "week", label: "Per week", per: "week" },
  { key: "month", label: "Per month", per: "month" },
  { key: "hour", label: "Per hour", per: "hour" },
  { key: "session", label: "Per session", per: "session" },
  { key: "person", label: "Per person", per: "person" },
  { key: "kg", label: "Per kg", per: "kg" },
] as const;

export const unitPer = (unit: string) => PRICE_UNITS.find((u) => u.key === unit)?.per ?? "";

export type Category = (typeof CATEGORIES)[number]["key"];
export const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? "Other";

/** "KSh 1,500", "KSh 3,500 / night", or "Ask for price" when the seller left it out. */
export function priceText(priceKsh: number | null, unit = "item") {
  if (priceKsh == null) return "Ask for price";
  if (priceKsh === 0) return "Free";
  const per = unitPer(unit);
  return `KSh ${priceKsh.toLocaleString("en-KE")}${per ? ` / ${per}` : ""}`;
}

/** A Kenyan number as WhatsApp wants it: "0712 345 678" → "254712345678". Other countries: digits as given. */
export function whatsappNumber(phone: string) {
  const d = phone.replace(/[^\d]/g, "");
  if (d.length === 10 && d.startsWith("0")) return `254${d.slice(1)}`;
  if (d.length === 9 && /^[17]/.test(d)) return `254${d}`;
  return d;
}

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(message)}`;
}

type Get = (key: string) => unknown;
const text = (v: unknown, max: number) => String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);

export function parseListing(get: Get, parsePhone: (v: unknown) => string | null | false) {
  const title = text(get("title"), 60).replace(/\s+/g, " ");
  if (title.length < 3) return { error: "Say what you’re selling, in a few words." } as const;
  const rawPrice = String(get("price") ?? "").replace(/[,\s]/g, "");
  let priceKsh: number | null = null;
  if (rawPrice) {
    if (!/^\d{1,8}$/.test(rawPrice)) return { error: "Write the price in shillings, numbers only. Or leave it empty." } as const;
    priceKsh = Number(rawPrice);
  }
  const category = String(get("category") ?? "");
  if (!CATEGORIES.some((c) => c.key === category)) return { error: "Choose what kind of thing it is." } as const;
  const unit = String(get("priceUnit") ?? "item") || "item";
  if (!PRICE_UNITS.some((u) => u.key === unit)) return { error: "Choose what the price is for." } as const;
  const phone = parsePhone(get("phone"));
  if (!phone) return { error: "Add the number buyers can reach you on. Try 0712 345 678." } as const;
  return {
    value: {
      title,
      priceKsh,
      priceUnit: priceKsh == null ? "item" : unit,
      negotiable: priceKsh != null && get("negotiable") === "1",
      location: text(get("location"), 60).replace(/\s+/g, " ") || null,
      category,
      phone,
      description: text(get("description"), DESCRIPTION_MAX) || null,
    },
  } as const;
}

/* ───────────── The club feed ───────────── */

export const POST_MAX = 1000;
export const BIO_MAX = 160;
export const REPLY_MAX = 500;

/** A post needs words or at least one photo. */
export function parsePost(body: unknown, photoCount: number) {
  const b = text(body, POST_MAX);
  if (!b && photoCount === 0) return { error: "Write something, or add a photo." } as const;
  return { value: b } as const;
}

/** "Just now", "5 min", "3 h", "Yesterday", then the date. */
export function timeAgo(at: Date, now: Date, tz = TZ) {
  const mins = Math.floor((now.getTime() - at.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h`;
  const a = utcToZoned(at, tz).day;
  if (a === addDays(utcToZoned(now, tz).day, -1)) return "Yesterday";
  return formatDay(at, tz);
}

/** "3 likes", "1 reply": the number with the right word. */
export const countText = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ───────────── Photos ───────────── */

export const PHOTO_MAX_BYTES = 900_000;

/** Is this really a JPEG, PNG or WebP? Looks at the first bytes, not the name. */
export function photoType(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

/* ───────────── Community notifications ───────────── */

const excerpt = (s: string, max = 110) => {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
};

const first = (name: string) => name.trim().split(/\s+/)[0] || "A member";

/** What members' phones show when someone posts. Each post gets its own tag, so two posts are two notifications. */
export function postNote(p: { id: string; authorName: string; body: string; photoCount: number }) {
  const photos = p.photoCount === 1 ? "a photo" : `${p.photoCount} photos`;
  return {
    title: `${first(p.authorName)} posted in Community`,
    body: p.body.trim() ? excerpt(p.body) : `Shared ${photos}.`,
    url: `/community/${p.id}`,
    tag: `post-${p.id}`,
  };
}

/** What the person who posted sees when someone replies. Replies on one post share a tag, so the latest replaces the last and buzzes again. */
export function replyNote(r: { postId: string; authorName: string; body: string }) {
  return {
    title: `${first(r.authorName)} replied to your post`,
    body: excerpt(r.body),
    url: `/community/${r.postId}`,
    tag: `replies-${r.postId}`,
    renotify: true,
  };
}

/** What someone sees when another member answers their comment. */
export function commentReplyNote(r: { postId: string; authorName: string; body: string }) {
  return {
    title: `${first(r.authorName)} replied to your comment`,
    body: excerpt(r.body),
    url: `/community/${r.postId}`,
    tag: `comment-replies-${r.postId}`,
    renotify: true,
  };
}

/** A count on a badge: nothing for 0, "9+" past nine, so it never crowds the tab. */
export const badgeText = (n: number) => (n <= 0 ? "" : n > 9 ? "9+" : String(n));

/** "Akinyi", "Akinyi and Kamau", "Akinyi, Kamau and 7 others": who liked a post, newest first. */
export function likersText(names: string[]) {
  const n = names.map((s) => s.trim().split(/\s+/)[0] || "A member");
  if (n.length <= 1) return n[0] ?? "Someone";
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  const rest = n.length - 2;
  return `${n[0]}, ${n[1]} and ${rest} ${rest === 1 ? "other" : "others"}`;
}
