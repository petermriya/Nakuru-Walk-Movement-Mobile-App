"use client";

import { removeReminder, saveReminder } from "@/app/actions";
import { inAppBrowser, isInstalled, isIOS } from "@/lib/device";

/* This phone's side of notifications, shared by the profile switch and the
   prompt on Today. A phone is "on" when it holds a push subscription the
   server knows about. */

/** "inapp": inside WhatsApp's (or another app's) browser. "ios": iPhone, not on the Home Screen yet.
    "ios-old": on the Home Screen, but iOS is older than 16.4, which can't do web notifications. */
export type PushState = "loading" | "unsupported" | "inapp" | "ios" | "ios-old" | "denied" | "off" | "on";

const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const bytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

// Whether the person wants notifications on this phone: "1" on, "0" turned off.
// Lets the app quietly renew a lapsed subscription without overriding an "off".
const WANTED = "push-wanted";
const remember = (v: "1" | "0") => {
  try {
    localStorage.setItem(WANTED, v);
  } catch {}
};
const wanted = () => {
  try {
    return localStorage.getItem(WANTED);
  } catch {
    return null;
  }
};

const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(key);

export async function pushState(): Promise<PushState> {
  try {
    if (inAppBrowser()) return "inapp";
    if (!supported()) return isIOS() ? (isInstalled() ? "ios-old" : "ios") : "unsupported";
    if (Notification.permission === "denied") return "denied";
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.getSubscription();
    return sub && sameKey(sub) ? "on" : "off";
  } catch {
    return "unsupported";
  }
}

/** Was this subscription made with the app's current key? One made with an old key gets nothing, silently. */
function sameKey(sub: PushSubscription) {
  const k = sub.options?.applicationServerKey;
  if (!k) return true; // the browser doesn't say; assume it's fine
  const a = new Uint8Array(k);
  const b = bytes(key);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** This phone's subscription with the current key: the one it has, or a fresh one. */
async function currentSubscription(reg: ServiceWorkerRegistration, create: boolean) {
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub)) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(key) });
  return sub;
}

/** Say what went wrong in words a member can act on. */
function failure(e: unknown): { state: PushState; error: string } {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError") return { state: "denied", error: "Notifications are blocked for Nakuru Walk on this phone." };
  if (name === "AbortError" || name === "InvalidStateError" || name === "NotSupportedError")
    return {
      state: "off",
      error: /Brave/.test(navigator.userAgent) || (navigator as { brave?: unknown }).brave
        ? "Brave has push turned off. Open Brave's settings, then Privacy, turn on “Use Google services for push messaging”, and try again. Or use Chrome."
        : "This phone’s browser couldn’t reach its notification service. Check you’re online and try again, or open Nakuru Walk in Chrome.",
    };
  return { state: "off", error: "This phone didn’t allow notifications. Try again, or open Nakuru Walk in Chrome." };
}

/** Ask the phone, then tell the server. Returns the new state, or an error to show. */
export async function turnPushOn(): Promise<{ state: PushState; error?: string }> {
  try {
    const now = await pushState();
    if (now === "inapp" || now === "ios" || now === "ios-old" || now === "unsupported") return { state: now };
    // Asked first, straight from the tap: iPhones only show the question when nothing else happens before it.
    if ((await Notification.requestPermission()) !== "granted") return { state: "denied" };
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = (await currentSubscription(reg, true))!;
    const r = await saveReminder(sub.toJSON() as Parameters<typeof saveReminder>[0]);
    if (r?.error) return { state: "off", error: r.error };
    remember("1");
    return { state: "on" };
  } catch (e) {
    return failure(e);
  }
}

export async function turnPushOff(): Promise<PushState> {
  remember("0");
  const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
  if (sub) {
    await removeReminder(sub.endpoint);
    await sub.unsubscribe();
  }
  return "off";
}

const SYNCED = "push-synced";

/** Each time the app opens (at most every 6 hours): make sure the server still
    has this phone, and renew the subscription if the phone dropped it. The
    server forgets phones whose push address stops working, and phones
    occasionally replace the address; either way notifications would stop
    without anyone noticing. Never asks for permission and never undoes an "off". */
export async function syncPush() {
  try {
    if (!supported() || inAppBrowser()) return;
    if (Notification.permission !== "granted" || wanted() === "0") return;
    const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js"));
    // Permission is granted but the address is gone, or was made with an old key: renew it, unless they turned it off.
    const sub = await currentSubscription(reg, true);
    if (!sub) return;
    const last = (() => {
      try {
        return JSON.parse(localStorage.getItem(SYNCED) ?? "null") as { endpoint: string; at: number } | null;
      } catch {
        return null;
      }
    })();
    if (last && last.endpoint === sub.endpoint && Date.now() - last.at < 6 * 3600_000) return;
    const r = await saveReminder(sub.toJSON() as Parameters<typeof saveReminder>[0]);
    if (r?.error) return;
    remember("1");
    try {
      localStorage.setItem(SYNCED, JSON.stringify({ endpoint: sub.endpoint, at: Date.now() }));
    } catch {}
  } catch {}
}
