import Link from "next/link";
import type { ReactNode, SVGProps } from "react";

/* ───────────── People ───────────── */

function hueOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return Math.round((h % 360) * 137.508) % 360;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function Avatar({ id, name, image, size = 40 }: { id: string; name: string; image?: string | null; size?: number }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} referrerPolicy="no-referrer" />;
  }
  const hue = hueOf(id);
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `oklch(0.93 0.04 ${hue})`, color: `oklch(0.38 0.07 ${hue})` }}
    >
      {initials(name)}
    </span>
  );
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/* ───────────── Layout ───────────── */

export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto w-full max-w-[560px] px-4 pt-[max(env(safe-area-inset-top),12px)] pb-32 ${className}`}>{children}</main>;
}

/** The title row at the top of a tab screen. */
export function TopBar({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex min-h-14 items-center gap-3 pt-2">
      <h1 className="display min-w-0 flex-1 truncate text-[30px]">{title}</h1>
      {children}
    </header>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="-ml-2 inline-flex h-11 items-center gap-1 rounded-full pr-3 pl-2 text-[15px] text-muted hover:text-ink">
      <Icon.back className="size-5" />
      {label}
    </Link>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel px-6 py-10 text-center">
      <p className="text-[17px] font-semibold">{title}</p>
      {children && <div className="mt-2 text-[15px] text-muted">{children}</div>}
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mt-9">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[17px] font-bold tracking-[-0.01em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ───────────── Icons (outline, 1.7 stroke) ───────────── */

const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

type I = (p: SVGProps<SVGSVGElement>) => ReactNode;

export const Icon: Record<string, I> = {
  check: (p) => <svg {...base(p)} strokeWidth={2.2}><path d="M5 12.5l4.2 4.2L19 7" /></svg>,
  close: (p) => <svg {...base(p)} strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  plus: (p) => <svg {...base(p)} strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>,
  back: (p) => <svg {...base(p)}><path d="M15 5l-7 7 7 7" /></svg>,
  chevron: (p) => <svg {...base(p)}><path d="M9 5l7 7-7 7" /></svg>,
  home: (p) => <svg {...base(p)}><path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></svg>,
  /** Two footprints: your record. */
  steps: (p) => (
    <svg {...base(p)}>
      <path d="M8.2 3.5c1.6 0 2.6 1.9 2.6 4.3 0 1.9-.8 3.4-2.3 3.4S5.7 9.9 5.7 8c0-2.5 1-4.5 2.5-4.5zM6 13.6l4.6-.6c.3 1.9-.2 3.6-2.1 3.8-1.6.2-2.4-1.2-2.5-3.2z" />
      <path d="M15.8 7.5c1.5 0 2.5 2 2.5 4.5 0 1.9-1.3 3.2-2.8 3.2s-2.3-1.5-2.3-3.4c0-2.4 1-4.3 2.6-4.3zM13.4 17l4.6.6c-.1 2-.9 3.4-2.5 3.2-1.9-.2-2.4-1.9-2.1-3.8z" />
    </svg>
  ),
  people: (p) => <svg {...base(p)}><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c.8-3.2 3-4.8 5.5-4.8s4.7 1.6 5.5 4.8" /><path d="M15.5 5.6a3 3 0 010 5.8M17.5 14.6c1.5.6 2.6 2 3 4.4" /></svg>,
  pin: (p) => <svg {...base(p)}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>,
  clock: (p) => <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
  route: (p) => <svg {...base(p)}><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h7.5a3.5 3.5 0 000-7h-7a3.5 3.5 0 010-7H16" /></svg>,
  shirt: (p) => <svg {...base(p)}><path d="M8.5 4L4 6.5l1.8 3.8L8 9.3V20h8V9.3l2.2 1 1.8-3.8L15.5 4c-.6 1.4-1.9 2.2-3.5 2.2S9.1 5.4 8.5 4z" /></svg>,
  ribbon: (p) => <svg {...base(p)}><path d="M12 3.5c-2 0-3.3 1.6-3.3 3.6 0 2.6 2.4 5.4 3.3 6.4.9-1 3.3-3.8 3.3-6.4 0-2-1.3-3.6-3.3-3.6z" /><path d="M10.2 11.6L6 20l3-1 1.3 2.6 2.6-6.1M13.8 11.6L18 20l-3-1-1.3 2.6-1.1-2.6" /></svg>,
  qr: (p) => <svg {...base(p)}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19.5h1M19.5 14v1" /></svg>,
  list: (p) => <svg {...base(p)}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4.5 6.2l.8.8 1.5-1.6M4.5 12.2l.8.8 1.5-1.6M4.5 18.2l.8.8 1.5-1.6" /></svg>,
  flag: (p) => <svg {...base(p)}><path d="M5.5 21V4.5M5.5 4.5h11l-2.2 4 2.2 4h-11" /></svg>,
  copy: (p) => <svg {...base(p)}><rect x="8" y="8" width="11.5" height="11.5" rx="2.5" /><path d="M16 8V6.5A2.5 2.5 0 0013.5 4h-7A2.5 2.5 0 004 6.5v7A2.5 2.5 0 006.5 16H8" /></svg>,
  edit: (p) => <svg {...base(p)}><path d="M4.5 19.5l1-4L15 6l3 3-9.5 9.5-4 1zM13 8l3 3" /></svg>,
  phone: (p) => <svg {...base(p)}><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 17.5h2" /></svg>,
  share: (p) => <svg {...base(p)}><path d="M12 15V4M8 8l4-4 4 4" /><path d="M6 12v6.5A1.5 1.5 0 007.5 20h9a1.5 1.5 0 001.5-1.5V12" /></svg>,
  calendar: (p) => <svg {...base(p)}><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></svg>,
  chat: (p) => <svg {...base(p)}><path d="M20 11.5c0 4-3.6 7-8 7-1 0-2-.15-2.9-.45L5 19.5l1-3.4C4.75 14.9 4 13.3 4 11.5c0-4 3.6-7 8-7s8 3 8 7z" /></svg>,
  user: (p) => <svg {...base(p)}><circle cx="12" cy="8.5" r="3.6" /><path d="M5 19.5c1-3.6 3.8-5.5 7-5.5s6 1.9 7 5.5" /></svg>,
  messages: (p) => <svg {...base(p)}><path d="M15.5 9.5c0 3-2.7 5.3-6 5.3-.7 0-1.4-.1-2-.3L4 15.5l.8-2.6C4 12 3.5 10.8 3.5 9.5c0-3 2.7-5.3 6-5.3s6 2.4 6 5.3z" /><path d="M18 9.2c1.6.9 2.5 2.4 2.5 4 0 1.1-.4 2.2-1.1 3l.6 2.3-2.6-.8c-.6.2-1.3.3-2 .3-1.6 0-3-.5-4-1.4" /></svg>,
  more: (p) => <svg {...base(p)} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>,
  block: (p) => <svg {...base(p)}><circle cx="12" cy="12" r="8" /><path d="M6.4 6.4l11.2 11.2" /></svg>,
  userRemove: (p) => <svg {...base(p)}><circle cx="10" cy="8" r="3.5" /><path d="M3.5 19.5c.6-3.400 3.300-5.500 6.500-5.500 1.600 0 3 .5 4.100 1.400M16 17h5" /></svg>,
  bell: (p) => <svg {...base(p)}><path d="M6.5 16.5V11a5.5 5.5 0 0111 0v5.5l1.5 1.5H5z" /><path d="M10 20.5a2.2 2.2 0 004 0" /></svg>,
  bag: (p) => <svg {...base(p)}><path d="M5.5 8.5h13l-.9 10.2a1.5 1.5 0 01-1.5 1.3H7.9a1.5 1.5 0 01-1.5-1.3z" /><path d="M9 8.5V7a3 3 0 016 0v1.5" /></svg>,
  heart: (p) => <svg {...base(p)}><path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0112 7.6a3.9 3.9 0 017 2.5c0 5.1-7 9.4-7 9.400z" /></svg>,
  image: (p) => <svg {...base(p)}><rect x="4" y="5" width="16" height="14" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M5 17l4.5-4.2 3.2 2.8 2.6-2.3L20 17" /></svg>,
  trash: (p) => <svg {...base(p)}><path d="M5 7h14M10 7V5h4v2M7 7l.8 11.2a1.5 1.5 0 001.5 1.300h5.400a1.5 1.5 0 001.5-1.300L17 7" /></svg>,
  send: (p) => <svg {...base(p)}><path d="M20 4L10.5 13.500M20 4l-6 16-3.5-6.500L4 10z" /></svg>,
  call: (p) => <svg {...base(p)}><path d="M6.5 4.500h3l1.3 3.6-1.9 1.400a11 11 0 005.6 5.600l1.4-1.9 3.6 1.300v3a1.5 1.5 0 01-1.6 1.500C10.9 18.5 5.5 13.1 5 6.100a1.5 1.5 0 011.5-1.600z" /></svg>,
  tag: (p) => <svg {...base(p)}><path d="M4.5 12.300V5.500a1 1 0 011-1h6.800a1 1 0 01.7.300l6.5 6.500a1 1 0 010 1.400l-6.8 6.800a1 1 0 01-1.4 0l-6.5-6.500a1 1 0 01-.300-.700z" /><circle cx="8.5" cy="8.5" r="1.3" /></svg>,
  refresh: (p) => <svg {...base(p)}><path d="M19 12a7 7 0 01-12.3 4.600M5 12a7 7 0 0112.3-4.6" /><path d="M17.5 4v3.500H14M6.5 20v-3.500H10" /></svg>,
  whatsapp: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M12 3a9 9 0 00-7.7 13.600L3 21l4.5-1.200A9 9 0 1012 3zm0 1.700a7.3 7.3 0 11-3.8 13.500l-.300-.200-2.5.700.7-2.4-.200-.300A7.3 7.3 0 0112 4.700zM8.9 7.800c-.200 0-.400 0-.600.3-.200.2-.900.8-.900 2s.900 2.4 1 2.500c.100.2 1.7 2.7 4.2 3.7 2.1.800 2.5.700 3 .600.5 0 1.5-.600 1.7-1.2.200-.600.2-1.1.100-1.2 0-.100-.200-.200-.500-.300l-1.7-.800c-.200-.100-.400-.100-.600.100l-.800 1c-.100.2-.300.2-.500.1-.300-.100-1.1-.400-2-1.3-.800-.700-1.3-1.5-1.4-1.8-.100-.200 0-.400.1-.500l.400-.400.2-.400c.100-.200 0-.300 0-.400l-.800-1.800c-.200-.400-.300-.400-.500-.400z" />
    </svg>
  ),
  google: (p) => (
    <svg viewBox="0 0 24 24" aria-hidden {...p}>
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 01-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0012 23z" />
      <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 010-4.3V7.1H2.1a11 11 0 000 9.9z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 002.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  ),
};

/* ───────────── Tabs ───────────── */

export { TabBar, type Tab } from "@/components/tab-bar";
