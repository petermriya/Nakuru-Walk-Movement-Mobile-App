"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { addReply, deleteReply, setReplyLiked } from "@/app/actions";
import { RemoveButton } from "@/components/feed-parts";
import { Avatar, firstName, Icon } from "@/components/ui";
import { countText, timeAgo } from "@/lib/market";

export type Comment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  likes: number;
  liked: boolean;
};

/** Like a comment. Tap again to take it back. */
function CommentLike({ id, liked, count }: { id: string; liked: boolean; count: number }) {
  const [state, setState] = useOptimistic({ liked, count });
  const [, start] = useTransition();
  const [popped, setPopped] = useState(false);
  const flip = () =>
    start(async () => {
      const next = !state.liked;
      setState({ liked: next, count: state.count + (next ? 1 : -1) });
      setPopped(next);
      try {
        navigator.vibrate?.(8);
      } catch {}
      await setReplyLiked(id, next);
    });
  return (
    <button type="button" onClick={flip} aria-pressed={state.liked} aria-label={state.liked ? "Take back your like" : "Like this comment"} className={`hit inline-flex h-8 items-center gap-1 rounded-full px-1.5 text-[13px] font-semibold ${state.liked ? "text-negative" : "text-muted"}`}>
      <Icon.heart className={`size-[18px] ${popped ? "pop" : ""}`} fill={state.liked ? "currentColor" : "none"} />
      {state.count > 0 ? state.count : "Like"}
    </button>
  );
}

function CommentRow({ c, now, meId, admin, small, onReply }: { c: Comment; now: Date; meId: string; admin: boolean; small?: boolean; onReply: (c: Comment) => void }) {
  const name = c.authorName.trim() || "A member";
  return (
    <div className="flex gap-3">
      <Link href={`/people/${c.authorId}`} className="shrink-0" aria-label={`${name}’s profile`}>
        <Avatar id={c.authorId} name={name} image={c.authorImage} size={small ? 28 : 34} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-[18px] bg-surface-2 px-3.5 py-2.5">
          <Link href={`/people/${c.authorId}`} className="text-[14px] font-bold hover:underline">{name}</Link>
          <p className="mt-0.5 text-[15px] leading-[1.45] whitespace-pre-line [overflow-wrap:anywhere]">{c.body}</p>
        </div>
        <div className="mt-0.5 flex items-center gap-1 pl-1.5">
          <span className="pr-1.5 text-[13px] text-muted">{timeAgo(c.createdAt, now)}</span>
          <CommentLike id={c.id} liked={c.liked} count={c.likes} />
          <button type="button" onClick={() => onReply(c)} className="hit inline-flex h-8 items-center rounded-full px-1.5 text-[13px] font-semibold text-muted">Reply</button>
          {(admin || c.authorId === meId) && <span className="ml-auto"><RemoveButton action={deleteReply.bind(null, c.id)} label="Remove comment" /></span>}
        </div>
      </div>
    </div>
  );
}

/** The comments under a post: each can be liked and answered; answers sit under their comment. */
export function Thread({ postId, comments, now, meId, admin }: { postId: string; comments: Comment[]; now: Date; meId: string; admin: boolean }) {
  const [to, setTo] = useState<Comment | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);

  const top = comments.filter((c) => !c.parentId);
  const answers = (id: string) => comments.filter((c) => c.parentId === id);

  const replyTo = (c: Comment) => {
    setTo(c);
    // Answering an answer: start with their name, so it's clear who you mean.
    if (c.parentId && !body.trim()) setBody(`@${firstName(c.authorName)} `);
    box.current?.focus();
  };

  const send = () =>
    start(async () => {
      setError("");
      const form = new FormData();
      form.set("postId", postId);
      form.set("body", body);
      if (to) form.set("parentId", to.id);
      const r = await addReply(null, form);
      if (r?.error) return setError(r.error);
      setBody("");
      setTo(null);
      box.current?.blur();
    });

  return (
    <>
      <h2 className="mt-7 mb-3 px-1 text-[17px] font-bold">{comments.length ? countText(comments.length, "comment", "comments") : "No comments yet"}</h2>
      {top.length > 0 && (
        <ul className="panel space-y-4 p-4">
          {top.map((c) => (
            <li key={c.id}>
              <CommentRow c={c} now={now} meId={meId} admin={admin} onReply={replyTo} />
              {answers(c.id).length > 0 && (
                <ul className="mt-2.5 space-y-2.5 pl-11">
                  {answers(c.id).map((a) => (
                    <li key={a.id}>
                      <CommentRow c={a} now={now} meId={meId} admin={admin} small onReply={replyTo} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="mx-auto max-w-[536px] rounded-[26px] bg-surface/92 p-2 shadow-lift ring-1 ring-ink/[0.06] backdrop-blur-xl">
          {to && (
            <p className="flex items-center gap-2 px-3 pt-1 pb-2 text-[13px] text-muted">
              <span className="min-w-0 flex-1 truncate">Replying to <span className="font-semibold text-ink">{to.authorName.trim() || "a member"}</span></span>
              <button type="button" onClick={() => setTo(null)} aria-label="Stop replying to this comment" className="hit flex size-7 items-center justify-center rounded-full bg-surface-2"><Icon.close className="size-3.5" /></button>
            </p>
          )}
          {error && <p role="alert" className="px-3 pt-1 pb-2 text-[14px] font-semibold text-negative">{error}</p>}
          <div className="flex items-end gap-2">
            <label htmlFor="reply-body" className="sr-only">{to ? "Write your reply" : "Write a comment"}</label>
            <textarea ref={box} id="reply-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={1} placeholder={to ? `Reply to ${firstName(to.authorName)}` : "Write a comment"} className="max-h-32 min-h-11 flex-1 resize-none rounded-[20px] bg-surface-2 px-4 py-2.5 text-[16px] placeholder:text-faint focus:outline-none" style={{ fieldSizing: "content" } as React.CSSProperties} />
            <button type="button" onClick={send} disabled={pending || !body.trim()} aria-label="Send" className="btn size-11 shrink-0 p-0">
              <Icon.send className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
