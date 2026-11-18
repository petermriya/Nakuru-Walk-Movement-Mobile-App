import Link from "next/link";
import type { ReactNode } from "react";
import { ComingButton } from "@/components/coming";
import { RouteLine } from "@/components/route-line";
import { BackLink, Icon, Page } from "@/components/ui";
import { WalkChips } from "@/components/walk-bits";
import { requireMember } from "@/lib/club";
import { walkData, walkPeople } from "@/lib/queries";
import { kmText } from "@/lib/record";
import { checkinOpen, formatLongDay, formatTime, hasStarted } from "@/lib/time";
import { CancelButton, FinishForm, SweepPicker } from "./parts";

export async function generateMetadata({ params }: PageProps<"/w/[id]">) {
  const { id } = await params;
  const { me, club } = await requireMember();
  const { walk } = await walkData(id, club.id, me.id);
  return { title: walk.title };
}

function Line({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-3 px-5 py-3.5">
      <span className="mt-0.5 text-accent">{icon}</span>
      <div className="min-w-0 flex-1 text-[16px]">{children}</div>
    </div>
  );
}

export default async function WalkPage({ params }: PageProps<"/w/[id]">) {
  const { id } = await params;
  const { me, club, admin } = await requireMember();
  const { walk, campaign, sweepName, coming, mine, there, myKm } = await walkData(id, club.id, me.id);
  const now = new Date();
  const started = hasStarted(walk.startsAt, now);
  const dayOf = checkinOpen(walk.startsAt, now);
  const isSweep = walk.sweepUserId === me.id;
  const people = admin ? await walkPeople(walk.id) : [];

  return (
    <Page>
      <BackLink href="/home" label="Walks" />

      {walk.cancelled && <p className="panel mt-2 border border-negative/30 p-4 text-[15px] font-semibold text-negative">This walk is called off.</p>}

      <p className="mt-3 text-[15px] font-semibold text-accent">
        {formatLongDay(walk.startsAt)}, {formatTime(walk.startsAt)}
      </p>
      <h1 className="display mt-1.5 text-[38px]">{walk.title}</h1>
      <div className="mt-4">
        <WalkChips dressCode={walk.dressCode} campaign={campaign?.name} />
      </div>

      {/* Your part */}
      {!walk.cancelled && (
        <div className="panel mt-5 p-5">
          {myKm != null ? (
            <>
              <p className="text-[14px] font-semibold text-muted">You were there</p>
              <p className="display mt-1 text-[32px] text-accent">{kmText(myKm)}</p>
              <p className="mt-1 text-[15px] text-muted">Added to your record. Well walked!</p>
            </>
          ) : started && !dayOf ? (
            <p className="text-[16px] text-muted">{there} {there === 1 ? "person" : "people"} walked this one. Hope to see you on the next.</p>
          ) : (
            <>
              <ComingButton walkId={walk.id} mine={mine} count={coming} />
              {dayOf && <p className="mt-4 flex items-start gap-2 rounded-2xl bg-accent-soft p-4 text-[15px] text-accent-deep"><Icon.qr className="mt-0.5 size-5 shrink-0" /> At the walk? Scan the code an admin shows you, and you’re checked in.</p>}
            </>
          )}
        </div>
      )}

      {/* Details */}
      <div className="panel mt-4 divide-y divide-line">
        <Line icon={<Icon.route className="size-5" />}>
          <span className="font-semibold">{kmText(walk.distanceKm)}</span>
          {walk.places.length >= 2 ? (
            <div className="mt-3 mb-1 pr-1">
              <RouteLine tone="dark" stops={walk.places} />
            </div>
          ) : (
            walk.places.length > 0 && <p className="text-[15px] text-muted">{walk.places[0]}</p>
          )}
        </Line>
        <Line icon={<Icon.pin className="size-5" />}>
          <p>Meet at <span className="font-semibold">{walk.meetingPoint}</span></p>
          {walk.mapUrl && (
            <a href={walk.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[15px] font-semibold text-accent">
              Open in Maps
            </a>
          )}
        </Line>
        <Line icon={<Icon.clock className="size-5" />}>
          We leave at <span className="font-semibold">{formatTime(walk.startsAt)}</span>. Please come a little early.
        </Line>
        {walk.notes && <Line icon={<Icon.list className="size-5" />}><p className="whitespace-pre-line">{walk.notes}</p></Line>}
      </div>

      {campaign && (
        <div className="panel mt-4 bg-bloom-soft p-5">
          <p className="text-[13px] font-semibold text-bloom-deep/80">This walk marks</p>
          <p className="mt-0.5 flex items-center gap-2 text-[16px] font-bold text-bloom-deep"><Icon.ribbon className="size-5 shrink-0" /> {campaign.name}</p>
          {campaign.description && <p className="mt-1.5 text-[15px] text-bloom-deep">{campaign.description}</p>}
        </div>
      )}

      {/* Safety: the end-of-walk headcount */}
      {!walk.cancelled && (walk.finishedAt ? (
        <div className="panel mt-4 flex gap-3 p-5">
          <Icon.flag className="mt-0.5 size-5 shrink-0 text-accent" />
          <p className="text-[15px]">
            <span className="font-semibold">Everyone is in.</span> {walk.finishedCount} finished, confirmed at {formatTime(walk.finishedAt)}.
            {walk.finishedNote && <span className="block text-muted">{walk.finishedNote}</span>}
          </p>
        </div>
      ) : started && (admin || isSweep) ? (
        <div className="panel mt-4 p-5">
          <p className="mb-4 text-[17px] font-bold">{isSweep ? "You’re at the back today" : "End of walk"}</p>
          <FinishForm walkId={walk.id} there={there} />
        </div>
      ) : isSweep ? (
        <p className="panel mt-4 p-5 text-[15px]">You’re the person at the back for this walk. When it’s over, confirm here that everyone finished.</p>
      ) : null)}

      {admin && (
        <section className="mt-8">
          <h2 className="mb-3 px-1 text-[17px] font-bold">For admins</h2>
          <div className="panel p-5">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-surface-2 p-3">
                <p className="display text-[28px]">{coming}</p>
                <p className="text-[13px] text-muted">said they’re coming</p>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3">
                <p className="display text-[28px]">{there}</p>
                <p className="text-[13px] text-muted">checked in</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link href={`/w/${walk.id}/qr`} className="btn gap-2"><Icon.qr className="size-5" /> Show code</Link>
              <Link href={`/w/${walk.id}/roll`} className="btn btn-quiet gap-2"><Icon.list className="size-5" /> Roll call</Link>
            </div>
            <div className="mt-5">
              <SweepPicker walkId={walk.id} current={walk.sweepUserId} people={people} />
              {sweepName && !people.some((p) => p.id === walk.sweepUserId) && <p className="hint">Now: {sweepName}</p>}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Link href={`/w/${walk.id}/edit`} className="btn btn-quiet btn-sm gap-1.5"><Icon.edit className="size-4" /> Edit</Link>
              <CancelButton walkId={walk.id} cancelled={walk.cancelled} />
            </div>
          </div>
        </section>
      )}
    </Page>
  );
}
