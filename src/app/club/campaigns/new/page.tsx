import { BackLink, Page } from "@/components/ui";
import { requireAdmin } from "@/lib/club";
import { CampaignForm } from "../../campaign-form";

export const metadata = { title: "Add a special day" };

export default async function NewCampaign() {
  await requireAdmin();
  return (
    <Page>
      <BackLink href="/club/campaigns" label="Special days" />
      <h1 className="display mt-2 text-[30px]">Add a special day</h1>
      <CampaignForm initial={{ name: "", startsOn: "", endsOn: "", description: "" }} />
    </Page>
  );
}
