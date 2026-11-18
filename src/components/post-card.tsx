import Link from "next/link";
import { deletePost } from "@/app/actions";
import { LikeButton, RemoveButton } from "@/components/feed-parts";
import { PhotoGrid, PhotoSwipe } from "@/components/photo-view";
import { Avatar, Icon } from "@/components/ui";
import { timeAgo } from "@/lib/market";

export type Post = {
  id: string;
  body: string;
  createdAt: Date;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  likes: number;
  liked: boolean;
  replyCount: number;
  photoIds: string[];
};

/** One post: in the feed (tap through to the replies) or opened on its own page. */
export function PostCard({ post, now, canRemove, open = false, fresh = false }: { post: Post; now: Date; canRemove: boolean; open?: boolean; fresh?: boolean }) {
  const name = post.authorName.trim() || "A member";
  return (
    <article className={`panel p-4 ${fresh ? "ring-2 ring-accent/25" : ""}`}>
      <header className="flex items-center gap-3">
        <Link href={`/people/${post.authorId}`} aria-label={`${name}’s profile`} className="shrink-0">
          <Avatar id={post.authorId} name={name} image={post.authorImage} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/people/${post.authorId}`} className="block truncate text-[16px] leading-tight font-bold hover:underline">{name}</Link>
          <p className="flex items-center gap-1.5 text-[13px] text-muted">
            {timeAgo(post.createdAt, now)}
            {fresh && <span className="chip h-5 bg-accent px-2 text-[11px] text-white">New</span>}
          </p>
        </div>
        {canRemove && <RemoveButton action={deletePost.bind(null, post.id)} label="Remove post" after={open ? "/community" : undefined} />}
      </header>

      {post.body && <p className={`mt-3 text-[16px] leading-[1.45] whitespace-pre-line [overflow-wrap:anywhere] ${open ? "" : "line-clamp-[8]"}`}>{post.body}</p>}

      {post.photoIds.length > 0 && (
        <div className="mt-3">
          {open ? <PhotoSwipe ids={post.photoIds} alt={`Photo from ${name}`} /> : <Link href={`/community/${post.id}`} aria-label="Open post"><PhotoGrid ids={post.photoIds} /></Link>}
        </div>
      )}

      <footer className="mt-2 flex items-center gap-3">
        <LikeButton postId={post.id} liked={post.liked} count={post.likes} />
        {open ? (
          <span className="inline-flex h-10 items-center gap-1.5 text-[14px] font-semibold text-muted">
            <Icon.chat className="size-[22px]" /> {post.replyCount > 0 && post.replyCount}
          </span>
        ) : (
          <Link href={`/community/${post.id}`} className="hit inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[14px] font-semibold text-muted">
            <Icon.chat className="size-[22px]" /> {post.replyCount > 0 ? post.replyCount : "Comment"}
          </Link>
        )}
      </footer>
    </article>
  );
}
