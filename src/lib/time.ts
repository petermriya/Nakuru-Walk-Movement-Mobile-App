/* Dates and times for walks. Walks are planned in the club's own time zone
   (Nakuru: Africa/Nairobi, UTC+3), and stored as exact moments (UTC). */

export const TZ = "Africa/Nairobi";

/** Minutes the zone is ahead of UTC at a given moment. */
export function offsetMinutes(at: Date, tz = TZ): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** "2026-11-14" + "06:30" in the club's zone → the exact moment. */
export function zonedToUtc(day: string, time: string, tz = TZ): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  return new Date(guess.getTime() - offsetMinutes(guess, tz) * 60000);
}

/** The moment → { day: "2026-11-14", time: "06:30", weekday: 6 } in the club's zone. */
export function utcToZoned(at: Date, tz = TZ) {
  const local = new Date(at.getTime() + offsetMinutes(at, tz) * 60000);
  const iso = local.toISOString();
  return { day: iso.slice(0, 10), time: iso.slice(11, 16), weekday: local.getUTCDay() };
}

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The next Saturday on or after today (club time): the default walk day. */
export function nextSaturday(now: Date, tz = TZ) {
  const { day, weekday } = utcToZoned(now, tz);
  return addDays(day, (6 - weekday + 7) % 7);
}

export const DEFAULT_START = "06:30";

/** "Sat 14 Nov" */
export function formatDay(at: Date, tz = TZ) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(at);
}

/** "6:30 am" */
export function formatTime(at: Date, tz = TZ) {
  const { time } = utcToZoned(at, tz);
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** "Today", "Tomorrow", or "Sat 14 Nov". */
export function relativeDay(at: Date, now: Date, tz = TZ) {
  const a = utcToZoned(at, tz).day;
  const b = utcToZoned(now, tz).day;
  if (a === b) return "Today";
  if (a === addDays(b, 1)) return "Tomorrow";
  return formatDay(at, tz);
}

/* ───────────── Reminders ─────────────
   Peter's choice: one the evening before at 7 pm (Friday for a Saturday walk,
   Saturday for a Sunday walk), and one about two hours before the start.
   The job runs every hour, so "about two hours" means the first hourly run
   no more than 2.5 hours before the start. */

export const EVE_HOUR = 19;
export const SOON_WINDOW_MIN = 150;

export type Reminder = "eve" | "soon";

export function dueReminder(
  walk: { startsAt: Date; eveSentAt: Date | null; soonSentAt: Date | null; cancelled?: boolean },
  now: Date,
  tz = TZ,
): Reminder | null {
  if (walk.cancelled) return null;
  const start = walk.startsAt.getTime();
  const t = now.getTime();
  if (t >= start) return null;
  const minsLeft = (start - t) / 60000;
  if (minsLeft <= SOON_WINDOW_MIN) return walk.soonSentAt ? null : "soon";
  const eve = zonedToUtc(addDays(utcToZoned(walk.startsAt, tz).day, -1), `${EVE_HOUR}:00`, tz).getTime();
  if (t >= eve && !walk.eveSentAt) return "eve";
  return null;
}

/* ───────────── Check-in ─────────────
   Scanning the QR code works from 3 hours before the start until the end of
   the next day, so a late scan at the finish (or the evening after) still counts. */

export function checkinOpen(startsAt: Date, now: Date, tz = TZ) {
  const opens = startsAt.getTime() - 3 * 3600_000;
  const closes = zonedToUtc(addDays(utcToZoned(startsAt, tz).day, 2), "00:00", tz).getTime();
  const t = now.getTime();
  return t >= opens && t < closes;
}

/** "Saturday 14 November" */
export function formatLongDay(at: Date, tz = TZ) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(at);
}

/** Has the walk started (so the end-of-walk headcount makes sense)? */
export const hasStarted = (startsAt: Date, now: Date) => now.getTime() >= startsAt.getTime();
