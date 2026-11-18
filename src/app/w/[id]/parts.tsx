"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkIn, confirmFinish, newCheckinCode, setCancelled, setSweep } from "@/app/actions";
import { Icon } from "@/components/ui";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<{ error?: string } | undefined>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r?.error) setError(r.error);
      else {
        after?.();
        router.refresh();
      }
    });
  return { pending, error, run };
}

const Err = ({ e }: { e: string | null }) => (e ? <p role="alert" className="mt-2 text-[14px] text-negative">{e}</p> : null);

/** On the page the QR code opens: one tap to check in. */
export function CheckInButton({ walkId, code }: { walkId: string; code: string }) {
  const { pending, error, run } = useAction();
  return (
    <div>
      <button type="button" className="btn w-full" disabled={pending} onClick={() => run(() => checkIn(walkId, code))}>
        <Icon.check className="size-5" /> {pending ? "Checking you in…" : "Check me in"}
      </button>
      <Err e={error} />
    </div>
  );
}

/** The person at the back (or an admin): everyone finished. */
export function FinishForm({ walkId, there }: { walkId: string; there: number }) {
  const [count, setCount] = useState(String(there));
  const [note, setNote] = useState("");
  const { pending, error, run } = useAction();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => confirmFinish(walkId, count, note));
      }}
    >
      <div>
        <label htmlFor="fin" className="label">How many people finished?</label>
        <input id="fin" className="field" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        <p className="hint">{there} checked in. Count everyone at the finish, including people who dropped out safely along the way.</p>
      </div>
      <div>
        <label htmlFor="fin-note" className="label">Anything to note? <span className="font-normal text-muted">(optional)</span></label>
        <input id="fin-note" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: 2 left early by matatu" />
      </div>
      <button className="btn w-full" disabled={pending}>
        <Icon.flag className="size-5" /> Everyone is in
      </button>
      <Err e={error} />
    </form>
  );
}

export function SweepPicker({ walkId, current, people }: { walkId: string; current: string | null; people: { id: string; name: string }[] }) {
  const { pending, error, run } = useAction();
  return (
    <div>
      <label htmlFor="sweep" className="label">Person at the back</label>
      <select id="sweep" className="field" disabled={pending} value={current ?? ""} onChange={(e) => run(() => setSweep(walkId, e.target.value))}>
        <option value="">Choose someone</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <p className="hint">They walk last and confirm everyone finished. Pick from people coming or checked in.</p>
      <Err e={error} />
    </div>
  );
}

export function CancelButton({ walkId, cancelled }: { walkId: string; cancelled: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <>
      <button
        type="button"
        className="btn btn-quiet btn-sm"
        disabled={pending}
        onClick={() => {
          if (cancelled || confirm("Call off this walk? Members will see it’s off. You can put it back on later.")) run(() => setCancelled(walkId, !cancelled));
        }}
      >
        {cancelled ? "Put back on" : "Call off"}
      </button>
      <Err e={error} />
    </>
  );
}

export function NewCodeButton({ walkId }: { walkId: string }) {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      className="text-[14px] font-semibold text-white/80 underline"
      disabled={pending}
      onClick={() => confirm("Make a new code? The old one stops working.") && run(() => newCheckinCode(walkId))}
    >
      {pending ? "Making a new code…" : "New code"}
    </button>
  );
}
