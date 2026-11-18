"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteCampaign, letBackIn, newJoinLink, removeMember, setAdmin } from "@/app/actions";
import { IconButton } from "@/components/icon-button";
import { Icon } from "@/components/ui";

export function JoinLink({ url }: { url: string }) {
  const [copied, setCopied] = useState<"" | "link" | "message">("");
  const message = `Join Nakuru Walk Movement on our app. See each walk, tap "I'm coming", and keep your own record of every kilometre. Tap here to join: ${url}`;
  const copy = async (what: "link" | "message") => {
    try {
      await navigator.clipboard.writeText(what === "link" ? url : message);
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {}
  };
  return (
    <div>
      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-[15px] font-semibold break-all">{url}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-quiet btn-sm gap-1.5" onClick={() => copy("link")}>
          <Icon.copy className="size-4" /> {copied === "link" ? "Copied" : "Copy link"}
        </button>
        <a className="btn btn-sm gap-1.5" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
          <Icon.share className="size-4" /> WhatsApp
        </a>
      </div>
      <button type="button" className="mt-3 text-[14px] font-semibold text-accent" onClick={() => copy("message")}>
        {copied === "message" ? "Message copied" : "Copy a ready message for the groups"}
      </button>
    </div>
  );
}

export function NewLinkButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-[13px] text-muted underline"
      disabled={pending}
      onClick={() => {
        if (confirm("Make a new join link? The old link stops working, so you’ll need to post the new one in every group.")) start(async () => { await newJoinLink(); router.refresh(); });
      }}
    >
      Make a new link
    </button>
  );
}

export function DeleteCampaign({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn btn-danger-quiet w-full" disabled={pending} onClick={() => confirm("Delete this campaign? Walks linked to it stay, without the link.") && start(async () => { await deleteCampaign(id); })}>
      Delete
    </button>
  );
}

/** One ⋯ button per member, opening a sheet with what an admin can do: make them an admin
    (or a member again) and remove them from the club, with a reason. Keeps the list's names readable. */
export function MemberActions({ userId, name, admin, me }: { userId: string; name: string; admin: boolean; me: boolean }) {
  const box = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<"menu" | "remove">("menu");
  const [reason, setReason] = useState("");
  const [wipe, setWipe] = useState(true);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const first = name.trim().split(/\s+/)[0] || "them";
  const close = () => box.current?.close();
  const run = (fn: () => Promise<{ error?: string } | undefined>) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (r?.error) return setError(r.error);
      close();
      router.refresh();
    });

  return (
    <>
      <IconButton label={`Options for ${name}`} onClick={() => box.current?.showModal()}>
        <Icon.more className="size-5" />
      </IconButton>
      <dialog
        ref={box}
        className="sheet"
        aria-labelledby={`opts-${userId}`}
        onClose={() => {
          setStep("menu");
          setError("");
        }}
      >
        {step === "menu" ? (
          <>
            <h2 id={`opts-${userId}`} className="text-[20px] font-bold">{me ? "You" : name}</h2>
            <p className="mt-1 text-[15px] text-muted">{admin ? "Club admin" : "Member"}</p>
            <div className="mt-5 space-y-2">
              <button type="button" disabled={pending} className="btn btn-quiet w-full" onClick={() => run(() => setAdmin(userId, !admin))}>
                {pending ? "Saving…" : admin ? (me ? "Stop being an admin" : "Make a member again") : "Make admin"}
              </button>
              {!admin && <p className="px-2 text-[13px] leading-snug text-muted">Admins can plan walks, check people in and see members’ numbers.</p>}
              {!me && (
                <button type="button" disabled={admin} className="btn btn-danger-quiet w-full gap-2" onClick={() => setStep("remove")}>
                  <Icon.userRemove className="size-5" /> Remove from club
                </button>
              )}
              {!me && admin && <p className="px-2 text-[13px] leading-snug text-muted">To remove {first}, make them a member first.</p>}
            </div>
            {error && <p role="alert" className="mt-3 text-[14px] font-semibold text-negative">{error}</p>}
            <button type="button" className="mt-3 h-11 w-full rounded-full text-[15px] font-semibold text-muted" onClick={close}>Close</button>
          </>
        ) : (
          <>
            <h2 id={`opts-${userId}`} className="text-[20px] font-bold">Remove {name}?</h2>
            <p className="mt-2 text-[15px] leading-snug text-muted">They’ll lose access to the app straight away, and the join link won’t let them back in. You can let them back in later from this screen.</p>
            <label htmlFor={`why-${userId}`} className="mt-5 block text-[14px] font-semibold">Reason <span className="font-normal text-muted">(they’ll see this)</span></label>
            <textarea id={`why-${userId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} rows={2} className="field mt-1.5" placeholder="For example: selling outside the market rules" />
            <label className="mt-4 flex items-start gap-3 text-[15px] leading-snug">
              <input type="checkbox" checked={wipe} onChange={(e) => setWipe(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--negative)]" />
              <span>Also delete {first}’s posts, comments and market items</span>
            </label>
            {error && <p role="alert" className="mt-3 text-[14px] font-semibold text-negative">{error}</p>}
            <div className="mt-6 flex gap-2">
              <button type="button" className="btn btn-quiet flex-1" onClick={() => setStep("menu")}>Back</button>
              <button type="button" disabled={pending} className="btn btn-danger flex-1" onClick={() => run(() => removeMember(userId, reason, wipe))}>
                {pending ? "Removing…" : "Remove"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

export function LetBackIn({ userId, name }: { userId: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className="chip shrink-0 bg-surface-2 text-ink"
        onClick={() => {
          if (!confirm(`Let ${name} back in? They’ll be a member again straight away.`)) return;
          start(async () => {
            const r = await letBackIn(userId);
            if (r?.error) setError(r.error);
            router.refresh();
          });
        }}
      >
        {pending ? "…" : "Let back in"}
      </button>
      {error && <span role="alert" className="text-[12px] text-negative">{error}</span>}
    </>
  );
}
