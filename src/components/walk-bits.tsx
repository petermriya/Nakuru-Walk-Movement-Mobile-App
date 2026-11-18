import Link from "next/link";
import { Icon } from "@/components/ui";
import { kmText } from "@/lib/record";
import { formatTime, relativeDay, TZ } from "@/lib/time";

/** Small labels for a walk: the dress code and the campaign it supports. */
export function WalkChips({ dressCode, campaign }: { dressCode?: string | null; campaign?: string | null }) {
  if (!dressCode && !campaign) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {campaign && (
        <span className="chip bg-bloom-soft text-bloom-deep">
          <Icon.ribbon className="size-4" /> {campaign}
        </span>
      )}
      {dressCode && (
        <span className="chip bg-accent-soft text-accent-deep">
          <Icon.shirt className="size-4" /> {dressCode}
        </span>
      )}
    </div>
  );
}

/** A walk as one row in a list. */
export function WalkRow({ id, title, startsAt, km, cancelled, right, now }: { id: string; title: string; startsAt: Date; km: number; cancelled?: boolean; right?: React.ReactNode; now: Date }) {
  return (
    <Link href={`/w/${id}`} className="press flex items-center gap-4 px-4 py-3.5">
      <DateStub at={startsAt} faded={cancelled} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[16px] font-semibold ${cancelled ? "text-faint line-through" : ""}`}>{title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[14px] text-muted">
          {cancelled ? <span className="font-semibold text-negative">Called off</span> : <span>{relativeDay(startsAt, now) === "Today" || relativeDay(startsAt, now) === "Tomorrow" ? `${relativeDay(startsAt, now)}, ` : ""}{formatTime(startsAt)}</span>}
          <span className="inline-flex items-center gap-1"><Icon.route className="size-3.5" /> {kmText(km)}</span>
        </p>
      </div>
      {right}
      <Icon.chevron className="size-5 shrink-0 text-faint" />
    </Link>
  );
}

/** The walk's day as a small block, like a ticket stub: weekday, then the date large. */
export function DateStub({ at, faded }: { at: Date; faded?: boolean }) {
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...o }).format(at);
  return (
    <span className={`flex w-12 shrink-0 flex-col items-center rounded-[14px] py-1.5 ${faded ? "bg-surface-2 text-faint" : "bg-accent-soft text-accent-deep"}`} aria-hidden>
      <span className="text-[11px] leading-none font-semibold">{part({ weekday: "short" })}</span>
      <span className="display mt-0.5 text-[24px]">{part({ day: "numeric" })}</span>
      <span className="text-[11px] leading-none font-semibold">{part({ month: "short" })}</span>
    </span>
  );
}
