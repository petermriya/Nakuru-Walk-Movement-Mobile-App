import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { user } from "@/db/schema";
import { BackLink, Page } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { marketOpen } from "@/lib/market";
import { ListingForm } from "./form";

export const metadata = { title: "Sell something" };

const openForTesting = process.env.MARKET_ALWAYS_OPEN === "1" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.BETTER_AUTH_URL ?? "");

export default async function NewListing() {
  const { me } = await requireMember();
  if (!marketOpen(new Date()) && !openForTesting) redirect("/market");
  const [profile] = await db.select({ phone: user.phone }).from(user).where(eq(user.id, me.id));

  return (
    <Page>
      <BackLink href="/market" label="Market" />
      <h1 className="display mt-3 text-[34px]">Sell something</h1>
      <p className="mt-2 text-[15px] text-muted">Free for members. Your item stays up for a week, and buyers reach you on WhatsApp.</p>
      <div className="mt-6">
        <ListingForm phone={profile?.phone ?? ""} />
      </div>
    </Page>
  );
}
