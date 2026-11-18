"use client";

import { useState, useTransition } from "react";
import { createListing, updateListing } from "@/app/actions";
import { PhotoPicker } from "@/components/photo-picker";
import { CATEGORIES, DESCRIPTION_MAX, PRICE_UNITS, unitPer } from "@/lib/market";

export type ListingDraft = {
  id: string;
  title: string;
  priceKsh: number | null;
  priceUnit: string;
  negotiable: boolean;
  location: string | null;
  category: string;
  description: string | null;
  phone: string;
  photoIds: string[];
};

/** Selling, renting out or offering anything: one form for a new item and for changing one. */
export function ListingForm({ phone, editing }: { phone: string; editing?: ListingDraft }) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [price, setPrice] = useState(editing?.priceKsh != null ? String(editing.priceKsh) : "");
  const [unit, setUnit] = useState(editing?.priceUnit ?? "item");
  const [description, setDescription] = useState(editing?.description ?? "");
  const hasPrice = price.replace(/[,\s]/g, "") !== "";

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    files.forEach((f) => form.append("photos", f));
    if (editing) form.set("id", editing.id);
    start(async () => {
      setError("");
      const r = editing ? await updateListing(null, form) : await createListing(null, form);
      if (r?.error) setError(r.error);
    });
  }

  return (
    <form onSubmit={send} className="space-y-5">
      <div>
        <span className="label">Photos</span>
        {editing && editing.photoIds.length > 0 && files.length === 0 && (
          <div className="mb-2.5 flex gap-2.5">
            {editing.photoIds.map((id, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={id} src={`/api/photo/${id}`} alt={`Current photo ${i + 1}`} className="size-[72px] rounded-2xl object-cover ring-1 ring-ink/10" />
            ))}
          </div>
        )}
        <PhotoPicker files={files} onChange={setFiles} onError={setError} />
        <p className="hint">{editing && editing.photoIds.length ? "New photos replace the ones above. Leave this empty to keep them." : "Up to 3. Clear photos sell faster."}</p>
      </div>

      <div>
        <label className="label" htmlFor="title">What are you offering?</label>
        <input id="title" name="title" className="field" required minLength={3} maxLength={60} defaultValue={editing?.title} placeholder="Studio flat in Milimani, sleeps 2" autoComplete="off" />
      </div>

      <div>
        <label className="label" htmlFor="category">Kind</label>
        <select id="category" name="category" className="field" required defaultValue={editing?.category ?? ""}>
          <option value="" disabled>Choose</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <span className="label">Price</span>
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <div className="relative">
            <label htmlFor="price" className="sr-only">Price in shillings</label>
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[15px] font-semibold text-muted">KSh</span>
            <input id="price" name="price" className="field pl-[52px]" inputMode="numeric" pattern="[0-9, ]*" maxLength={11} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="3,500" autoComplete="off" />
          </div>
          <div>
            <label htmlFor="priceUnit" className="sr-only">What the price is for</label>
            <select id="priceUnit" name="priceUnit" className="field" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={!hasPrice}>
              {PRICE_UNITS.map((u) => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="hint">
          {hasPrice ? `Shows as KSh ${Number(price.replace(/[,\s]/g, "") || 0).toLocaleString("en-KE")}${unitPer(unit) ? ` / ${unitPer(unit)}` : ""}.` : "Leave it empty and it shows “Ask for price”."}
        </p>
        <label className={`mt-3 flex items-center gap-3 text-[15px] ${hasPrice ? "" : "opacity-45"}`}>
          <input type="checkbox" name="negotiable" value="1" defaultChecked={editing?.negotiable} disabled={!hasPrice} className="size-5 accent-[var(--accent)]" />
          The price is negotiable
        </label>
      </div>

      <div>
        <label className="label" htmlFor="location">Where <span className="font-normal text-muted">(optional)</span></label>
        <input id="location" name="location" className="field" maxLength={60} defaultValue={editing?.location ?? ""} placeholder="Milimani, Nakuru" autoComplete="off" />
      </div>

      <div>
        <label className="label" htmlFor="description">Details</label>
        <textarea id="description" name="description" className="field" rows={5} maxLength={DESCRIPTION_MAX} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Size, condition, what's included, check-in times, delivery, how to collect." />
        <p className="hint text-right">{description.length}/{DESCRIPTION_MAX}</p>
      </div>

      <div>
        <label className="label" htmlFor="phone">Your WhatsApp number</label>
        <input id="phone" name="phone" className="field" type="tel" inputMode="tel" required defaultValue={editing?.phone ?? phone} placeholder="0712 345 678" autoComplete="tel" />
        <p className="hint">Club members see this number on your item, so they can reach you.</p>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-negative/[0.07] p-4 text-[15px] font-semibold text-negative">{error}</p>}
      <button type="submit" disabled={pending} className="btn w-full">{pending ? (editing ? "Saving…" : "Putting it up…") : editing ? "Save changes" : "Put it up"}</button>
    </form>
  );
}
