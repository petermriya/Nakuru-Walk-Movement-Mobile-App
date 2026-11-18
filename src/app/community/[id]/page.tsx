import { PostCard } from "@/components/post-card";
import { Thread } from "@/components/thread";
import { BackLink, Page } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { postData } from "@/lib/queries";

export const metadata = { title: "Post" };

export default async function PostPage({ params }: PageProps<"/community/[id]">) {
  const { id } = await params;
  const { me, club, admin } = await requireMember();
  const { post, thread } = await postData(id, club.id, me.id);
  const now = new Date();

  return (
    <Page>
      <BackLink href="/community" label="Community" />
      <div className="mt-2">
        <PostCard post={post} now={now} canRemove={admin || post.authorId === me.id} open />
      </div>
      <Thread postId={post.id} comments={thread} now={now} meId={me.id} admin={admin} />
    </Page>
  );
}
