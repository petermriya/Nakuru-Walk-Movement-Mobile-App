"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { inAppBrowser, isAndroid, realBrowser } from "@/lib/device";

/** Shown inside WhatsApp's (or another app's) built-in browser, where Google sign-in, installing and notifications
    don't work. On Android one tap opens the same page in Chrome; on iPhone it says where Safari's button is,
    and there's a Copy link either way. */
export function OpenInBrowser({ className = "" }: { className?: string }) {
  const [app, setApp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the browser once, after hydration
    setApp(inAppBrowser());
  }, []);
  if (!app) return null;

  const here = typeof window === "undefined" ? "" : window.location.href;
  const browser = realBrowser();
  // Android: an intent link hands the page to Chrome, leaving the in-app browser behind.
  const chrome = here ? `intent://${here.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(here)};end` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(here);
      setCopied(true);
    } catch {
      window.prompt("Copy this link", here);
    }
  };

  return (
    <div role="alert" className={`rise rounded-[24px] bg-bloom-soft p-5 ring-1 ring-bloom/25 ${className}`}>
      <p className="flex items-center gap-2 text-[16px] font-bold text-bloom-deep"><Icon.share className="size-5" /> Open Nakuru Walk in {browser}</p>
      <p className="mt-1.5 text-[15px] leading-snug text-bloom-deep">
        You’re in {app}’s browser. Signing in with Google, installing the app and notifications only work in {browser}.
        {isAndroid() ? "" : ` Tap the ··· or Share button and choose “Open in ${browser}”.`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {isAndroid() && chrome && (
          <a href={chrome} className="btn btn-sm">Open in Chrome</a>
        )}
        <button type="button" onClick={copy} className="btn btn-sm btn-quiet gap-1.5">
          <Icon.copy className="size-4" /> {copied ? `Copied. Paste it in ${browser}` : "Copy link"}
        </button>
      </div>
    </div>
  );
}
