"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { badgeText } from "@/lib/market";

export type Tab = "walks" | "community" | "market" | "me" | "club";
type Counts = { community: number; market: number; activity: number; chats: number };

/** The member's unread counts, kept fresh: on each screen, when the app comes back to the front, and once a minute.
    The total also goes on the home-screen icon, where the phone supports it. */
export function useCounts() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const path = usePathname();
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/counts", { cache: "no-store" });
        if (!r.ok || !alive) return;
        const c: Counts = await r.json();
        setCounts(c);
        const total = c.community + c.market + c.activity + (c.chats ?? 0);
        const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
        if (total > 0) await nav.setAppBadge?.(total).catch(() => {});
        else await nav.clearAppBadge?.().catch(() => {});
      } catch {}
    };
    load();
    document.addEventListener("visibilitychange", load);
    const every = setInterval(load, 60_000);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", load);
      clearInterval(every);
    };
  }, [path]);
  return counts;
}

/** A small count on a tab or button. */
export function Badge({ n, className = "" }: { n: number; className?: string }) {
  const t = badgeText(n);
  if (!t) return null;
  return (
    <span className={`pop pointer-events-none flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-negative px-1 text-[11px] leading-none font-bold text-white ring-2 ring-surface ${className}`} aria-hidden>
      {t}
    </span>
  );
}

/** A floating dock, so the screen's ground shows around it. */
export function TabBar({ active, admin }: { active: Tab; admin: boolean }) {
  const counts = useCounts();
  const tabs = [
    { key: "walks", href: "/home", label: "Walks", icon: Icon.home, n: 0 },
    // On Community, replies and likes on your posts count too (behind its bell), and unread messages (behind its chat button).
    { key: "community", href: "/community", label: "Community", icon: Icon.chat, n: (counts?.community ?? 0) + (counts?.activity ?? 0) + (counts?.chats ?? 0) },
    { key: "market", href: "/market", label: "Market", icon: Icon.bag, n: counts?.market ?? 0 },
    { key: "me", href: "/me", label: "Profile", icon: Icon.user, n: 0 },
    ...(admin ? [{ key: "club", href: "/club", label: "Club", icon: Icon.people, n: 0 }] : []),
  ] as const;
  return (
    <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="pointer-events-auto mx-auto flex max-w-[536px] rounded-[26px] bg-surface/88 p-1.5 shadow-lift ring-1 ring-ink/[0.06] backdrop-blur-xl">
        {tabs.map((t) => {
          const on = t.key === active;
          const I = t.icon;
          // The tab you're on doesn't need a count: you're looking at it.
          const n = on ? 0 : t.n;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={on ? "page" : undefined}
              aria-label={n ? `${t.label}, ${n} new` : undefined}
              className={`press flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[11px] font-semibold transition-colors ${on ? "bg-accent-soft text-accent-deep" : "text-faint"}`}
            >
              <span className="relative">
                <I className="size-[22px]" />
                <Badge n={n} className="absolute -top-1.5 left-[14px]" />
              </span>
              <span className="max-w-full truncate px-1">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
