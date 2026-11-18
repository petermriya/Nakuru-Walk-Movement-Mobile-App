"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveProfile } from "@/app/actions";
import { shrink } from "@/components/photo-picker";
import { Avatar, Icon } from "@/components/ui";
import { BIO_MAX } from "@/lib/market";

export function EditProfileForm({ id, name, phone, bio, image }: { id: string; name: string; phone: string; bio: string; image: string | null }) {
  const router = useRouter();
  const [n, setN] = useState(name);
  const [p, setP] = useState(phone);
  const [b, setB] = useState(bio);
  const [photo, setPhoto] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  const shown = preview ?? (removed ? null : image);

  async function pick(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    try {
      setPhoto(await shrink(f));
      setRemoved(false);
      setError("");
    } catch {
      setError("That photo couldn’t be read. Try another one.");
    }
    if (input.current) input.current.value = "";
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError("");
      const form = new FormData();
      form.set("name", n);
      form.set("phone", p);
      form.set("bio", b);
      if (photo) form.append("photos", photo);
      if (removed && !photo) form.set("removePhoto", "1");
      const r = await saveProfile(null, form);
      if (r?.error) return setError(r.error);
      router.push(`/people/${id}`);
    });
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex items-center gap-4">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="Your profile photo" className="size-20 shrink-0 rounded-full object-cover ring-1 ring-ink/10" referrerPolicy="no-referrer" />
        ) : (
          <Avatar id={id} name={n || "?"} size={80} />
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} className="btn btn-quiet btn-sm gap-1.5">
            <Icon.image className="size-4" /> {shown ? "Change photo" : "Add a photo"}
          </button>
          {shown && (
            <button type="button" onClick={() => { setPhoto(null); setRemoved(true); }} className="btn btn-quiet btn-sm">Remove</button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files)} />
      </div>

      <div>
        <label htmlFor="name" className="label">Your name</label>
        <input id="name" className="field" value={n} onChange={(e) => setN(e.target.value)} required maxLength={60} autoComplete="name" />
      </div>
      <div>
        <label htmlFor="bio" className="label">About you <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="bio" className="field" rows={3} value={b} onChange={(e) => setB(e.target.value.slice(0, BIO_MAX))} maxLength={BIO_MAX} placeholder="Walking with the club since 2024. Slow and steady up Menengai." />
        <p className="hint flex justify-between"><span>Club members see this on your profile.</span><span>{b.length}/{BIO_MAX}</span></p>
      </div>
      <div>
        <label htmlFor="phone" className="label">Mobile number <span className="font-normal text-muted">(optional)</span></label>
        <input id="phone" className="field" type="tel" inputMode="tel" value={p} onChange={(e) => setP(e.target.value)} placeholder="0712 345 678" autoComplete="tel" />
        <p className="hint">Only the club admins see it, so they can reach you about a walk.</p>
      </div>
      {error && <p role="alert" className="rounded-2xl bg-negative/[0.07] p-4 text-[15px] font-semibold text-negative">{error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
