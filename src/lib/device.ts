/* What kind of phone and browser this is, for notifications and installing.
   Browser-only: call from effects and event handlers. */

const ua = () => navigator.userAgent;

/** iPhone, or an iPad (which says it's a Mac, but has a touch screen). */
export const isIOS = () => /iPhone|iPad|iPod/.test(ua()) || (/Macintosh/.test(ua()) && navigator.maxTouchPoints > 1);
export const isAndroid = () => /Android/.test(ua());

/** Opened from the home screen, as an installed app. */
export const isInstalled = () => matchMedia("(display-mode: standalone)").matches || Boolean((navigator as { standalone?: boolean }).standalone);

/** Inside another app's built-in browser (WhatsApp, Facebook, Instagram, Telegram...). Those can't install the app or show
    notifications, and Google won't sign anyone in there. The join link is shared in WhatsApp, so this is common. */
export const inAppBrowser = () => inAppBrowserFor(ua());

/** The same check for a given user-agent string (tested in scripts/logic.test.ts). */
export function inAppBrowserFor(u: string): string | null {
  if (/WhatsApp/i.test(u)) return "WhatsApp";
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(u)) return "Facebook";
  if (/Instagram/.test(u)) return "Instagram";
  if (/Telegram/i.test(u)) return "Telegram";
  if (/Snapchat/i.test(u)) return "Snapchat";
  if (/LinkedInApp/i.test(u)) return "LinkedIn";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(u)) return "TikTok";
  if (/\bLine\//.test(u)) return "LINE";
  // Android apps showing pages in a plain WebView mark it "wv".
  if (/Android/.test(u) && /; wv\)/.test(u)) return "another app";
  return null;
}

/** "Chrome" or "Safari": where to open the app instead. */
export const realBrowser = () => (isIOS() ? "Safari" : "Chrome");
