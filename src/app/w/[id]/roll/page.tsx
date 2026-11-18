import { BackLink, Page } from "@/components/ui";
import { requireAdmin } from "@/lib/club";
import { rollCall, walkData } from "@/lib/queries";
import { RollRow } from "./row";

export const metadata = { title: "Roll call" };

/** Tick people off by hand, for anyone without a phone or whose scan didn't work. */
export default async function Roll({ params, searchParams }: PageProps<"/w/[id]/roll">) {
  const { id } = await params;
  const { q } = await searchParams;
  const term = typeof q === "string" ? q.slice(0, 60) : "";
  const { me, club } = await requireAdmin();
  const { walk, there } = await walkData(id, club.id, me.id);
  const people = await rollCall(walk.id, club.id, term);

  return (
    <Page>
      <BackLink href={`/w/${walk.id}`} label={walk.title} />
      <h1 className="display mt-2 text-[30px]">Roll call</h1>
      <p className="mt-1 text-[15px] text-muted">{there} checked in. Tap a name to tick them off.</p>
      <form className="mt-5" role="search">
        <label htmlFor="q" className="sr-only">Find a member</label>
        <input id="q" name="q" defaultValue={term} type="search" className="field" placeholder="Find anyone in the club" autoComplete="off" />
      </form>
      <p className="mt-4 mb-2 px-1 text-[17px] font-bold">
        {term ? `Matching “${term}”` : "Coming or checked in"}
      </p>
      {people.length ? (
        <ul className="panel divide-y divide-line">
          {people.map((p) => (
            <RollRow key={p.id} walkId={walk.id} person={p} />
          ))}
        </ul>
      ) : (
        <p className="panel p-5 text-[15px] text-muted">{term ? "No one by that name. Check the spelling, or they may not have joined the app yet." : "No one yet. Search above to find someone."}</p>
      )}
    </Page>
  );
}
