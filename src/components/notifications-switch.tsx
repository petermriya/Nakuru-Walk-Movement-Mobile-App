"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { sendTestNotification } from "@/app/actions";
import { inAppBrowser, realBrowser } from "@/lib/device";
import { pushState, turnPushOff, turnPushOn, type PushState } from "@/lib/push-client";

function Toggle({ on, label, disabled, onClick }: { on: boolean; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-accent" : "bg-control"}`}
    >
      <span className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

/** Once a phone says no, the app can't ask again; only the phone's settings can
    undo it. Say exactly where, for the place the app is open in. */
function blockedSteps() {
  const ua = navigator.userAgent;
  const app = matchMedia("(display-mode: standalone)").matches;
  if (/SamsungBrowser/.test(ua))
    return "Notifications are blocked for this site in Samsung Internet. Tap the menu (three lines), then Settings, then Sites and downloads, then Notifications, allow Nakuru Walk, then come back.";
  if (/Android/.test(ua) && app)
    return "Notifications are off for the Nakuru Walk app. On your phone open Settings, then Apps, then Nakuru Walk, then Notifications, turn them on, then come back here.";
  if (/Android/.test(ua))
    return "Notifications are blocked for this site in Chrome. Tap the ⋮ menu, then Settings, then Site settings, then Notifications, allow Nakuru Walk, then come back. Or install the app and turn them on there.";
  if (/iPhone|iPad/.test(ua)) return "Notifications are off for Nakuru Walk. Open Settings, then Notifications, then Nakuru Walk, allow them, then come back.";
  return "Notifications are blocked for this site. Click the icon left of the address bar, allow notifications, then come back.";
}

/** One switch for this phone. It covers walk reminders and Community posts and replies. */
export function Notifications() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [testing, setTesting] = useState<"idle" | "sending" | "sent">("idle");
  const test = async () => {
    setTesting("sending");
    setNote(null);
    const r = await sendTestNotification();
    if (r?.error) {
      setNote(r.error);
      setTesting("idle");
    } else setTesting("sent");
  };

  useEffect(() => {
    let was: PushState = "loading";
    const check = async () => {
      let now = await pushState();
      // They just allowed notifications in the phone's settings: finish the job.
      if (was === "denied" && now === "off") {
        const r = await turnPushOn();
        now = r.state;
      }
      was = now;
      setState(now);
    };
    check();
    // Coming back from Settings, the page doesn't reload; look again.
    const onShow = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onShow);
    let perm: PermissionStatus | undefined;
    navigator.permissions
      ?.query({ name: "notifications" })
      .then((p) => {
        perm = p;
        p.onchange = check;
      })
      .catch(() => {});
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      if (perm) perm.onchange = null;
    };
  }, []);

  const flip = async () => {
    setBusy(true);
    setNote(null);
    try {
      if (state === "on") setState(await turnPushOff());
      else {
        const r = await turnPushOn();
        setState(r.state);
        if (r.error) setNote(r.error);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="flex items-center gap-4">
        <p className="min-w-0 flex-1 text-[15px] text-muted">
          {state === "on"
            ? "On. You’ll hear when someone posts in Community or replies to you, and get walk reminders: 7 pm the evening before, and about two hours before the start if you’re coming."
            : state === "inapp"
              ? `You’re in ${inAppBrowser()}’s browser, which can’t show notifications. Open Nakuru Walk in ${realBrowser()} (tap ⋮ or ··· and choose “Open in ${realBrowser()}”), then turn this on there.`
              : state === "ios"
                ? "On iPhone, add Nakuru Walk to your Home Screen first: in Safari, tap Share, then Add to Home Screen. Open it from there and turn this on."
                : state === "ios-old"
                  ? "This iPhone needs iOS 16.4 or newer for notifications. Update it in Settings, then General, then Software Update, and come back."
                  : state === "denied"
                    ? blockedSteps()
                    : state === "unsupported"
                      ? `This browser can’t show notifications. Open Nakuru Walk in ${realBrowser()} instead.`
                      : state === "loading"
                        ? " "
                        : "Hear when someone posts in Community or replies to you, and get a reminder before each walk."}
        </p>
        {(state === "off" || state === "on") && <Toggle on={state === "on"} label="Notifications on this phone" disabled={busy} onClick={flip} />}
      </div>

      {state === "on" && (
        <button type="button" onClick={test} disabled={testing === "sending"} className="btn btn-quiet btn-sm mt-4 gap-1.5">
          <Icon.bell className="size-4" /> {testing === "sending" ? "Sending…" : testing === "sent" ? "Sent. It should arrive in a few seconds" : "Send me a test"}
        </button>
      )}
      {note && <p role="status" className="mt-2 text-[14px] text-muted">{note}</p>}
    </div>
  );
}
