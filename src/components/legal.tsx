import Link from "next/link";
import type { ReactNode } from "react";
import { Page } from "@/components/ui";

/** Where people can reach the club admins. Set CONTACT_EMAIL. */
export const contactEmail = process.env.CONTACT_EMAIL ?? "";

export function Contact() {
  return contactEmail ? <a href={`mailto:${contactEmail}`} className="underline">{contactEmail}</a> : <>the club admins in your WhatsApp group</>;
}

export const UPDATED = "17 November 2026";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Page className="pt-8">
      <Link href="/" className="text-[15px] text-muted hover:text-ink">Nakuru Walk</Link>
      <h1 className="display mt-6 text-[40px]">{title}</h1>
      <p className="mt-3 text-[14px] text-muted">Last updated {UPDATED}</p>
      <div className="mt-8 space-y-8 text-[16px] leading-relaxed">{children}</div>
      <p className="mt-14 flex flex-wrap gap-x-5 text-[14px] text-muted">
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <Link href="/delete-account" className="hover:text-ink">Delete account</Link>
      </p>
    </Page>
  );
}

export function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[18px] font-bold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
