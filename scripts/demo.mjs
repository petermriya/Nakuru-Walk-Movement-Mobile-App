// Sample data for trying the app on your Mac. Never run against the live database.
//
//   node scripts/demo.mjs add      test accounts, 40 sample members, past and upcoming walks
//   node scripts/demo.mjs remove   takes all of it out again
//
// Test accounts (sign in with the link printed in the terminal):
//   tester@nakuruwalk.test   an admin
//   member@nakuruwalk.test   a member who has done one walk
import { config } from "dotenv";
import pg from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

config({ path: ".env.local", quiet: true });
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "")) {
  console.error("This only runs against your Mac's own database.");
  process.exit(1);
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const TEST = "@nakuruwalk.test";
const SAMPLE = "@sample.nakuruwalk.test";
const NAMES = `Wanjiru Kamau, Otieno Odhiambo, Achieng Atieno, Kiprono Bett, Njeri Mwangi, Mutua Musyoka, Chebet Koech, Kamau Njoroge,
Akinyi Ouma, Wafula Barasa, Nyambura Kariuki, Kibet Rotich, Moraa Nyaboke, Omondi Okoth, Wambui Gitau, Cheruiyot Langat,
Auma Adhiambo, Mwangi Waweru, Jepkosgei Sang, Onyango Ochieng, Wairimu Ndungu, Kiptoo Kirui, Nekesa Wekesa, Gacheru Muriuki,
Atieno Owino, Korir Kiprop, Muthoni Wanjiku, Ndirangu Maina, Jeptoo Kosgei, Oduor Otieno, Kerubo Ondieki, Macharia Kimani,
Awino Akoth, Ruto Kimutai, Wangari Muthee, Ouma Okello, Chepkoech Too, Karanja Githinji, Makena Kendi, Kiplagat Tanui`
  .split(",")
  .map((s) => s.trim());

const at = (day, time) => new Date(`${day}T${time}:00+03:00`);

/** The coming Saturday (Nakuru time), so the sample walks are always ahead. */
function comingSaturday(weeks = 0) {
  const now = new Date(Date.now() + 3 * 3600_000);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7 || 7) + weeks * 7);
  return d.toISOString().slice(0, 10);
}
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000);

/** Sample photos, drawn with ffmpeg if it's on this Mac (none otherwise). */
function samplePhotos() {
  const dir = mkdtempSync(join(tmpdir(), "nakuru-demo-"));
  const looks = [
    "gradients=s=1200x900:c0=0x2c8550:c1=0xf2b445:x0=0:y0=900:x1=1200:y1=0:d=1",
    "gradients=s=1200x900:c0=0x134a2a:c1=0x9fd3b0:x0=0:y0=0:x1=1200:y1=900:d=1",
    "gradients=s=900x900:c0=0xd98b1c:c1=0xfbeed6:x0=0:y0=0:x1=900:y1=900:d=1",
    "gradients=s=900x900:c0=0x55625a:c1=0xeef0e7:x0=900:y0=0:x1=0:y1=900:d=1",
  ];
  try {
    return looks.map((look, i) => {
      const f = join(dir, `${i}.jpg`);
      execFileSync("ffmpeg", ["-loglevel", "error", "-f", "lavfi", "-i", look, "-frames:v", "1", "-q:v", "4", f]);
      return readFileSync(f);
    });
  } catch {
    return [];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function remove() {
  await db.query(`delete from walks where created_by in (select id from "user" where email like $1)`, [`%${TEST}`]);
  const r = await db.query(`delete from "user" where email like $1 or email like $2`, [`%${TEST}`, `%${SAMPLE}`]);
  console.log(`Removed ${r.rowCount} test and sample people, and their walks.`);
}

async function addUser(email, name, phone = null) {
  const id = randomUUID();
  await db.query(`insert into "user" (id, name, email, email_verified, phone) values ($1, $2, $3, true, $4)`, [id, name, email, phone]);
  return id;
}

async function add() {
  await remove();
  const club = (await db.query(`select id from clubs where slug = 'nakuru-walk-movement'`)).rows[0];
  if (!club) throw new Error("Run node scripts/seed.mjs first.");
  const member = (u, role = "member") =>
    db.query(`insert into club_members (club_id, user_id, role) values ($1, $2, $3)`, [club.id, u, role]);

  const tester = await addUser(`tester${TEST}`, "Test Admin", "0712 000 001");
  await member(tester, "admin");
  const plain = await addUser(`member${TEST}`, "Test Member");
  await member(plain);
  const people = [];
  for (const [i, name] of NAMES.entries()) {
    const u = await addUser(`${name.split(" ")[0].toLowerCase()}${i}${SAMPLE}`, name, i % 3 ? `07${String(10000000 + i * 7919).slice(0, 8)}` : null);
    await member(u);
    people.push(u);
  }

  const diabetes = (await db.query(`select id from campaigns where club_id = $1 and name = 'World Diabetes Day'`, [club.id])).rows[0]?.id ?? null;
  const walk = async (w) => {
    const { rows } = await db.query(
      `insert into walks (club_id, title, places, distance_km, meeting_point, map_url, starts_at, dress_code, notes, campaign_id, checkin_code, created_by, sweep_user_id, finished_at, finished_count, finished_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id`,
      [club.id, w.title, w.places, w.km, w.meet, w.map ?? null, w.at, w.dress ?? null, w.notes ?? null, w.campaign ?? null,
       randomBytes(6).toString("base64url"), tester, w.sweep ?? null, w.finished ?? null, w.finishedCount ?? null, w.finished ? tester : null],
    );
    return rows[0].id;
  };
  const went = async (walkId, users, km) => {
    for (const [i, u] of users.entries())
      await db.query(`insert into attendance (walk_id, user_id, km, method) values ($1, $2, $3, $4)`, [walkId, u, typeof km === "function" ? km(i) : km, i % 4 ? "qr" : "admin"]);
  };

  // Past walks
  const w1 = await walk({ title: "Menengai Crater rim", places: ["Nakuru town", "Menengai Crater", "Menengai viewpoint"], km: 14, meet: "Nakuru Athletic Club gate", at: at("2026-10-17", "06:30"), dress: "Green jersey", finished: at("2026-10-17", "11:10"), finishedCount: 31, sweep: people[3] });
  await went(w1, [tester, ...people.slice(0, 30)], (i) => (i === 5 ? 8 : 14));
  const w2 = await walk({ title: "Lake Nakuru shoreline", places: ["Lanet", "Lake Nakuru", "Baharini"], km: 20, meet: "Lanet stage", at: at("2026-10-24", "06:00"), finished: at("2026-10-24", "12:00"), finishedCount: 25 });
  await went(w2, [tester, ...people.slice(5, 29)], 20);
  const w3 = await walk({ title: "Hyrax Hill and back", places: ["Nakuru town", "Hyrax Hill"], km: 10, meet: "Nakuru railway station", at: at("2026-11-01", "07:00"), dress: "Any bright colour", finished: at("2026-11-01", "10:00"), finishedCount: 37 });
  await went(w3, [plain, ...people.slice(0, 36)], 10);
  const w4 = await walk({ title: "Ngata farms loop", places: ["Ngata", "Kiamunyi", "Barnabas"], km: 25, meet: "Kiamunyi shopping centre", at: at("2026-11-07", "06:00"), finished: at("2026-11-07", "12:40"), finishedCount: 20 });
  await went(w4, [tester, ...people.slice(10, 29)], (i) => (i === 3 ? 12.5 : 25));

  // Coming up
  const next = await walk({
    title: "Diabetes Day walk to Menengai",
    places: ["Nakuru town", "Section 58", "Menengai Crater"],
    km: 18,
    meet: "Nakuru Athletic Club gate",
    map: "https://maps.google.com/?q=Nakuru+Athletic+Club",
    at: at(comingSaturday(), "06:30"),
    dress: "Green jersey",
    notes: "Bring water and a snack. We stop at the viewpoint for photos. Slower walkers welcome: we walk together.",
    campaign: diabetes,
  });
  for (const u of [tester, ...people.slice(0, 33)]) await db.query(`insert into rsvps (walk_id, user_id) values ($1, $2)`, [next, u]);
  const later = await walk({ title: "Bahati forest trail", places: ["Bahati", "Bahati forest", "Kabatini"], km: 22, meet: "Bahati stage", at: at(comingSaturday(1), "06:30"), dress: "Green jersey" });
  for (const u of people.slice(0, 9)) await db.query(`insert into rsvps (walk_id, user_id) values ($1, $2)`, [later, u]);

  // The club feed
  const pics = samplePhotos();
  const post = async (u, body, h, photoIdx = []) => {
    const { rows } = await db.query(`insert into posts (club_id, user_id, body, created_at) values ($1, $2, $3, $4) returning id`, [club.id, u, body, hoursAgo(h)]);
    for (const [i, k] of photoIdx.entries()) if (pics[k]) await db.query(`insert into photos (post_id, position, mime, bytes) values ($1, $2, 'image/jpeg', $3)`, [rows[0].id, i, pics[k]]);
    return rows[0].id;
  };
  const p1 = await post(people[0], "What a morning on the Ngata loop! 25 km and nobody left behind. Thank you to everyone who waited at the hill.", 50, [0, 1]);
  const p2 = await post(people[6], "Anyone walking from Lanet on Saturday? Happy to meet at the stage at 5:45 and go together.", 20);
  const p3 = await post(tester, "Reminder: bring water and a snack for the Menengai walk. We stop at the viewpoint for the group photo.", 6);
  await post(people[12], "First walk done last weekend. My legs are still talking to me, but I’ll be back.", 2, [2]);
  for (const [postId, likers] of [[p1, people.slice(0, 14)], [p2, people.slice(3, 7)], [p3, people.slice(0, 9)]])
    for (const u of likers) await db.query(`insert into post_likes (post_id, user_id) values ($1, $2)`, [postId, u]);
  for (const [postId, u, body, h] of [
    [p1, people[4], "That hill nearly finished me. Thank you for waiting!", 48],
    [p1, people[9], "Best walk so far. When are we doing Ngata again?", 30],
    [p2, people[11], "Count me in, see you at 5:45.", 18],
  ]) await db.query(`insert into replies (post_id, user_id, body, created_at) values ($1, $2, $3, $4)`, [postId, u, body, hoursAgo(h)]);

  // The Wednesday market
  const item = async (u, title, price, category, description, h, photoIdx = [], sold = false) => {
    const { rows } = await db.query(
      `insert into listings (club_id, user_id, title, price_ksh, category, description, phone, posted_at, sold) values ($1,$2,$3,$4,$5,$6,'0712 345 678',$7,$8) returning id`,
      [club.id, u, title, price, category, description, hoursAgo(h), sold],
    );
    for (const [i, k] of photoIdx.entries()) if (pics[k]) await db.query(`insert into photos (listing_id, position, mime, bytes) values ($1, $2, 'image/jpeg', $3)`, [rows[0].id, i, pics[k]]);
  };
  await item(people[1], "Fresh honey from Subukia, 500 g jar", 650, "food", "Raw honey from my uncle’s hives. I can bring it to Saturday’s walk.", 30, [2]);
  await item(people[7], "Club green jersey, size M", 1200, "clothing", "Worn twice. Too small for me now.", 40, [0, 1]);
  await item(people[15], "Walking poles, adjustable pair", 2500, "fitness", "Light aluminium poles, good for the crater climbs.", 60, [3]);
  await item(people[20], "Home-made chapati, order by Friday", null, "food", "Packs of 10, delivered in Nakuru town on Saturday morning.", 20);
  await item(people[22], "Physio and sports massage", 1500, "services", "Qualified physiotherapist. Price per session, at my clinic on Kenyatta Avenue.", 70, [], false);
  await item(tester, "Hydration backpack, 2 litres", 1800, "fitness", "Barely used. Collect at the next walk.", 10, [1]);
  await item(people[2], "Running shoes, size 42", 2000, "clothing", "Good grip, used one season.", 90, [], true);

  console.log(`Added 2 test accounts, ${people.length} sample members, 4 past walks, 2 coming up, 4 posts and 7 market items${pics.length ? " with photos" : ""}.`);
}

try {
  if (process.argv[2] === "add") await add();
  else if (process.argv[2] === "remove") await remove();
  else console.log("Use: node scripts/demo.mjs add | remove");
} finally {
  await db.end();
}
