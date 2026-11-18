import Link from "next/link";
import { Page } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { DeleteForm } from "./form";

export const metadata = { title: "Delete your account" };

/* Public on purpose: app stores ask for a web page where people can delete
   their account. Signed in, you can do it here; signed out, it says how. */
export default async function DeleteAccount() {
  const session = await getSession();
  return (
    <Page className="pt-8">
      <Link href={session ? "/me/edit" : "/"} className="text-[15px] text-muted hover:text-ink">{session ? "Edit profile" : "Nakuru Walk"}</Link>
      <h1 className="display mt-6 text-[40px]">Delete your account</h1>
      <p className="mt-4 text-[17px] text-muted">This removes your account and your walking record from the app, straight away. It can’t be undone. You’re still welcome on every walk.</p>
      <section className="mt-8">
        <h2 className="text-[15px] font-bold">What gets deleted</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[16px]">
          <li>Your name, email address, photo and mobile number</li>
          <li>Your check-ins, kilometres and milestones</li>
          <li>Walks you said you’re coming to</li>
          <li>Your walk reminders</li>
          <li>Your posts, comments and likes in Community, and your market items, with their photos</li>
          <li>Your profile photo and the words about you</li>
        </ul>
        <p className="mt-4 text-[15px] text-muted">Walks you planned as an admin stay for the club. Database backups are overwritten within 30 days.</p>
      </section>
      <section className="mt-8">
        <h2 className="text-[15px] font-bold">{session ? "Delete it now" : "How to delete it"}</h2>
        {session ? (
          <DeleteForm email={session.user.email} />
        ) : (
          <>
            <p className="mt-2 text-[16px]">Sign in with the account you want to delete, then confirm on this page.</p>
            <Link href="/sign-in?next=/delete-account" className="btn mt-4">Sign in to delete</Link>
          </>
        )}
      </section>
    </Page>
  );
}
