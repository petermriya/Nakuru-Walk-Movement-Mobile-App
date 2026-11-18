import Link from "next/link";
import { Contact, LegalPage, Part } from "@/components/legal";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <p>Nakuru Walk is the app of Nakuru Walk Movement, a walking club in Nakuru County, Kenya. This page says what the app keeps about you, who can see it, and how to remove it.</p>

      <Part title="What we keep">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Your account:</strong> your name, email address and, from Google, your profile photo.</li>
          <li><strong>Your mobile number,</strong> only if you add it.</li>
          <li><strong>Your walks:</strong> which walks you said you’re coming to, which ones you checked in at, and how far you went.</li>
          <li><strong>What you post:</strong> your posts, replies and likes in the club feed, and your market items, with any photos you add.</li>
          <li><strong>Your messages:</strong> private chats you have with other members, and anyone you block.</li>
          <li><strong>Notifications:</strong> if you turn them on, a notification address for your phone, used only for walk reminders.</li>
          <li><strong>Signing in:</strong> a cookie that keeps you signed in, with the browser type and IP address it was created from.</li>
        </ul>
        <p>We don’t use advertising, analytics or tracking tools, and we don’t sell or rent your data to anyone.</p>
      </Part>

      <Part title="Who can see it">
        <p>Your record (kilometres, walks and places) is for you. There are no leaderboards and nobody else sees your totals.</p>
        <p>The club admins see members’ names, mobile numbers, how many walks each person has done, and who is coming to and checked in at each walk. They use this to plan walks and to make sure everyone gets home safely.</p>
        <p>Other members see how many people are coming to a walk, not who.</p>
        <p>Your posts, replies, likes and market items, with their photos and your name, are seen by every club member. The number you put on a market item is shown to club members on that item, so buyers can reach you. None of it is public outside the club.</p>
        <p>Private messages are seen only by you and the member you’re chatting with. Club admins can’t read them. If an admin removes someone from the club, the club keeps a note of who was removed, when and why, so the join link doesn’t let them back in.</p>
      </Part>

      <Part title="Services we use">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Vercel</strong> runs the app.</li>
          <li><strong>Aiven</strong> hosts the database.</li>
          <li><strong>Google</strong> handles “Continue with Google” sign-in.</li>
          <li>Your phone maker’s push service (for example Google or Apple) delivers reminders, if you turn them on.</li>
        </ul>
      </Part>

      <Part title="How long we keep it">
        <p>As long as your account exists. Deleting your account removes your data straight away, and database backups are overwritten within 30 days.</p>
      </Part>

      <Part title="Your choices">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Change your name, photo or number under Profile, and turn notifications off at any time.</li>
          <li>Remove any post, reply or market item of yours at any time.</li>
          <li>Block any member from messaging you, from the menu in your chat with them.</li>
          <li>Delete your account and everything in it at <Link href="/delete-account" className="underline">Delete account</Link>.</li>
          <li>Ask for a copy of your data, or ask anything about it, through <Contact />.</li>
        </ul>
      </Part>

      <Part title="Children">
        <p>The app is for members aged 13 and over. Younger walkers are welcome on walks with a parent or guardian, without an account.</p>
      </Part>

      <Part title="Changes">
        <p>If this policy changes, we’ll update this page and the date at the top, and tell members in the WhatsApp groups for anything important.</p>
      </Part>
    </LegalPage>
  );
}
