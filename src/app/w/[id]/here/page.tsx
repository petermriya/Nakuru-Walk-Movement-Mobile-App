import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { membershipOf } from "@/lib/club";
import { walkData } from "@/lib/queries";
import { kmText } from "@/lib/record";
import { checkinOpen, formatTime } from "@/lib/time";
import { CheckInButton } from "../parts";

export const metadata = { title: "Check in" };

/** Where the QR code leads. Checking in is one more tap, so a link preview or a stray open never checks anyone in. */
export default async function Here({ params, searchParams }: PageProps<"/w/[id]/here">) {
  const { id } = await params;
  const { c } = await searchParams;
  const code = typeof c === "string" ? c : "";
  const back = `/w/${id}/here?c=${encodeURIComponent(code)}`;
  const s = await getSession();
  if (!s) redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  const m = await membershipOf(s.user.id);
  if (!m) redirect("/welcome");
  const { walk, myKm } = await walkData(id, m.club.id, s.user.id);

  const wrong = code !== walk.checkinCode;
  const open = checkinOpen(walk.startsAt, new Date());
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-6 pt-[10vh] pb-10">
      <Logo size={48} />
      <p className="mt-8 text-[15px] font-semibold text-accent">{formatTime(walk.startsAt)}, {kmText(walk.distanceKm)}</p>
      <h1 className="display mt-1 text-[34px]">{walk.title}</h1>
      <div className="mt-8">
        {myKm != null ? (
          <div className="panel rise p-6 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent text-white"><Icon.check className="size-7" /></span>
            <p className="mt-4 text-[22px] font-bold">You’re checked in</p>
            <p className="mt-1 text-[16px] text-muted">Enjoy the walk, {s.user.name.split(" ")[0]}. Your kilometres go on your record.</p>
            <Link href={`/w/${walk.id}`} className="btn btn-quiet mt-5 w-full">See the walk</Link>
          </div>
        ) : walk.cancelled ? (
          <p className="panel p-6 text-[16px]">This walk is called off.</p>
        ) : wrong ? (
          <p className="panel p-6 text-[16px]">That code is out of date. Ask an admin to show the code again and scan it once more.</p>
        ) : !open ? (
          <p className="panel p-6 text-[16px]">Checking in opens 3 hours before the walk starts, and closes at the end of the next day.</p>
        ) : (
          <CheckInButton walkId={walk.id} code={code} />
        )}
      </div>
    </main>
  );
}
