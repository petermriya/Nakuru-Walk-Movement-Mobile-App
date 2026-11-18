"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui";

/** Shrinks a phone photo before it's sent: longest side 1400px, JPEG, well under 1 MB. */
export async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  for (const [side, quality] of [[1400, 0.82], [1100, 0.74], [900, 0.62]] as const) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= 800_000) return new File([blob], "photo.jpg", { type: "image/jpeg" });
  }
  throw new Error("too large");
}

/** Add up to `max` photos, see them, take one off again. */
export function PhotoPicker({ files, onChange, max = 3, onError }: { files: File[]; onChange: (f: File[]) => void; max?: number; onError?: (m: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= max) break;
      try {
        next.push(await shrink(f));
      } catch {
        onError?.("That photo couldn’t be read. Try another one.");
      }
    }
    onChange(next);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {urls.map((u, i) => (
        <div key={u} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt={`Photo ${i + 1}`} className="size-[72px] rounded-2xl object-cover ring-1 ring-ink/10" />
          <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={`Take off photo ${i + 1}`} className="hit absolute -top-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full bg-ink text-white shadow-card">
            <Icon.close className="size-3.5" />
          </button>
        </div>
      ))}
      {files.length < max && (
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="press flex h-[72px] items-center gap-2 rounded-2xl border border-dashed border-control px-4 text-[14px] font-semibold text-muted disabled:opacity-50">
          <Icon.image className="size-5" /> {busy ? "Adding…" : files.length ? "Add another" : "Add photos"}
        </button>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
    </div>
  );
}
