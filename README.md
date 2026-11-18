# Nakuru Walk

The app for Nakuru Walk Movement. Members see the next walk, tap "I'm coming", check in on the day by scanning a code, keep their own record of kilometres, walks and places, post to the club feed, and sell to each other on the free Wednesday market.

Built the same way as 100 Days: Next.js, Google sign-in (Better Auth), Postgres (Drizzle), Vercel. It installs on phones from the browser, with its own icon.

**Status:** v1 works on this Mac with sample data. Not deployed yet, and not tried on a real phone.

## What's in v1

- **Walks.** Admins post each walk: route name, places, distance (any length), meeting point and map link, date and time (Saturday by default, or Sunday), dress code, notes.
- **Special days.** 47 ready-made dates admins can pick from: Kenyan holidays (Jamhuri, Mashujaa, Mazingira), social days (Valentine's, Mother's and Father's Day, Friendship Day, informal Girlfriend's and Boyfriend's Day) and awareness days (World Diabetes Day, Mental Health Day, 16 Days of Activism and more). A walk can be linked to one, and its page shows "This walk marks ...". Admins can add their own.
- **I'm coming.** One tap. Admins see the headcount.
- **Check-in.** An admin shows a QR code at the start; members scan it with the phone camera and tap "Check me in". Admins can also tick names off a roll call. Everyone who checks in is credited the walk's set distance.
- **My record.** Total km, walks, places walked and milestones (first walk, 10 km, 50 km, 5 walks...). No leaderboards or ranking anywhere.
- **Safety.** Admins pick the person at the back; after the walk they (or an admin) confirm how many finished. Members can add their mobile number, which only admins see.
- **One join link.** Under Club, with Copy and WhatsApp buttons. Opening it signs you in and you're in the club.
- **Reminders.** 7 pm the evening before (to every member with notifications on), and about 2 hours before the start (to people coming).
- **Notifications on every phone.** Android (Chrome, Samsung Internet, Firefox, Edge), iPhone and iPad on iOS 16.4 or newer once added to the Home Screen, and computers. Each case gets its own plain steps: inside WhatsApp's or another app's browser (where Google sign-in, installing and notifications can't work) the app says so and offers **Open in Chrome** on Android or the Safari steps on iPhone; older iPhones are told to update; blocked notifications get the exact settings path for Chrome, Samsung Internet or the installed app; Brave is told about its push setting. A subscription made with an old key is renewed by itself. **Send me a test** (My record, Notifications) sends one to your own phones. Failed sends are logged with the push service's answer.
- **Community notifications.** A new post notifies every other member with notifications on; a reply notifies the person who posted. Tapping one opens the post. Same switch as reminders (My record → Notifications), and the Community screen offers it to phones that haven't turned it on.
- **Community.** A club feed: any member posts a message with up to 3 photos; others like it and reply. People remove their own posts and replies; admins can remove any.
- **The Wednesday market.** Free for members, for anything: goods, food, services, stays and rentals. New items go up on Wednesdays only (Nakuru time) and stay up for a week. Each item has up to 3 photos, a price in shillings with what it's for (fixed, or per night, day, week, month, hour, session, person or kg; or "Ask for price"), an optional "negotiable" and location, a kind, details, and the seller's WhatsApp number. Sellers can change their item any day. Buyers tap **WhatsApp** (a ready-made message) or **Call**. Sellers mark items sold, or put them up again on a later Wednesday. Up to 5 items each at a time. The club takes no payments.
- **Unread counts.** Red counts on the Community tab (new posts, plus replies and likes on your posts) and the Market tab (new items), like a social feed. New posts and items get a **New** label. A bell on Community opens **Activity**: replies, and likes grouped per post ("Akinyi, Kamau and 7 others liked your post"). Opening a screen clears its count. The total also shows on the home-screen icon on phones that support it. Counts refresh on each screen, when the app comes back to the front, and every minute.
- **Profiles.** Tap anyone's photo or name (in the feed, comments or a market item) to open their profile: photo, name, a few words about them, member since, their posts and what they're selling. Kilometres, walk counts and phone numbers stay private. Your own profile has **Edit**: photo, name, about you, mobile number, and a link to delete your account.
- **Comments.** Members comment on posts, like comments, and reply to a comment (answers sit under it, one level deep). The comment's writer and the post's writer get a notification, never twice and never for their own words. Activity shows replies and likes on your comments too.
- **Photos** are shrunk on the phone (longest side 1400 px, usually under 300 KB) and kept in the database for now. Only signed-in club members can load them.
- **Install, privacy, terms, delete account.**

Not in v1: payments, jersey orders, memberships, private messages, GPS. The data has room for them (a `clubs` table, member roles).

## Run it on your Mac

```bash
npm install
createdb nakuru_walk_dev
npx drizzle-kit push        # create the tables
node scripts/seed.mjs       # the club and the awareness days
node scripts/demo.mjs add   # test accounts, sample walks, posts and market items (remove with: node scripts/demo.mjs remove)
npx next build && npx next start -p 3300
```

Open http://localhost:3300 and sign in with a test account. The sign-in link prints in the terminal:

- `tester@nakuruwalk.test`: an admin
- `member@nakuruwalk.test`: a member with one walk

Tests for the maths and rules (dates, reminders, check-in times, milestones, forms): `npm test`.

## Settings (`.env.local`)

| Name | What it is |
|---|---|
| `DATABASE_URL` | The database. Locally `postgres://localhost:5432/nakuru_walk_dev` |
| `BETTER_AUTH_SECRET` | Any long random string (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | The app's own address: `http://localhost:3300`, or the live https address |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in. Not set up yet |
| `LOCAL_EMAIL_LINKS` | `1` on your Mac only: test accounts sign in with a link in the terminal |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Notifications (`npx web-push generate-vapid-keys`) |
| `CRON_SECRET` | Any long random string, so only Vercel can run the reminders |
| `PUSH_LOG` | `1` locally prints each reminder that would be sent |
| `CONTACT_EMAIL` | Shown on the privacy and terms pages |
| `MARKET_ALWAYS_OPEN` | `1` on your Mac only: post on the market any day, not just Wednesdays. Does nothing live |

`.env.example` lists them all. `.env.local` is never committed.

## Going live (ask Peter first, each time)

1. Google: create an OAuth client at console.cloud.google.com. Redirect URIs: `http://localhost:3300/api/auth/callback/google` and `https://<live address>/api/auth/callback/google`.
2. Database: done on 17 Nov 2026. The live database is `nakuru_walk` on the same Aiven service as 100 Days (they share its 20 connections). Its address is `DATABASE_URL_PROD` in `.env.local`. After changing the tables: `DATABASE_URL=<live url with uselibpqcompat=true&sslmode=require> npx drizzle-kit push` (without `uselibpqcompat=true`, drizzle-kit stops silently on Aiven's certificate). Seed with `DATABASE_URL=<live url> node scripts/seed.mjs`.
3. Vercel: new project from this folder, add the settings above (not `LOCAL_EMAIL_LINKS`, `PUSH_LOG` or `MARKET_ALWAYS_OPEN`), then `npx vercel@latest deploy --prod --yes`. `vercel.json` puts the app in Mumbai (`bom1`) next to Aiven and runs the reminder job every hour.
4. Sign in on the live site once, then make yourself an admin: `DATABASE_URL=<live url> node scripts/seed.mjs admin <your email>`.
5. Copy the join link from Club and post it in every WhatsApp group. Tell people that on Android the dependable way to install is Chrome's ⋮ menu, then Install app; on iPhone, Safari's Share, then Add to Home Screen.

## Where things are

- `src/app/actions.ts`: every change anyone makes, each checked for who's allowed
- `src/db/schema.ts`: the tables
- `src/lib/time.ts`: Nakuru time, reminder timing, check-in window
- `src/lib/record.ts`: km, milestones, places
- `src/lib/market.ts`: market day, prices, WhatsApp links, the feed's rules
- `src/app/community`, `src/app/market`: the club feed and the market
- `src/app/api/photo/[id]/route.ts`: serves photos to club members only
- `src/app/api/cron/remind/route.ts`: the hourly reminder job
- `scripts/seed.mjs`, `scripts/demo.mjs`: club setup, sample data
- `docs/screenshots/`: each main screen at phone size
