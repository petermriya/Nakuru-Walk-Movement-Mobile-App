"use client";

import { useActionState, useState } from "react";
import { saveWalk } from "@/app/actions";

type Campaign = { id: string; name: string; startsOn: string; endsOn: string };
type Values = { id?: string; title: string; places: string; distance: string; meetingPoint: string; mapUrl: string; day: string; time: string; dressCode: string; notes: string; campaignId: string };

const shortDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const weekdayOf = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });

export function WalkForm({ initial, saturday, campaigns }: { initial: Values; saturday: string; campaigns: Campaign[] }) {
  const [state, action, pending] = useActionState(saveWalk, undefined);
  const [day, setDay] = useState(initial.day);
  const sunday = new Date(Date.parse(`${saturday}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  // Campaigns on or around the walk's date come first.
  const near = campaigns.filter((c) => c.startsOn <= day && c.endsOn >= day);

  return (
    <form action={action} className="mt-6 space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div>
        <label htmlFor="title" className="label">Route name</label>
        <input id="title" name="title" className="field" defaultValue={initial.title} placeholder="Menengai Crater rim" required maxLength={80} />
      </div>
      <div>
        <label htmlFor="places" className="label">Places along the way</label>
        <input id="places" name="places" className="field" defaultValue={initial.places} placeholder="Nakuru town, Section 58, Menengai Crater" />
        <p className="hint">Separate with commas. These go on everyone’s list of places walked.</p>
      </div>
      <div>
        <label htmlFor="distance" className="label">Distance</label>
        <div className="relative">
          <input id="distance" name="distance" className="field pr-12" inputMode="decimal" defaultValue={initial.distance} placeholder="18" required />
          <span className="absolute top-1/2 right-4 -translate-y-1/2 text-muted">km</span>
        </div>
        <p className="hint">Any length. Decimals are fine, for example 16.5.</p>
      </div>

      <fieldset>
        <legend className="label">Day</legend>
        <div className="flex flex-wrap gap-2">
          {[saturday, sunday].map((d) => (
            <button key={d} type="button" onClick={() => setDay(d)} className={`chip h-10 px-4 text-[15px] ${day === d ? "bg-accent text-white" : "bg-surface-2"}`}>
              {weekdayOf(d).slice(0, 3)} {shortDate(d)}
            </button>
          ))}
        </div>
        <input aria-label="Date" type="date" name="day" className="field mt-3" value={day} onChange={(e) => setDay(e.target.value)} required />
      </fieldset>
      <div>
        <label htmlFor="time" className="label">Start time</label>
        <input id="time" type="time" name="time" className="field" defaultValue={initial.time} required />
      </div>

      <div>
        <label htmlFor="meetingPoint" className="label">Meeting point</label>
        <input id="meetingPoint" name="meetingPoint" className="field" defaultValue={initial.meetingPoint} placeholder="Nakuru Athletic Club gate" required maxLength={120} />
      </div>
      <div>
        <label htmlFor="mapUrl" className="label">Map link <span className="font-normal text-muted">(optional)</span></label>
        <input id="mapUrl" name="mapUrl" className="field" inputMode="url" defaultValue={initial.mapUrl} placeholder="Paste a Google Maps link or pin" />
      </div>
      <div>
        <label htmlFor="dressCode" className="label">Dress code <span className="font-normal text-muted">(optional)</span></label>
        <input id="dressCode" name="dressCode" className="field" defaultValue={initial.dressCode} placeholder="Green jersey" maxLength={80} />
      </div>
      <div>
        <label htmlFor="campaignId" className="label">Special day or campaign? <span className="font-normal text-muted">(optional)</span></label>
        <select id="campaignId" name="campaignId" className="field" defaultValue={initial.campaignId}>
          <option value="">None</option>
          {near.length > 0 && (
            <optgroup label="On this day">
              {near.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          )}
          <optgroup label="All">
            {campaigns.filter((c) => !near.includes(c)).map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({shortDate(c.startsOn)})</option>
            ))}
          </optgroup>
        </select>
      </div>
      <div>
        <label htmlFor="notes" className="label">Notes <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="notes" name="notes" rows={4} className="field" defaultValue={initial.notes} placeholder="Bring water and a snack." maxLength={1000} />
      </div>

      {state?.error && <p role="alert" className="text-[15px] text-negative">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Saving…" : initial.id ? "Save changes" : "Post the walk"}</button>
    </form>
  );
}
