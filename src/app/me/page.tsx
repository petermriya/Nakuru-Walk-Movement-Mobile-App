import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { InstallApp } from "@/components/install";
import { Notifications } from "@/components/notifications-switch";
import { PushSync } from "@/components/push-sync";
import { SignOut } from "@/components/sign-out";
import { Avatar, Icon, Page, Section, TabBar } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { myWalks } from "@/lib/queries";
import { kmText, km1, milestones, placesWalked } from "@/lib/record";
import { formatDay } from "@/lib/time";

export const metadata = { title: "Profile" };

/** Your profile: how you appear to the club, then your own walking record (private), then settings. */
export default async function Profile() {
  const { me, club, admin } = await requireMember();
  const [done, [profile]] = await Promise.all([
    myWalks(me.id, club.id),
    db.select({ name: user.name, image: user.image, bio: user.bio }).from(user).where(eq(user.id, me.id)),
  ]);
  const name = profile?.name.trim() || me.name;
  const total = km1(done.reduce((s, w) => s + w.km, 0));
  const { done: reached, next } = milestones(total, done.length);
  const places = placesWalked(done);

  return (
    <Page>
      <PushSync />

      <header className="pt-5">
        <div className="flex items-end justify-between gap-4">
          <Avatar id={me.id} name={name} image={profile?.image ?? me.image} size={80} />
          <Link href="/me/edit" className="btn btn-quiet btn-sm gap-1.5"><Icon.edit className="size-4" /> Edit profile</Link>
        </div>
        <h1 className="display mt-4 text-[36px]">{name}</h1>
        {profile?.bio ? (
          <p className="mt-2 text-[16px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{profile.bio}</p>
        ) : (
          <Link href="/me/edit" className="mt-2 inline-block text-[15px] font-semibold text-accent">Add a photo and a few words about yourself</Link>
        )}
        <Link href={`/people/${me.id}`} className="mt-3 flex w-fit items-center gap-1 text-[14px] font-semibold text-muted">
          See your profile as others do <Icon.chevron className="size-4" />
        </Link>
      </header>

      <section className="mt-9">
        <h2 className="text-[17px] font-bold">Your walking</h2>
        <p className="text-[14px] text-muted">Only you can see this.</p>
        <div className="mt-4 rounded-[24px] bg-accent-soft p-5">
          <p className="display text-[44px] text-accent-deep">{done.length ? `${kmText(total)} with the club` : "Your first walk is next"}</p>
          {done.length > 0 && (
            <p className="mt-2 text-[16px] text-accent-deep/85">
              {done.length} {done.length === 1 ? "walk" : "walks"}, {places.length} {places.length === 1 ? "place" : "places"}
            </p>
          )}
          {next && done.length > 0 && (
            <p className="mt-4 flex items-start gap-2 border-t border-accent/15 pt-4 text-[15px] text-accent-deep">
              <Icon.flag className="mt-0.5 size-[18px] shrink-0" />
              <span><span className="font-semibold">Next: {next.title}.</span> {next.line}</span>
            </p>
          )}
          {done.length === 0 && <p className="mt-2 text-[15px] text-accent-deep/85">Check in at a walk and your kilometres, places and milestones start here.</p>}
        </div>
      </section>

      {reached.length > 0 && (
        <Section title="Milestones">
          <ul className="panel divide-y divide-line">
            {reached.map((m) => (
              <li key={m.key} className="flex items-center gap-3.5 px-5 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bloom-soft text-bloom-deep"><Icon.check className="size-[18px]" /></span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold">{m.title}</span>
                  <span className="block text-[14px] leading-snug text-muted">{m.line}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {places.length > 0 && (
        <Section title="Places walked">
          <div className="flex flex-wrap gap-2">
            {places.map((p) => (
              <span key={p} className="chip h-9 bg-surface px-3.5 text-[14px] shadow-card"><Icon.pin className="size-4 text-accent" /> {p}</span>
            ))}
          </div>
        </Section>
      )}

      {done.length > 0 && (
        <Section title="Your walks">
          <ul className="panel divide-y divide-line">
            {[...done].reverse().map((w) => (
              <li key={w.id}>
                <Link href={`/w/${w.id}`} className="press flex items-center gap-3 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold">{w.title}</span>
                    <span className="text-[14px] text-muted">{formatDay(w.startsAt)}</span>
                  </span>
                  <span className="display text-[20px] text-accent">{kmText(w.km)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Notifications">
        <div className="panel p-5"><Notifications /></div>
      </Section>

      <div className="mt-4">
        <InstallApp where="profile" />
      </div>

      <nav aria-label="Account" className="mt-9 flex flex-wrap gap-x-5 gap-y-2 px-1 text-[14px] text-muted">
        <SignOut className="font-semibold text-ink" />
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/delete-account">Delete account</Link>
      </nav>

      <TabBar active="me" admin={admin} />
    </Page>
  );
}
