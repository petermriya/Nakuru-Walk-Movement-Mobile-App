"use client";

import { useEffect } from "react";
import { syncPush } from "@/lib/push-client";

/** Mounted on signed-in screens: keeps this phone's notifications working. */
export function PushSync() {
  useEffect(() => {
    syncPush();
    const again = () => document.visibilityState === "visible" && syncPush();
    document.addEventListener("visibilitychange", again);
    return () => document.removeEventListener("visibilitychange", again);
  }, []);
  return null;
}
