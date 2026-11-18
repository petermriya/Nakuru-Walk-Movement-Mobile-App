import Link from "next/link";
import { MessageButton } from "@/components/message-button";
import { ItemPicture } from "@/components/photo-view";
import { PostCard } from "@/components/post-card";
import { Avatar, BackLink, Icon, Page, Section } from "@/components/ui";
import { requireMember } from "@/lib/club";
import { countText, priceText } from "@/lib/market";
import { profileData } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const { me, club } = await requireMember();
  const { person } = await profileData(id, club.id, me.id);
  return { title: person.name.trim() || "Member" };
}

const sinceText = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", month: "long", year: "numeric" }).format(d);

/** A member's profile: photo, name, a few words, their posts and what they're selling.
    Kilometres, walk counts and phone numbers stay private, as the privacy policy says. */
export default async function Person({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const { me, club, admin } = await requireMember();
  const { person, posts, items, postCount } = await profileData(id, club.id, me.id);
  const mine = person.id === me.id;
  const name = person.name.trim() || "A member";
  const now = new Date();

  return (
    <Page>
      <BackLink href="/community" label="Community" />

      <header className="panel mt-2 overflow-hidden">
        <div className="hero h-24" />
        <div className="relative -mt-12 px-5 pb-5">
          <span className="inline-block rounded-full ring-4 ring-surface">
            <Avatar id={person.id} name={name} image={person.image} size={92} />
          </span>
          <div className="mt-2 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="display text-[30px]">{name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted">
                {person.role === "admin" && <span className="chip h-6 bg-accent-soft px-2.5 text-[12px] text-accent-deep">Club admin</span>}
                <span>Member since {sinceText(person.joinedAt)}</span>
                <span>{countText(postCount, "post", "posts")}</span>
              </p>
            </div>
            {mine ? (
              <Link href="/me/edit" className="btn btn-quiet btn-sm shrink-0 gap-1.5">
                <Icon.edit className="size-4" /> Edit
              </Link>
            ) : (
              <div className="shrink-0">
                <MessageButton personId={person.id} className="btn btn-sm gap-1.5" />
              </div>
            )}
          </div>
          {person.bio ? (
            <p className="mt-3 text-[16px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{person.bio}</p>
          ) : (
            mine && <Link href="/me/edit" className="mt-3 inline-block text-[15px] font-semibold text-accent">Add a few words about yourself</Link>
          )}
        </div>
      </header>

      {items.length > 0 && (
        <Section title="On the market">
          <ul className="swipe -mx-4 gap-3 px-4">
            {items.map((l) => (
              <li key={l.id} className="w-[44%]">
                <Link href={`/market/${l.id}`} className="panel press block overflow-hidden">
                  <ItemPicture id={l.photoIds[0]} />
                  <div className="p-3">
                    <p className="display text-[17px] text-accent-deep">{priceText(l.priceKsh, l.priceUnit)}</p>
                    <p className="mt-0.5 truncate text-[14px] font-semibold">{l.title}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={mine ? "Your posts" : "Posts"}>
        {posts.length ? (
          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} now={now} canRemove={admin || mine} />
            ))}
          </div>
        ) : (
          <p className="panel p-5 text-[15px] text-muted">{mine ? "Your posts in Community show up here." : `${name.split(/\s+/)[0]} hasn’t posted yet.`}</p>
        )}
      </Section>
    </Page>
  );
}
