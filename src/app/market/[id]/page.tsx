import Link from "next/link";
import { deleteListing } from "@/app/actions";
import { RemoveButton } from "@/components/feed-parts";
import { ItemPicture, PhotoSwipe } from "@/components/photo-view";
import { Avatar, BackLink, Icon, Page } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { categoryLabel, daysLeft, marketOpen, priceText, unitPer, whatsappLink, whatsappNumber } from "@/lib/market";
import { MessageButton } from "@/components/message-button";
import { listingData } from "@/lib/queries";
import { SellerControls } from "./parts";

const openForTesting = process.env.MARKET_ALWAYS_OPEN === "1" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.BETTER_AUTH_URL ?? "");

export async function generateMetadata({ params }: PageProps<"/market/[id]">) {
  const { id } = await params;
  const { club } = await requireMember();
  return { title: (await listingData(id, club.id)).title };
}

export default async function ListingPage({ params, searchParams }: PageProps<"/market/[id]">) {
  const { id } = await params;
  const { posted, saved } = await searchParams;
  const { me, club, admin } = await requireMember();
  const l = await listingData(id, club.id);
  const now = new Date();
  const mine = l.sellerId === me.id;
  const left = daysLeft(l.postedAt, now);
  const seller = l.sellerName.trim() || "A member";
  const hello = `Hi ${seller.split(/\s+/)[0]}, I saw “${l.title}” (${priceText(l.priceKsh, l.priceUnit)}) on the Nakuru Walk market. Is it still available?`;

  return (
    <Page className={mine ? "" : "!pb-36"}>
      <div className="flex items-center justify-between">
        <BackLink href="/market" label="Market" />
        {(mine || admin) && <RemoveButton action={deleteListing.bind(null, l.id)} label="Take down" />}
      </div>

      {saved && (
        <p role="status" className="rise mt-2 mb-3 flex items-center gap-2.5 rounded-2xl bg-accent-soft p-4 text-[15px] font-semibold text-accent-deep">
          <Icon.check className="size-5 shrink-0" /> Saved.
        </p>
      )}

      {posted && (
        <p role="status" className="rise mt-2 mb-3 flex items-center gap-2.5 rounded-2xl bg-accent-soft p-4 text-[15px] font-semibold text-accent-deep">
          <Icon.check className="size-5 shrink-0" /> Your item is up. It stays on the market for a week.
        </p>
      )}

      <div className="mt-2">
        {l.photoIds.length ? <PhotoSwipe ids={l.photoIds} alt={l.title} /> : <ItemPicture className="!aspect-[16/9] rounded-[24px]" />}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {l.sold && <span className="chip bg-ink text-white">Sold</span>}
        <span className="chip bg-surface text-ink ring-1 ring-ink/[0.07]">{categoryLabel(l.category)}</span>
        {!l.sold && <span className="text-[13px] text-muted">{left > 0 ? `Up for ${left} more ${left === 1 ? "day" : "days"}` : "No longer on the market"}</span>}
      </div>
      <h1 className="mt-3 text-[24px] leading-[1.2] font-bold tracking-[-0.01em] text-balance">{l.title}</h1>
      <p className={`display mt-2 text-[38px] ${l.sold ? "text-muted line-through" : "text-accent-deep"}`}>{l.priceKsh == null || l.priceKsh === 0 ? priceText(l.priceKsh) : <>KSh {l.priceKsh.toLocaleString("en-KE")}{unitPer(l.priceUnit) && <span className="font-sans text-[18px] font-semibold text-muted"> / {unitPer(l.priceUnit)}</span>}</>}</p>
      {(l.negotiable || l.location) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {l.negotiable && !l.sold && <span className="chip bg-bloom-soft text-bloom-deep">Negotiable</span>}
          {l.location && <span className="flex items-center gap-1.5 text-[15px] text-muted"><Icon.pin className="size-4 text-accent" /> {l.location}</span>}
        </div>
      )}

      {l.description && <p className="mt-4 text-[16px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{l.description}</p>}

      <Link href={`/people/${l.sellerId}`} className="panel press mt-6 flex items-center gap-3 p-4">
        <Avatar id={l.sellerId} name={seller} image={l.sellerImage} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold">{mine ? "You" : seller}</p>
          <p className="text-[14px] text-muted">{mine ? `Buyers reach you on ${l.phone}` : "See their profile"}</p>
        </div>
        <Icon.chevron className="size-5 shrink-0 text-faint" />
      </Link>

      {mine ? (
        <div className="mt-5">
          <Link href={`/market/${l.id}/edit`} className="btn btn-quiet mb-3 w-full gap-2"><Icon.edit className="size-5" /> Change details</Link>
          <SellerControls id={l.id} sold={l.sold} live={left > 0} canRenew={marketOpen(now) || openForTesting} />
        </div>
      ) : (
        <p className="mt-4 px-1 text-[13px] leading-snug text-muted">You deal with the seller directly. The club doesn’t take payments or check items, so meet somewhere public and see the item before you pay.</p>
      )}

      {!mine && !l.sold && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className="mx-auto flex max-w-[536px] gap-2 rounded-[30px] bg-surface/92 p-2 shadow-lift ring-1 ring-ink/[0.06] backdrop-blur-xl">
            <a href={whatsappLink(l.phone, hello)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp flex-1 gap-2">
              <Icon.whatsapp className="size-[22px]" /> WhatsApp {seller.split(/\s+/)[0]}
            </a>
            <MessageButton personId={l.sellerId} iconOnly label={`Message ${seller.split(/\s+/)[0]} in the app`} className="btn btn-quiet w-[52px] p-0" />
            <a href={`tel:+${whatsappNumber(l.phone)}`} aria-label={`Call ${seller}`} className="btn btn-quiet w-[52px] p-0">
              <Icon.call className="size-[22px]" />
            </a>
          </div>
        </div>
      )}
    </Page>
  );
}
