import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { BackLink, Page } from "@/components/ui";
import { requireAdmin } from "@/lib/club";
import { CampaignForm } from "../../campaign-form";
import { DeleteCampaign } from "../../parts";

export const metadata = { title: "Edit special day" };

export default async function EditCampaign({ params }: PageProps<"/club/campaigns/[cid]">) {
  const { cid } = await params;
  const { club } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(cid)) notFound();
  const [c] = await db.select().from(campaigns).where(and(eq(campaigns.id, cid), eq(campaigns.clubId, club.id)));
  if (!c) notFound();
  return (
    <Page>
      <BackLink href="/club/campaigns" label="Special days" />
      <h1 className="display mt-2 text-[30px]">Edit special day</h1>
      <CampaignForm initial={{ id: c.id, name: c.name, startsOn: c.startsOn, endsOn: c.endsOn === c.startsOn ? "" : c.endsOn, description: c.description ?? "" }} />
      <div className="mt-4"><DeleteCampaign id={c.id} /></div>
    </Page>
  );
}
