"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/** Signs out, and first stops this phone's notifications, so a shared phone doesn't get someone else's reminders. */
export function SignOut({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const reg = await navigator.serviceWorker?.getRegistration("/");
          const sub = await reg?.pushManager.getSubscription();
          if (sub) {
            const { removeReminder } = await import("@/app/actions");
            await removeReminder(sub.endpoint);
            await sub.unsubscribe();
          }
        } catch {}
        await authClient.signOut();
        window.location.replace("/sign-in"); // a full reload, so nothing from this account stays on screen
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
