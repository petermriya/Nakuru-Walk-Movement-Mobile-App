"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { createPost, setLiked } from "@/app/actions";
import { PhotoPicker } from "@/components/photo-picker";
import { IconButton } from "@/components/icon-button";
import { Icon } from "@/components/ui";

type Result = { error?: string; ok?: boolean } | undefined;

/** Like a post. Tap again to take it back. */
export function LikeButton({ postId, liked, count }: { postId: string; liked: boolean; count: number }) {
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
      await setLiked(postId, next);
    });
  return (
    <button type="button" onClick={flip} aria-pressed={state.liked} aria-label={state.liked ? "Take back your like" : "Like"} className={`hit -ml-2 inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[14px] font-semibold transition-colors ${state.liked ? "text-negative" : "text-muted"}`}>
      <Icon.heart className={`size-[22px] ${popped ? "pop" : ""}`} fill={state.liked ? "currentColor" : "none"} />
      {state.count > 0 && <span>{state.count}</span>}
    </button>
  );
}

/** Two taps to remove something, so one slip doesn't. */
export function RemoveButton({ action, label = "Remove", after }: { action: () => Promise<Result>; label?: string; after?: string }) {
  const [sure, setSure] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  if (!sure) {
    return (
      <IconButton label={label} look="danger" onClick={() => setSure(true)}>
        <Icon.trash className="size-5" />
      </IconButton>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[14px] font-semibold">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await action();
            if (r?.error) setError(r.error);
            else if (after) router.push(after);
          })
        }
        className="h-10 rounded-full px-3 text-negative"
      >
        {pending ? "Removing…" : error || `${label}?`}
      </button>
      <button type="button" onClick={() => setSure(false)} className="hit h-10 rounded-full px-3 text-muted">Keep</button>
    </span>
  );
}

/** Write a post for the whole club, with up to 3 photos. */
export function Composer({ placeholder }: { placeholder: string }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const empty = !body.trim() && files.length === 0;
  const send = () =>
    start(async () => {
      setError("");
      const form = new FormData();
      form.set("body", body);
      files.forEach((f) => form.append("photos", f));
      const r = await createPost(null, form);
      if (r?.error) return setError(r.error);
      setBody("");
      setFiles([]);
    });
  return (
    <div className="panel p-4">
      <label htmlFor="post-body" className="sr-only">Write a post</label>
      <textarea id="post-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={body.length > 80 || body.includes("\n") ? 4 : 2} placeholder={placeholder} className="block w-full resize-none bg-transparent px-1 pt-1 text-[17px] leading-snug placeholder:text-faint focus:outline-none" />
      <div className="mt-3 flex items-end justify-between gap-3">
        <PhotoPicker files={files} onChange={setFiles} onError={setError} />
        <button type="button" onClick={send} disabled={pending || empty} className="btn btn-sm shrink-0 gap-1.5">
          <Icon.send className="size-4" /> {pending ? "Posting…" : "Post"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-[14px] font-semibold text-negative">{error}</p>}
    </div>
  );
}
