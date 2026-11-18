import { BackLink, Page } from "@/components/ui";
import { WalkForm } from "@/components/walk-form";
import { requireAdmin } from "@/lib/club";
import { campaignsList } from "@/lib/queries";
import { DEFAULT_START, addDays, nextSaturday, utcToZoned } from "@/lib/time";

export const metadata = { title: "Plan a walk" };

export default async function NewWalk() {
  const { club } = await requireAdmin();
  const today = utcToZoned(new Date()).day;
  const campaigns = (await campaignsList(club.id)).filter((c) => c.endsOn >= addDays(today, -1));
  const saturday = nextSaturday(new Date());
  return (
    <Page>
      <BackLink href="/home" label="Walks" />
      <h1 className="display mt-2 text-[30px]">Plan a walk</h1>
      <WalkForm
        saturday={saturday}
        campaigns={campaigns}
        initial={{ title: "", places: "", distance: "", meetingPoint: "", mapUrl: "", day: saturday, time: DEFAULT_START, dressCode: "", notes: "", campaignId: "" }}
      />
    </Page>
  );
}
