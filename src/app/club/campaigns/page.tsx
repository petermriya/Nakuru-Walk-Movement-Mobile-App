import Link from "next/link";
import { BackLink, Icon, Page } from "@/components/ui";
import { requireAdmin } from "@/lib/club";
import { campaignsList } from "@/lib/queries";
import { addDays, utcToZoned } from "@/lib/time";

type Campaign = Awaited<ReturnType<typeof campaignsList>>[number];

export const metadata = { title: "Special days" };

const when = (a: string, b: string) => {
  const f = (d: string, y = false) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(y ? { year: "numeric" } : {}), timeZone: "UTC" });
  return a === b ? f(a, true) : `${f(a)} to ${f(b, true)}`;
};

function List({ items }: { items: Campaign[] }) {
  return (
    <ul className="panel divide-y divide-line">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={`/club/campaigns/${c.id}`} className="press flex items-center gap-3 px-5 py-3.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold">{c.name}</span>
              <span className="text-[14px] text-muted">{when(c.startsOn, c.endsOn)}</span>
            </span>
            <Icon.chevron className="size-5 shrink-0 text-faint" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function Campaigns() {
  const { club } = await requireAdmin();
  const today = utcToZoned(new Date()).day;
  const all = await campaignsList(club.id);
  const ahead = all.filter((c) => c.endsOn >= today);
  const past = all.filter((c) => c.endsOn < today && c.endsOn >= addDays(today, -365));
  return (
    <Page>
      <BackLink href="/club" label="Club" />
      <div className="mt-2 flex items-center justify-between">
        <h1 className="display text-[30px]">Special days</h1>
        <Link href="/club/campaigns/new" className="btn btn-sm gap-1.5"><Icon.plus className="size-4" /> Add</Link>
      </div>
      <p className="mt-1 text-[15px] text-muted">Holidays, social days and awareness days. Pick one when you plan a walk and the walk page shows it. Add your own any time.</p>
      <div className="mt-6">{ahead.length ? <List items={ahead} /> : <p className="panel p-5 text-muted">Nothing coming up. Add one.</p>}</div>
      {past.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 px-1 text-[17px] font-bold">Past year</h2>
          <List items={past} />
        </>
      )}
    </Page>
  );
}
