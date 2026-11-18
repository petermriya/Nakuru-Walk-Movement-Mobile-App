import { headers } from "next/headers";
import Link from "next/link";
import { Avatar, Icon, Page, Section, TabBar } from "@/components/ui";
import { requireAdmin } from "@/lib/club";
import { timeAgo } from "@/lib/market";
import { clubMembersList, removedMembers } from "@/lib/queries";
import { JoinLink, LetBackIn, MemberActions, NewLinkButton } from "./parts";

export const metadata = { title: "Club" };

export default async function Club({ searchParams }: PageProps<"/club">) {
  const { me, club } = await requireAdmin();
  const { q } = await searchParams;
  const term = typeof q === "string" ? q.slice(0, 60) : "";
  const [{ rows, total }, removed] = await Promise.all([clubMembersList(club.id, term), removedMembers(club.id)]);
  const now = new Date();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const joinUrl = `${proto}://${host}/join/${club.joinCode}`;

  return (
    <Page>
      <h1 className="display pt-5 text-[30px]">{club.name}</h1>
      <p className="mt-1 text-[15px] text-muted">{total.toLocaleString("en")} {total === 1 ? "member" : "members"} in the app</p>

      <Section title="Join link" action={<NewLinkButton />}>
        <div className="panel p-5">
          <p className="mb-3 text-[15px] text-muted">Paste this one link in every WhatsApp group. Anyone who opens it signs in with Google and is in.</p>
          <JoinLink url={joinUrl} />
        </div>
      </Section>

      <Section title="Special days">
        <Link href="/club/campaigns" className="panel press flex items-center gap-3 p-5">
          <Icon.ribbon className="size-6 text-bloom" />
          <span className="flex-1 text-[16px] font-semibold">Special days and campaigns</span>
          <Icon.chevron className="size-5 text-faint" />
        </Link>
      </Section>

      <Section title="Members">
        <form role="search" className="mb-3">
          <label htmlFor="q" className="sr-only">Find a member</label>
          <input id="q" name="q" type="search" defaultValue={term} className="field" placeholder="Find by name or number" autoComplete="off" />
        </form>
        <ul className="panel divide-y divide-line">
          {rows.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar id={m.id} name={m.name} image={m.image} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-semibold">{m.name}{m.id === me.id ? " (you)" : ""}</p>
                <p className="flex flex-wrap gap-x-3 text-[13px] text-muted">
                  <span>{m.walksDone} {m.walksDone === 1 ? "walk" : "walks"}</span>
                  {m.phone && <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-accent">{m.phone}</a>}
                </p>
              </div>
              {m.role === "admin" && <span className="chip h-6 shrink-0 bg-accent-soft px-2.5 text-[12px] text-accent-deep">Admin</span>}
              <MemberActions userId={m.id} name={m.name.trim() || "this member"} admin={m.role === "admin"} me={m.id === me.id} />
            </li>
          ))}
        </ul>
        {rows.length === 60 && <p className="mt-2 px-1 text-[13px] text-muted">Showing the first 60. Search to find anyone else.</p>}
        {!rows.length && <p className="panel p-5 text-[15px] text-muted">No one matches that.</p>}
      </Section>

      {removed.length > 0 && (
        <Section title="Removed">
          <ul className="panel divide-y divide-line">
            {removed.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar id={r.id} name={r.name} image={r.image} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-semibold">{r.name}</p>
                  <p className="text-[13px] leading-snug text-muted">
                    {timeAgo(r.at, now)}{r.by ? ` by ${r.by.trim().split(/\s+/)[0]}` : ""}{r.reason ? `: ${r.reason}` : ""}
                  </p>
                </div>
                <LetBackIn userId={r.id} name={r.name.trim() || "them"} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <TabBar active="club" admin />
    </Page>
  );
}
