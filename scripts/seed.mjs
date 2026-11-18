// Sets up the club and its list of awareness days. Safe to run again: it only
// adds what's missing. Uses DATABASE_URL from .env.local (your Mac's database).
//
//   node scripts/seed.mjs                  club + awareness days
//   node scripts/seed.mjs admin <email>    make someone (already signed in once) an admin
//
// For the live database, run it with the live address on purpose, after asking:
//   DATABASE_URL=<live url> node scripts/seed.mjs
import { config } from "dotenv";
import pg from "pg";
import { randomBytes } from "node:crypto";

config({ path: ".env.local", quiet: true });
const url = new URL(process.env.DATABASE_URL);
const ssl = url.searchParams.get("sslmode") === "require" ? { rejectUnauthorized: false } : undefined;
url.searchParams.delete("sslmode");
const db = new pg.Client({ connectionString: url.toString(), ssl });
await db.connect();

const SLUG = "nakuru-walk-movement";

// Real dates, checked. International days are set by the UN or WHO; the Kenyan
// ones are public holidays under the Public Holidays Act. Mother's Day and
// Father's Day are the second Sunday of May and third Sunday of June.
// Girlfriend's and Boyfriend's Day are informal, and say so.
const CAMPAIGNS = [
  ["Movember: men's health month", "2026-11-01", "2026-11-30", "A month for men's health: prostate and testicular cancer, mental health and suicide prevention."],
  ["World Diabetes Day", "2026-11-14", "2026-11-14", "Raising awareness of diabetes, and how walking and good food help keep it away."],
  ["World Prematurity Day", "2026-11-17", "2026-11-17", "For babies born too soon and the families who care for them."],
  ["16 Days of Activism against Gender-Based Violence", "2026-11-25", "2026-12-10", "Sixteen days, from 25 November to Human Rights Day, standing against gender-based violence."],
  ["World AIDS Day", "2026-12-01", "2026-12-01", "Remembering those lost, supporting those living with HIV, and encouraging testing."],
  ["Jamhuri Day", "2026-12-12", "2026-12-12", "Kenya's independence and republic day."],
  ["World Cancer Day", "2027-02-04", "2027-02-04", "Raising awareness of cancer and the value of early screening."],
  ["International Women's Day", "2027-03-08", "2027-03-08", "Celebrating women and girls, and pushing for equality."],
  ["World Health Day", "2027-04-07", "2027-04-07", "The World Health Organization's day for health for all."],
  ["Madaraka Day", "2027-06-01", "2027-06-01", "Kenya's day of self-rule."],
  ["World Environment Day", "2027-06-05", "2027-06-05", "Caring for the land we walk on: trees, water and clean air."],
  ["World Suicide Prevention Day", "2027-09-10", "2027-09-10", "Talking openly about suicide, and checking on each other."],
  ["World Heart Day", "2027-09-29", "2027-09-29", "Looking after our hearts, one step at a time."],
  ["Breast Cancer Awareness Month", "2027-10-01", "2027-10-31", "A month to encourage breast checks and support those affected."],
  ["World Mental Health Day", "2027-10-10", "2027-10-10", "Mental health matters. Walking together and talking helps."],
  ["Mashujaa Day", "2027-10-20", "2027-10-20", "Honouring Kenya's heroes."],

  // Social days: good reasons for a themed walk.
  ["World Kindness Day", "2026-11-13", "2026-11-13", "A day for small acts of kindness. Walk with someone new."],
  ["International Men's Day", "2026-11-19", "2026-11-19", "Celebrating men and boys, and their health and wellbeing."],
  ["Christmas Day", "2026-12-25", "2026-12-25", "Christmas. A festive walk before the feasting."],
  ["Boxing Day", "2026-12-26", "2026-12-26", "Walk off the Christmas food together."],
  ["New Year's Day", "2027-01-01", "2027-01-01", "Start the year on your feet."],
  ["Valentine's Day", "2027-02-14", "2027-02-14", "Bring your partner, your friends, or come to meet people."],
  ["Easter weekend", "2027-03-26", "2027-03-29", "Good Friday to Easter Monday."],
  ["Labour Day", "2027-05-01", "2027-05-01", "Celebrating workers. A public holiday walk."],
  ["Mother's Day", "2027-05-09", "2027-05-09", "Walk with or for your mother. Second Sunday of May."],
  ["International Day of Families", "2027-05-15", "2027-05-15", "Bring the whole family along."],
  ["Father's Day", "2027-06-20", "2027-06-20", "Walk with or for your father. Third Sunday of June."],
  ["International Day of Friendship", "2027-07-30", "2027-07-30", "Bring a friend who has never walked with us."],
  ["Girlfriend's Day", "2027-08-01", "2027-08-01", "A light-hearted day (not official). Come with your girlfriend or your girls."],
  ["International Youth Day", "2027-08-12", "2027-08-12", "Celebrating young people and what they bring."],
  ["International Day of Peace", "2027-09-21", "2027-09-21", "A walk for peace and unity."],
  ["World Tourism Day", "2027-09-27", "2027-09-27", "Discover more of Nakuru County on foot."],
  ["Boyfriend's Day", "2027-10-03", "2027-10-03", "A light-hearted day (not official). Come with your boyfriend or your boys."],

  // Awareness of social problems
  ["International Day of Persons with Disabilities", "2026-12-03", "2026-12-03", "Inclusion and access for people with disabilities."],
  ["Human Rights Day", "2026-12-10", "2026-12-10", "Standing up for everyone's rights."],
  ["World Autism Awareness Day", "2027-04-02", "2027-04-02", "Understanding and accepting autism."],
  ["World Malaria Day", "2027-04-25", "2027-04-25", "Ending malaria: prevention, testing and treatment."],
  ["World Hypertension Day", "2027-05-17", "2027-05-17", "Know your blood pressure. Walking helps keep it down."],
  ["World No Tobacco Day", "2027-05-31", "2027-05-31", "Encouraging people to quit smoking."],
  ["World Blood Donor Day", "2027-06-14", "2027-06-14", "Thanking blood donors and encouraging new ones."],
  ["Day of the African Child", "2027-06-16", "2027-06-16", "Children's rights and education across Africa."],
  ["International Day against Drug Abuse", "2027-06-26", "2027-06-26", "Raising awareness of drug and alcohol abuse."],
  ["World Alzheimer's Day", "2027-09-21", "2027-09-21", "Dementia awareness, and support for carers."],
  ["Mazingira Day", "2027-10-10", "2027-10-10", "Kenya's environment day: plant trees, clean up, care for nature."],
  ["International Day of the Girl", "2027-10-11", "2027-10-11", "Girls' rights, education and safety."],
  ["World Sight Day", "2027-10-14", "2027-10-14", "Eye health and access to eye care."],
  ["World Food Day", "2027-10-16", "2027-10-16", "Ending hunger. A walk with a food drive."],
];

async function club() {
  const found = await db.query("select id, join_code from clubs where slug = $1", [SLUG]);
  if (found.rows[0]) return found.rows[0];
  const { rows } = await db.query(
    "insert into clubs (slug, name, join_code, timezone) values ($1, $2, $3, 'Africa/Nairobi') returning id, join_code",
    [SLUG, "Nakuru Walk Movement", randomBytes(5).toString("base64url")],
  );
  console.log("Added the club: Nakuru Walk Movement");
  return rows[0];
}

try {
  const c = await club();
  if (process.argv[2] === "admin") {
    const email = String(process.argv[3] ?? "").toLowerCase();
    const u = await db.query("select id, name from \"user\" where lower(email) = $1", [email]);
    if (!u.rows[0]) throw new Error(`No one has signed in as ${email} yet. Sign in once, then run this again.`);
    await db.query(
      "insert into club_members (club_id, user_id, role) values ($1, $2, 'admin') on conflict (club_id, user_id) do update set role = 'admin'",
      [c.id, u.rows[0].id],
    );
    console.log(`${u.rows[0].name} is now an admin of Nakuru Walk Movement.`);
  } else {
    let added = 0;
    for (const [name, startsOn, endsOn, description] of CAMPAIGNS) {
      const r = await db.query(
        `insert into campaigns (club_id, name, starts_on, ends_on, description)
         select $1, $2, $3, $4, $5 where not exists (select 1 from campaigns where club_id = $1 and name = $2 and starts_on = $3)`,
        [c.id, name, startsOn, endsOn, description],
      );
      added += r.rowCount;
    }
    console.log(`Awareness days: ${added} added, ${CAMPAIGNS.length - added} already there.`);
    console.log(`Join link path: /join/${c.join_code}`);
  }
} finally {
  await db.end();
}
