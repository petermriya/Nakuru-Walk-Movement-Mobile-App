"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Updates the "checked in so far" number every 10 seconds while the code is on screen, and keeps the screen awake where the phone allows. */
export function KeepFresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), 10_000);
    let lock: { release: () => Promise<void> } | undefined;
    (navigator as { wakeLock?: { request: (t: "screen") => Promise<typeof lock> } }).wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      clearInterval(t);
      lock?.release().catch(() => {});
    };
  }, [router]);
  return null;
}
