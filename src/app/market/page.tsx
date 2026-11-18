import Link from "next/link";
import { after } from "next/server";
import { ItemPicture } from "@/components/photo-view";
import { Empty, firstName, Icon, Page, Section, TabBar, TopBar } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { CATEGORIES, daysLeft, marketOpen, nextMarketDayText, priceText, unitPer } from "@/lib/market";
import { marketData, seenTimes, setSeen } from "@/lib/queries";

export const metadata = { title: "Market" };

const openForTesting = process.env.MARKET_ALWAYS_OPEN === "1" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.BETTER_AUTH_URL ?? "");

export default async function Market({ searchParams }: PageProps<"/market">) {
  const { me, club, admin } = await requireMember();
  const { c } = await searchParams;
  const category = CATEGORIES.find((k) => k.key === c)?.key;
  const now = new Date();
  const open = marketOpen(now) || openForTesting;
  const [{ live, mine }, seen] = await Promise.all([marketData(club.id, me.id, now), seenTimes(me.id, club.id)]);
  after(() => setSeen(me.id, club.id, "market"));
  const shown = category ? live.filter((l) => l.category === category) : live;
  const used = new Set(live.map((l) => l.category));

  return (
    <Page>
      <TopBar title="Market">
        {open && (
          <Link href="/market/new" className="btn btn-sm gap-1.5">
            <Icon.plus className="size-4" /> Sell
          </Link>
        )}
      </TopBar>

      {open ? (
        <div className="mt-3 flex items-center gap-4 rounded-[24px] bg-bloom-soft p-5 ring-1 ring-bloom/20">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-bloom text-white shadow-[0_6px_16px_-6px_rgb(217_139_28/0.8)]"><Icon.bag className="size-6" /></span>
          <div className="min-w-0">
            <p className="display text-[22px] text-bloom-deep">It’s market day</p>
            <p className="mt-1 text-[15px] leading-snug text-bloom-deep">Put your items up today, free. They stay up for a week.</p>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-[15px] text-muted">
          Members sell to members, free. New items go up on Wednesdays. Next market day: <span className="font-semibold text-ink">{nextMarketDayText(now)}</span>.
        </p>
      )}

      {used.size > 1 && (
        <nav aria-label="Kinds of item" className="swipe -mx-4 mt-5 gap-2 px-4">
          {[{ key: "", label: "Everything" }, ...CATEGORIES.filter((k) => used.has(k.key))].map((k) => {
            const on = (category ?? "") === k.key;
            return (
              <Link key={k.key} href={k.key ? `/market?c=${k.key}` : "/market"} aria-current={on ? "true" : undefined} className={`chip h-10 px-4 text-[14px] ${on ? "bg-ink text-white" : "bg-surface text-ink ring-1 ring-ink/[0.07]"}`}>
                {k.label}
              </Link>
            );
          })}
        </nav>
      )}

      {shown.length > 0 ? (
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {shown.map((l) => (
            <li key={l.id}>
              <Link href={`/market/${l.id}`} className="panel press block overflow-hidden">
                <div className="relative">
                  <ItemPicture id={l.photoIds[0]} className={l.sold ? "opacity-45 grayscale" : ""} />
                  {l.sold ? (
                    <span className="chip absolute top-2.5 left-2.5 bg-ink text-white">Sold</span>
                  ) : (
                    l.sellerId !== me.id && l.postedAt > seen.market && <span className="chip absolute top-2.5 left-2.5 bg-accent text-white shadow-card">New</span>
                  )}
                  {l.photoIds.length > 1 && <span className="chip absolute right-2.5 bottom-2.5 h-6 gap-1 bg-ink/70 px-2 text-[12px] text-white backdrop-blur"><Icon.image className="size-3.5" /> {l.photoIds.length}</span>}
                </div>
                <div className="p-3.5">
                  <p className={`display text-[19px] ${l.sold ? "text-muted line-through" : l.priceKsh == null ? "text-muted" : "text-accent-deep"}`}>{l.priceKsh == null || l.priceKsh === 0 ? priceText(l.priceKsh) : <>KSh {l.priceKsh.toLocaleString("en-KE")}{unitPer(l.priceUnit) && <span className="font-sans text-[13px] font-semibold text-muted"> / {unitPer(l.priceUnit)}</span>}</>}</p>
                  <p className="mt-1 line-clamp-2 min-h-[2.6em] text-[15px] leading-[1.3] font-semibold">{l.title}</p>
                  <p className="mt-1.5 truncate text-[13px] text-muted">{l.location || (l.sellerId === me.id ? "Yours" : firstName(l.sellerName) || "A member")}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <Empty title={category ? "Nothing of that kind this week" : "The market is empty this week"}>
            {open ? <Link href="/market/new" className="font-semibold text-accent">Put up the first item</Link> : `Items go up on market day, ${nextMarketDayText(now)}.`}
          </Empty>
        </div>
      )}

      {mine.length > 0 && (
        <Section title="Your items">
          <ul className="panel divide-y divide-line">
            {mine.map((l) => {
              const left = daysLeft(l.postedAt, now);
              return (
                <li key={l.id}>
                  <Link href={`/market/${l.id}`} className="press flex items-center gap-3.5 px-4 py-3">
                    <ItemPicture id={l.photoIds[0]} className="!w-14 shrink-0 rounded-xl [&_svg]:size-6" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold">{l.title}</span>
                      <span className="text-[14px] text-muted">{l.sold ? "Sold" : left > 0 ? `Up for ${left} more ${left === 1 ? "day" : "days"}` : "Down. Put it up again on a Wednesday"}</span>
                    </span>
                    <Icon.chevron className="size-5 shrink-0 text-faint" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <TabBar active="market" admin={admin} />
    </Page>
  );
}
