"use client";

import { useState, useTransition } from "react";
import { renewListing, setSold } from "@/app/actions";
import { Icon } from "@/components/ui";

/** The seller's own controls: sold or back on sale, and up for another week. */
export function SellerControls({ id, sold, canRenew, live }: { id: string; sold: boolean; canRenew: boolean; live: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (fn: () => Promise<{ error?: string } | undefined>) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (r?.error) setError(r.error);
    });
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={pending} onClick={() => run(() => setSold(id, !sold))} className={`btn ${sold ? "btn-quiet" : ""} gap-2`}>
          {sold ? "On sale again" : <><Icon.check className="size-5" /> Sold</>}
        </button>
        <button type="button" disabled={pending || !canRenew} onClick={() => run(() => renewListing(id))} className="btn btn-quiet gap-2">
          <Icon.refresh className="size-5" /> Up again
        </button>
      </div>
      {!canRenew && <p className="hint">{live ? "You can put it up for another week on a Wednesday." : "It’s down for now. Put it up again on a Wednesday."}</p>}
      {error && <p role="alert" className="mt-3 text-[14px] font-semibold text-negative">{error}</p>}
    </div>
  );
}
