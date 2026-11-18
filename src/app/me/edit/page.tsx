import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { BackLink, Page } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { EditProfileForm } from "./form";

export const metadata = { title: "Edit profile" };

export default async function EditProfile() {
  const { me } = await requireMember();
  const [p] = await db.select({ name: user.name, phone: user.phone, bio: user.bio, image: user.image }).from(user).where(eq(user.id, me.id));

  return (
    <Page>
      <BackLink href={`/people/${me.id}`} label="Your profile" />
      <h1 className="display mt-3 text-[34px]">Edit profile</h1>
      <div className="mt-6">
        <EditProfileForm id={me.id} name={p?.name ?? ""} phone={p?.phone ?? ""} bio={p?.bio ?? ""} image={p?.image ?? null} />
      </div>

      <section className="mt-12 border-t border-line pt-6">
        <h2 className="text-[17px] font-bold">Delete your account</h2>
        <p className="mt-1 text-[15px] text-muted">Removes your account, posts, comments, market items and walking record, straight away. It can’t be undone.</p>
        <Link href="/delete-account" className="btn btn-danger-quiet btn-sm mt-4">Delete my account</Link>
      </section>
    </Page>
  );
}
