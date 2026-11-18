"use client";

import { useState, useTransition } from "react";
import { startChat } from "@/app/actions";
import { Icon } from "@/components/ui";

/** "Message": opens the private chat with this member, starting it if needed. */
export function MessageButton({ personId, label = "Message", iconOnly = false, className = "btn btn-quiet btn-sm gap-1.5" }: { personId: string; label?: string; iconOnly?: boolean; className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label={iconOnly ? label : undefined}
        className={className}
        onClick={() =>
          start(async () => {
            const r = await startChat(personId);
            // An icon on its own has no room for a message under it, so say it out loud.
            if (r?.error) {
              if (iconOnly) alert(r.error);
              else setError(r.error);
            }
          })
        }
      >
        <Icon.messages className={iconOnly ? "size-[22px]" : "size-[18px]"} />
        {!iconOnly && (pending ? "Opening…" : label)}
      </button>
      {error && <p role="alert" className={iconOnly ? "sr-only" : "mt-2 text-[13px] font-semibold text-negative"}>{error}</p>}
    </>
  );
}
