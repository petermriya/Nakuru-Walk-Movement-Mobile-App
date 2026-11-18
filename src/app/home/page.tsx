import Link from "next/link";
import { ComingButton } from "@/components/coming";
import { InstallApp } from "@/components/install";
import { NotifyNudge } from "@/components/notify-nudge";
import { OpenInBrowser } from "@/components/open-in-browser";
import { Logo } from "@/components/logo";
import { PushSync } from "@/components/push-sync";
import { RouteLine } from "@/components/route-line";
import { Empty, Icon, Page, Section, TabBar } from "@/components/ui";
import { WalkChips, WalkRow } from "@/components/walk-bits";
import { requireMember } from "@/lib/club";
import { homeData } from "@/lib/queries";
import { kmText } from "@/lib/record";
import { formatTime, relativeDay } from "@/lib/time";

export const metadata = { title: "Walks" };

/** "Good morning", "Good afternoon" or "Good evening", in Nakuru time. */
function greeting(now: Date) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", hour: "numeric", hourCycle: "h23" }).format(now));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Home({ searchParams }: PageProps<"/home">) {
  const { me, club, admin } = await requireMember();
  const { joined } = await searchParams;
  const now = new Date();
  const { upcoming, past } = await homeData(club.id, me.id, now);
  const next = upcoming.find((u) => !u.walk.cancelled);
  const later = upcoming.filter((u) => u !== next);

  return (
    <Page>
      <PushSync />
      <header className="flex h-14 items-center gap-3">
        <Logo size={34} />
        <p className="min-w-0 flex-1 truncate text-[16px] leading-tight font-bold">
          {club.name}
          <span className="block text-[13px] font-medium text-muted">{greeting(now)}{me.name.trim() ? `, ${me.name.trim().split(/\s+/)[0]}` : ""}</span>
        </p>
        {admin && (
          <Link href="/walks/new" className="btn btn-sm gap-1.5" aria-label="Plan a walk">
            <Icon.plus className="size-4" /> Walk
          </Link>
        )}
      </header>

      <OpenInBrowser className="mt-3" />

      {joined && (
        <p className="panel rise mt-3 p-5 text-[16px]" role="status">
          <span className="font-semibold">Welcome{me.name.trim() ? `, ${me.name.trim().split(/\s+/)[0]}` : ""}!</span> You’re in Nakuru Walk Movement. Here’s what’s coming up.
        </p>
      )}

      {!me.name.trim() && (
        <Link href="/me/edit" className="panel press mt-3 flex items-center gap-3 p-5 text-[15px]">
          <span className="flex-1">Add your name, so the admins know who’s coming.</span>
          <Icon.chevron className="size-5 text-faint" />
        </Link>
      )}

      {next ? (
        <article className="panel mt-4 overflow-hidden">
          <Link href={`/w/${next.walk.id}`} className="hero block px-5 pt-5 pb-6">
            <p className="flex items-baseline justify-between gap-3 text-[15px] font-semibold text-white/85">
              <span>{relativeDay(next.walk.startsAt, now)}, {formatTime(next.walk.startsAt)}</span>
              <span className="display text-[26px] text-white">{kmText(next.walk.distanceKm)}</span>
            </p>
            <h1 className="display mt-3 text-[40px]">{next.walk.title}</h1>
            <div className="mt-5">
              <RouteLine stops={next.walk.places.length >= 2 ? next.walk.places : [next.walk.meetingPoint, ...next.walk.places]} />
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[15px] text-white/90">
              <Icon.pin className="size-4.5 shrink-0" /> <span className="truncate">Meet at {next.walk.meetingPoint}</span>
            </p>
          </Link>
          <div className="space-y-4 p-5">
            <WalkChips dressCode={next.walk.dressCode} campaign={next.campaign} />
            <ComingButton walkId={next.walk.id} mine={next.mine} count={next.coming} />
          </div>
        </article>
      ) : (
        <div className="mt-4">
          <Empty title="No walk planned yet">
            {admin ? <Link href="/walks/new" className="font-semibold text-accent">Plan the next walk</Link> : "The admins will post the next walk here. It usually goes up during the week."}
          </Empty>
        </div>
      )}

      <InstallApp where="home" />

      {/* One prompt at a time: install first (on iPhone notifications need it), then notifications. */}
      <div className="mt-4">
        <NotifyNudge onlyWhenInstalled />
      </div>

      {later.length > 0 && (
        <Section title="Coming up">
          <div className="panel divide-y divide-line">
            {later.map((u) => (
              <WalkRow key={u.walk.id} id={u.walk.id} title={u.walk.title} startsAt={u.walk.startsAt} km={u.walk.distanceKm} cancelled={u.walk.cancelled} now={now}
                right={u.mine ? <span className="chip bg-accent-soft text-accent-deep"><Icon.check className="size-3.5" /> Coming</span> : null} />
            ))}
          </div>
        </Section>
      )}

      {past.length > 0 && (
        <Section title="Recent walks">
          <div className="panel divide-y divide-line">
            {past.map((u) => (
              <WalkRow key={u.walk.id} id={u.walk.id} title={u.walk.title} startsAt={u.walk.startsAt} km={u.walk.distanceKm} now={now}
                right={u.myKm != null ? <span className="chip shrink-0 gap-1 bg-accent-soft px-2.5 text-accent-deep"><Icon.check className="size-3.5" /> Walked</span> : <span className="shrink-0 text-[13px] text-muted">{u.there} walked</span>} />
            ))}
          </div>
        </Section>
      )}

      <TabBar active="walks" admin={admin} />
    </Page>
  );
}
