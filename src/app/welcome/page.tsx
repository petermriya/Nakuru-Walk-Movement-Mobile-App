import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { SignOut } from "@/components/sign-out";
import { getSession } from "@/lib/auth";
import { membershipOf } from "@/lib/club";
import { removalOf } from "@/lib/queries";

export const metadata = { title: "Welcome" };

/** Signed in, but not in the club yet: the join link from WhatsApp does that. */
export default async function Welcome({ searchParams }: PageProps<"/welcome">) {
  const { link } = await searchParams;
  const s = await getSession();
  if (s && (await membershipOf(s.user.id))) redirect("/home");
  const removed = s ? await removalOf(s.user.id) : null;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-6 pt-[12vh] pb-10">
      <Logo size={56} />
      {removed ? (
        <>
          <h1 className="display mt-8 text-[36px]">You’re no longer in the club</h1>
          <p className="mt-4 text-[18px] leading-snug">An admin removed you from Nakuru Walk.</p>
          {removed.reason && (
            <p className="panel mt-5 p-4 text-[16px] leading-snug">
              <span className="block text-[13px] font-semibold text-muted">The reason they gave</span>
              {removed.reason}
            </p>
          )}
          <p className="mt-5 text-[16px] leading-snug text-muted">If you think this is a mistake, talk to one of the club’s admins.</p>
        </>
      ) : (
        <>
          <h1 className="display mt-8 text-[36px]">{link === "old" ? "That join link has changed" : "Almost there"}</h1>
          <p className="mt-4 text-[18px] leading-snug">
            {link === "old"
              ? "The admins made a new link. Open the latest one from your Nakuru Walk WhatsApp group."
              : "Open the join link the admins shared in your Nakuru Walk WhatsApp group, and you’ll be in."}
          </p>
        </>
      )}
      <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-12 text-[14px] text-muted">
        {s ? <SignOut className="hover:text-ink" /> : <Link href="/sign-in" className="hover:text-ink">Sign in</Link>}
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        {s && <Link href="/delete-account" className="hover:text-ink">Delete account</Link>}
      </div>
    </main>
  );
}
