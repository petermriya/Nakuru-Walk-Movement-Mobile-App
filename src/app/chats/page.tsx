import Link from "next/link";
import { Avatar, BackLink, Empty, firstName, Icon, Page } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { badgeText, timeAgo } from "@/lib/market";
import { chatList } from "@/lib/queries";

export const metadata = { title: "Messages" };

const excerpt = (s: string, max = 80) => {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
};

/** Your private conversations with other members, newest first. */
export default async function Chats() {
  const { me, club } = await requireMember();
  const rows = await chatList(me.id, club.id);
  const now = new Date();

  return (
    <Page>
      <BackLink href="/community" label="Community" />
      <div className="mt-1 flex items-center gap-3">
        <h1 className="display min-w-0 flex-1 text-[30px]">Messages</h1>
        <Link href="/community/members" className="btn btn-sm shrink-0 gap-1.5"><Icon.plus className="size-4" /> New message</Link>
      </div>
      <p className="mt-0.5 mb-4 text-[15px] text-muted">Private chats with other members. Only the two of you can read them.</p>

      {rows.length ? (
        <ul className="panel divide-y divide-line overflow-hidden">
          {rows.map((c) => {
            const name = c.other_name.trim() || "A member";
            return (
              <li key={c.id}>
                <Link href={`/chats/${c.id}`} className="press flex items-center gap-3 px-4 py-3.5">
                  <Avatar id={c.other_id} name={name} image={c.other_image} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className={`min-w-0 flex-1 truncate text-[16px] ${c.unread ? "font-bold" : "font-semibold"}`}>{name}</p>
                      <span className={`shrink-0 text-[12px] ${c.unread ? "font-semibold text-accent" : "text-faint"}`}>{timeAgo(c.last_at, now)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className={`min-w-0 flex-1 truncate text-[14px] ${c.unread ? "font-semibold text-ink" : "text-muted"}`}>
                        {c.last_mine ? "You: " : ""}
                        {excerpt(c.last_body ?? "")}
                      </p>
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white" aria-label={`${c.unread} new`}>
                          {badgeText(c.unread)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty title="No messages yet">
          Tap New message to pick anyone in the club. {me.name.trim() ? `${firstName(me.name)}, your` : "Your"} chats show up here.
        </Empty>
      )}
    </Page>
  );
}
