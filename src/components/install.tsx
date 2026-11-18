"use client";

import { useEffect, useState } from "react";
import { IconButton } from "@/components/icon-button";
import { Icon } from "@/components/ui";
import { inAppBrowser } from "@/lib/device";

/* "Install the app". Chrome and Edge on Android (and desktop) hand the page a
   beforeinstallprompt event when the app can be installed; a tiny script in
   the root layout keeps it in window.__install, since it can fire before React
   has loaded. Safari on iPhone has no such event, so iPhones get the two steps
   instead. Nothing shows once the app is open from the home screen. */

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
declare global {
  interface Window {
    __install?: PromptEvent | null;
  }
}

type Mode = "none" | "prompt" | "ios" | "menu";

function detect(): Mode {
  // Inside WhatsApp's browser the "open in Chrome/Safari" notice comes first; these steps wouldn't work there.
  if (inAppBrowser()) return "none";
  if (matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone) return "none";
  if (window.__install) return "prompt";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "menu";
  return "none";
}

const DISMISSED = "install-dismissed";

/**
 * where="home": a card that can be put away (remembered on this phone).
 * where="profile": always there until the app is installed.
 * where="sign-in": a plain button for the prompt only, no steps.
 */
export function InstallApp({ where }: { where: "home" | "profile" | "sign-in" }) {
  const [mode, setMode] = useState<Mode>("none");
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const update = () => {
      let away = false;
      try {
        away = where === "home" && localStorage.getItem(DISMISSED) === "1";
      } catch {}
      setHidden(away);
      setMode(detect());
    };
    update();
    const installed = () => {
      window.__install = null;
      setMode("none");
    };
    window.addEventListener("install-ready", update);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("install-ready", update);
      window.removeEventListener("appinstalled", installed);
    };
  }, [where]);

  const install = async () => {
    const e = window.__install;
    if (!e) return setMode(detect());
    try {
      await e.prompt();
      const { outcome } = await e.userChoice;
      window.__install = null;
      setMode(outcome === "accepted" ? "none" : detect());
    } catch {
      // The browser already used this prompt; point to its menu instead.
      window.__install = null;
      setMode(/Android/.test(navigator.userAgent) ? "menu" : "none");
    }
  };

  const putAway = () => {
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {}
    setHidden(true);
  };

  if (mode === "none" || hidden) return null;
  // Steps are for people already using the app; the sign-in page stays short.
  if (where === "sign-in") {
    return mode === "prompt" ? (
      <button type="button" onClick={install} className="btn btn-quiet mt-4 w-full">
        Install the app
      </button>
    ) : null;
  }
  // Android without a prompt usually means it's installed already; only the profile says how.
  if (mode === "menu" && where !== "profile") return null;

  return (
    <div className={`panel flex items-start gap-4 p-5 ${where === "home" ? "mt-6" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/192" alt="" width={48} height={48} className="size-12 shrink-0 rounded-[12px]" />
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-medium">Install the app</p>
        {mode === "prompt" ? (
          <>
            <p className="mt-0.5 text-[15px] leading-snug text-muted">Open Nakuru Walk from your home screen, full screen, like any other app.</p>
            <button type="button" onClick={install} className="btn btn-sm mt-3">
              Install
            </button>
          </>
        ) : mode === "ios" ? (
          <p className="mt-0.5 text-[15px] leading-snug text-muted">
            In Safari, tap Share <Icon.share className="inline size-[18px] -translate-y-0.5" aria-label="the share button" /> then{" "}
            <span className="font-medium text-ink">Add to Home Screen</span>.
          </p>
        ) : (
          <p className="mt-0.5 text-[15px] leading-snug text-muted">
            In Chrome, tap the <span className="font-medium text-ink">⋮</span> menu, then <span className="font-medium text-ink">Install app</span>. If it isn’t
            there, the app is already on your phone.
          </p>
        )}
      </div>
      {where === "home" && (
        <IconButton label="Not now" onClick={putAway} className="-mt-2 -mr-2 text-faint">
          <Icon.close className="size-5" />
        </IconButton>
      )}
    </div>
  );
}
