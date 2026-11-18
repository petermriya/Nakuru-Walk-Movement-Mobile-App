import Link from "next/link";
import { MessageButton } from "@/components/message-button";
import { Avatar, BackLink, Page } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { countText } from "@/lib/market";
import { DIRECTORY_PAGE, memberDirectory } from "@/lib/queries";

export const metadata = { title: "Members" };

/** Everyone in the club. Tap a name for their profile, or Message to chat with them. */
export default async function Members({ searchParams }: PageProps<"/community/members">) {
  const { me, club } = await requireMember();
  const { q } = await searchParams;
  const term = typeof q === "string" ? q.slice(0, 60) : "";
  const { rows, total } = await memberDirectory(club.id, term);

  return (
    <Page>
      <BackLink href="/community" label="Community" />
      <h1 className="display mt-1 text-[30px]">Members</h1>
      <p className="mt-0.5 mb-4 text-[15px] text-muted">{countText(total, "member", "members")} in {club.name}. Tap Message to chat privately.</p>

      <form role="search" className="mb-3">
        <label htmlFor="q" className="sr-only">Find a member</label>
        <input id="q" name="q" type="search" defaultValue={term} className="field" placeholder="Find someone by name" autoComplete="off" />
      </form>

      {rows.length ? (
        <ul className="panel divide-y divide-line">
          {rows.map((m) => {
            const name = m.name.trim() || "A member";
            const mine = m.id === me.id;
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/people/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar id={m.id} name={name} image={m.image} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[16px] font-semibold">{name}{mine ? " (you)" : ""}</span>
                      {m.role === "admin" && <span className="chip h-5 shrink-0 bg-accent-soft px-2 text-[11px] text-accent-deep">Admin</span>}
                    </span>
                    {m.bio && <span className="block truncate text-[13px] text-muted">{m.bio}</span>}
                  </span>
                </Link>
                {!mine && <MessageButton personId={m.id} className="btn btn-quiet btn-sm shrink-0 gap-1.5" />}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="panel p-5 text-[15px] text-muted">No one by that name.</p>
      )}
      {rows.length === DIRECTORY_PAGE && <p className="mt-2 px-1 text-[13px] text-muted">Showing the first {DIRECTORY_PAGE}. Search to find anyone else.</p>}
    </Page>
  );
}
