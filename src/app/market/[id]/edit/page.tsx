import { redirect } from "next/navigation";
import { BackLink, Page } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { listingData } from "@/lib/queries";
import { ListingForm } from "../../new/form";

export const metadata = { title: "Change your item" };

export default async function EditListing({ params }: PageProps<"/market/[id]/edit">) {
  const { id } = await params;
  const { me, club } = await requireMember();
  const l = await listingData(id, club.id);
  if (l.sellerId !== me.id) redirect(`/market/${l.id}`);

  return (
    <Page>
      <BackLink href={`/market/${l.id}`} label="Your item" />
      <h1 className="display mt-3 text-[34px]">Change your item</h1>
      <p className="mt-2 text-[15px] text-muted">You can change it any day. It stays up until the same day it was going to come down.</p>
      <div className="mt-6">
        <ListingForm phone={l.phone} editing={{ id: l.id, title: l.title, priceKsh: l.priceKsh, priceUnit: l.priceUnit, negotiable: l.negotiable, location: l.location, category: l.category, description: l.description, phone: l.phone, photoIds: l.photoIds }} />
      </div>
    </Page>
  );
}
