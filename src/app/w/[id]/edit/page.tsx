import { BackLink, Page } from "@/components/ui";
import { WalkForm } from "@/components/walk-form";
import { requireAdmin } from "@/lib/club";
import { campaignsList, walkData } from "@/lib/queries";
import { addDays, nextSaturday, utcToZoned } from "@/lib/time";

export const metadata = { title: "Edit walk" };

export default async function EditWalk({ params }: PageProps<"/w/[id]/edit">) {
  const { id } = await params;
  const { me, club } = await requireAdmin();
  const [{ walk }, campaigns] = await Promise.all([walkData(id, club.id, me.id), campaignsList(club.id)]);
  const { day, time, weekday } = utcToZoned(walk.startsAt);
  // The Saturday of that weekend, so the quick buttons show its Saturday and Sunday.
  const saturday = weekday === 0 ? addDays(day, -1) : nextSaturday(walk.startsAt);
  return (
    <Page>
      <BackLink href={`/w/${walk.id}`} label={walk.title} />
      <h1 className="display mt-2 text-[30px]">Edit walk</h1>
      <WalkForm
        saturday={saturday}
        campaigns={campaigns}
        initial={{
          id: walk.id,
          title: walk.title,
          places: walk.places.join(", "),
          distance: String(walk.distanceKm),
          meetingPoint: walk.meetingPoint,
          mapUrl: walk.mapUrl ?? "",
          day,
          time,
          dressCode: walk.dressCode ?? "",
          notes: walk.notes ?? "",
          campaignId: walk.campaignId ?? "",
        }}
      />
    </Page>
  );
}
