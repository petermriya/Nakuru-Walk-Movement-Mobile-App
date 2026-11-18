"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { isAndroid, isInstalled, isIOS } from "@/lib/device";
import { pushState, turnPushOn, type PushState } from "@/lib/push-client";

const HIDE = "community-nudge-hidden";

/** On the Community screen, for phones without notifications: one tap to hear about new posts.
    Hidden once notifications are on, or for good after "Not now". */
export function NotifyNudge({ onlyWhenInstalled = false }: { onlyWhenInstalled?: boolean }) {
  const [state, setState] = useState<PushState | "hidden">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let hidden = false;
    try {
      hidden = localStorage.getItem(HIDE) === "1";
    } catch {}
    // Where the install card already shows, it goes first; this one waits until the app is installed.
    const waiting = onlyWhenInstalled && !isInstalled() && (isIOS() || isAndroid());
    pushState().then((s) => setState(hidden || waiting ? "hidden" : s));
  }, [onlyWhenInstalled]);

  // In another app's browser the open-in-browser notice says what to do; nothing to add here.
  if (state !== "off" && state !== "ios" && state !== "ios-old" && state !== "denied") return null;

  const hide = () => {
    try {
      localStorage.setItem(HIDE, "1");
    } catch {}
    setState("hidden");
  };
  const turnOn = async () => {
    setBusy(true);
    setError("");
    const r = await turnPushOn();
    setBusy(false);
    if (r.error) setError(r.error);
    setState(r.state);
  };

  return (
    <div className="rise mb-4 flex items-start gap-3.5 rounded-[24px] bg-accent-soft p-4 ring-1 ring-accent/15">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Icon.chat className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-accent-deep">Know when someone posts</p>
        <p className="mt-0.5 text-[14px] leading-snug text-accent-deep/80">
          {state === "ios"
            ? "On iPhone, add Nakuru Walk to your Home Screen first: in Safari, tap Share, then Add to Home Screen. Open it from there and turn notifications on."
            : state === "ios-old"
              ? "This iPhone needs iOS 16.4 or newer for notifications. Update it in Settings, then General, then Software Update."
              : state === "denied"
                ? "Notifications are blocked for Nakuru Walk. Allow them in your phone’s settings for this app or site, then come back."
                : "Get a notification for new posts, replies to you, and walk reminders."}
        </p>
        {error && <p role="alert" className="mt-1.5 text-[14px] font-semibold text-negative">{error}</p>}
        <div className="mt-3 flex gap-2">
          {state === "off" && (
            <button type="button" onClick={turnOn} disabled={busy} className="btn btn-sm">{busy ? "Turning on…" : "Turn on"}</button>
          )}
          <button type="button" onClick={hide} className="btn btn-sm btn-quiet">Not now</button>
        </div>
      </div>
    </div>
  );
}
