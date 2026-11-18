import Link from "next/link";
import { after } from "next/server";
import { Avatar, BackLink, Empty, firstName, Icon, Page } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { likersText, timeAgo } from "@/lib/market";
import { activityData, seenTimes, setSeen } from "@/lib/queries";

export const metadata = { title: "Activity" };

const excerpt = (s: string, max = 70) => {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
};

type Row = Awaited<ReturnType<typeof activityData>>[number];
type Item =
  | { kind: "reply"; at: Date; fresh: boolean; row: Row }
  | { kind: "likes"; at: Date; fresh: boolean; postId: string; postBody: string; people: Row[]; comment: boolean };

/** Replies one by one; likes on the same post (or comment) in one line, like "Akinyi, Kamau and 7 others liked your post". */
function group(rows: Row[], seen: Date): Item[] {
  const items: Item[] = [];
  const likes = new Map<string, Extract<Item, { kind: "likes" }>>();
  for (const r of rows) {
    if (r.kind === "reply") items.push({ kind: "reply", at: r.at, fresh: r.at > seen, row: r });
    else {
      const key = `${r.kind}-${r.target_id}`;
      const g = likes.get(key);
      if (g) {
        g.people.push(r);
        g.fresh ||= r.at > seen;
      } else {
        const item = { kind: "likes" as const, at: r.at, fresh: r.at > seen, postId: r.post_id, postBody: r.post_body, people: [r], comment: r.kind === "comment_like" };
        likes.set(key, item);
        items.push(item);
      }
    }
  }
  return items;
}

const onPost = (body: string) => (body.trim() ? `On “${excerpt(body)}”` : "On your photo");

/** Replies and likes on your posts. Opening it clears the bell's count. */
export default async function Activity() {
  const { me, club } = await requireMember();
  const [rows, seen] = await Promise.all([activityData(me.id, club.id), seenTimes(me.id, club.id)]);
  after(() => setSeen(me.id, club.id, "activity"));
  const items = group(rows, seen.activity);
  const now = new Date();

  return (
    <Page>
      <BackLink href="/community" label="Community" />
      <h1 className="display mt-3 text-[34px]">Activity</h1>
      <p className="mt-1 mb-5 text-[15px] text-muted">Replies and likes on your posts and comments.</p>

      {items.length ? (
        <ul className="panel divide-y divide-line overflow-hidden">
          {items.map((it) => {
            const href = `/community/${it.kind === "reply" ? it.row.post_id : it.postId}`;
            return (
              <li key={it.kind === "reply" ? `r-${it.row.post_id}-${it.row.who_id}-${it.at.getTime()}` : `l-${it.comment ? "c" : "p"}-${it.people[0].target_id}`}>
                <Link href={href} className={`press flex gap-3 px-4 py-3.5 ${it.fresh ? "bg-accent-soft/50" : ""}`}>
                  {it.kind === "reply" ? (
                    <span className="relative shrink-0">
                      <Avatar id={it.row.who_id} name={it.row.who_name || "?"} image={it.row.who_image} size={40} />
                      <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-accent text-white ring-2 ring-surface"><Icon.chat className="size-3" /></span>
                    </span>
                  ) : (
                    <span className="relative size-10 shrink-0">
                      {it.people.length > 1 ? (
                        <>
                          <span className="absolute top-0 left-0 rounded-full"><Avatar id={it.people[1].who_id} name={it.people[1].who_name || "?"} image={it.people[1].who_image} size={28} /></span>
                          <span className="absolute right-0 bottom-0 rounded-full ring-2 ring-surface"><Avatar id={it.people[0].who_id} name={it.people[0].who_name || "?"} image={it.people[0].who_image} size={28} /></span>
                        </>
                      ) : (
                        <Avatar id={it.people[0].who_id} name={it.people[0].who_name || "?"} image={it.people[0].who_image} size={40} />
                      )}
                      <span className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full bg-negative text-white ring-2 ring-surface"><Icon.heart className="size-3" fill="currentColor" /></span>
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    {it.kind === "reply" ? (
                      <>
                        <span className="block text-[15px] leading-snug">
                          <span className="font-bold">{it.row.who_name.trim() ? firstName(it.row.who_name) : "A member"}</span> {it.row.to_comment ? "replied to your comment" : "commented"}
                          <span className="ml-1.5 text-[13px] text-muted">{timeAgo(it.at, now)}</span>
                        </span>
                        {it.row.body && <span className="mt-0.5 block text-[15px] leading-snug">{excerpt(it.row.body, 120)}</span>}
                        <span className="mt-0.5 block truncate text-[13px] text-muted">{onPost(it.row.post_body)}</span>
                      </>
                    ) : (
                      <>
                        <span className="block text-[15px] leading-snug">
                          {likersText(it.people.map((p) => p.who_name))} liked your {it.comment ? "comment" : "post"}
                          <span className="ml-1.5 text-[13px] text-muted">{timeAgo(it.at, now)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] text-muted">{it.comment ? `“${excerpt(it.postBody)}”` : onPost(it.postBody)}</span>
                      </>
                    )}
                  </span>
                  {it.fresh && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent" aria-label="New" />}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty title="Nothing yet">When someone replies to or likes your posts and comments, you’ll see it here.</Empty>
      )}
    </Page>
  );
}
