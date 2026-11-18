"use client";

import { useActionState } from "react";
import { saveCampaign } from "@/app/actions";

export function CampaignForm({ initial }: { initial: { id?: string; name: string; startsOn: string; endsOn: string; description: string } }) {
  const [state, action, pending] = useActionState(saveCampaign, undefined);
  return (
    <form action={action} className="mt-6 space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div>
        <label htmlFor="name" className="label">Name</label>
        <input id="name" name="name" className="field" defaultValue={initial.name} placeholder="World Mental Health Day" required maxLength={80} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="startsOn" className="label">Starts</label>
          <input id="startsOn" name="startsOn" type="date" className="field" defaultValue={initial.startsOn} required />
        </div>
        <div>
          <label htmlFor="endsOn" className="label">Ends</label>
          <input id="endsOn" name="endsOn" type="date" className="field" defaultValue={initial.endsOn} />
        </div>
      </div>
      <p className="hint -mt-3">For a single day, leave the end blank.</p>
      <div>
        <label htmlFor="description" className="label">A short line about it</label>
        <textarea id="description" name="description" rows={3} className="field" defaultValue={initial.description} maxLength={280} placeholder="Mental health matters. Walking together and talking helps." />
      </div>
      {state?.error && <p role="alert" className="text-[15px] text-negative">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
