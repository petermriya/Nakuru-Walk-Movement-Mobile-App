import Link from "next/link";
import { after } from "next/server";
import { Composer } from "@/components/feed-parts";
import { NotifyNudge } from "@/components/notify-nudge";
import { OpenInBrowser } from "@/components/open-in-browser";
import { PushSync } from "@/components/push-sync";
import { PostCard } from "@/components/post-card";
import { IconButton } from "@/components/icon-button";
import { Empty, firstName, Icon, Page, TabBar, TopBar } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { feedData, seenTimes, setSeen, unreadCounts } from "@/lib/queries";

export const metadata = { title: "Community" };

export default async function Community({ searchParams }: PageProps<"/community">) {
  const { me, club, admin } = await requireMember();
  const { before } = await searchParams;
  const cursor = typeof before === "string" && !Number.isNaN(Date.parse(before)) ? new Date(before) : undefined;
  const [{ posts, more }, seen, counts] = await Promise.all([feedData(club.id, me.id, cursor), seenTimes(me.id, club.id), unreadCounts(me.id, club.id)]);
  // Opening the feed clears its count, once this screen has read the old time for the "New" markers.
  if (!cursor) after(() => setSeen(me.id, club.id, "community"));
  const now = new Date();
  const hello = me.name.trim() ? `What’s on your mind, ${firstName(me.name)}?` : "Share something with the club";

  return (
    <Page>
      <PushSync />
      <TopBar title="Community">
        <div className="flex gap-2">
          <IconButton href="/community/members" label="Members" look="raised">
            <Icon.people className="size-[22px]" />
          </IconButton>
          <IconButton href="/chats" label="Messages" look="raised" badge={counts.chats}>
            <Icon.messages className="size-[22px]" />
          </IconButton>
          <IconButton href="/community/activity" label="Activity" look="raised" badge={counts.activity}>
            <Icon.bell className="size-[22px]" />
          </IconButton>
        </div>
      </TopBar>
      <p className="mt-0.5 mb-4 text-[15px] text-muted">Photos from the walk, a word of thanks, a question for the club.</p>

      <OpenInBrowser className="mb-4" />
      {!cursor && <NotifyNudge />}

      {cursor ? (
        <Link href="/community" className="btn btn-quiet btn-sm mb-4">Back to the newest</Link>
      ) : (
        <Composer placeholder={hello} />
      )}

      <div className="mt-4 space-y-3">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} now={now} canRemove={admin || p.authorId === me.id} fresh={p.authorId !== me.id && p.createdAt > seen.community} />
        ))}
      </div>

      {posts.length === 0 && (
        <div className="mt-4">
          <Empty title={cursor ? "Nothing older than this" : "Be the first to say something"}>
            {!cursor && "A photo from Saturday’s walk is a good start."}
          </Empty>
        </div>
      )}

      {more && (
        <div className="mt-5 text-center">
          <Link href={`/community?before=${encodeURIComponent(posts[posts.length - 1].createdAt.toISOString())}`} className="btn btn-quiet btn-sm">Older posts</Link>
        </div>
      )}

      <TabBar active="community" admin={admin} />
    </Page>
  );
}
