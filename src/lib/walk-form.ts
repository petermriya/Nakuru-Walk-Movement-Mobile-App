import { parseKm, splitPlaces } from "./record";
import { TZ, zonedToUtc } from "./time";

export type WalkInput = {
  title: string;
  places: string[];
  distanceKm: number;
  meetingPoint: string;
  mapUrl: string | null;
  startsAt: Date;
  dressCode: string | null;
  notes: string | null;
  campaignId: string | null;
};

const clean = (v: unknown, max: number) => String(v ?? "").trim().replace(/[ \t]+/g, " ").slice(0, max);

/** A pasted map link or pin: only web links, so nothing odd ends up behind the button. */
export function mapLink(v: string): string | null | false {
  const s = v.trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : false;
  } catch {
    return false;
  }
}

/** Check what an admin typed for a walk. Plain messages, so they know what to fix. */
export function parseWalk(get: (k: string) => unknown, tz = TZ): { value: WalkInput } | { error: string } {
  const title = clean(get("title"), 80);
  if (!title) return { error: "Give the route a name, for example “Menengai Crater rim”." };
  const distanceKm = parseKm(get("distance"));
  if (distanceKm === null) return { error: "Enter the distance in km, for example 18." };
  const meetingPoint = clean(get("meetingPoint"), 120);
  if (!meetingPoint) return { error: "Say where everyone meets." };
  const map = mapLink(String(get("mapUrl") ?? ""));
  if (map === false) return { error: "The map link doesn’t look right. Paste the link from Google Maps." };
  const day = String(get("day") ?? "");
  const time = String(get("time") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Pick the date." };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Pick the start time." };
  const campaignId = String(get("campaignId") ?? "");
  return {
    value: {
      title,
      places: splitPlaces(String(get("places") ?? "")),
      distanceKm,
      meetingPoint,
      mapUrl: map,
      startsAt: zonedToUtc(day, time, tz),
      dressCode: clean(get("dressCode"), 80) || null,
      notes: String(get("notes") ?? "").trim().slice(0, 1000) || null,
      campaignId: /^[0-9a-f-]{36}$/i.test(campaignId) ? campaignId : null,
    },
  };
}

/** A campaign or awareness day. */
export function parseCampaign(get: (k: string) => unknown): { value: { name: string; startsOn: string; endsOn: string; description: string | null } } | { error: string } {
  const name = clean(get("name"), 80);
  if (!name) return { error: "Give it a name." };
  const startsOn = String(get("startsOn") ?? "");
  const endsOn = String(get("endsOn") ?? "") || startsOn;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) return { error: "Pick the date it starts." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || endsOn < startsOn) return { error: "The end date can’t be before the start." };
  return { value: { name, startsOn, endsOn, description: String(get("description") ?? "").trim().slice(0, 280) || null } };
}

/** "07 12 345 678" or "+254712345678" → kept as typed, tidied. Null if it isn't a phone number. */
export function parsePhone(v: unknown): string | null | false {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  if (!s) return null;
  const digits = s.replace(/[^\d]/g, "");
  if (!/^\+?[\d ()-]+$/.test(s) || digits.length < 9 || digits.length > 15) return false;
  return s.slice(0, 20);
}
