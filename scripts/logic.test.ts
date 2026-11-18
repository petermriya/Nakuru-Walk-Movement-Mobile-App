// Logic tests for the maths and rules behind the screens. Run: npm test
import assert from "node:assert/strict";
import { comingText, kmText, milestones, parseKm, placesWalked, splitPlaces } from "../src/lib/record";
import { badgeText, commentReplyNote, daysLeft, likersText, listingLive, marketOpen, nextMarketDay, parseListing, parsePost, photoType, postNote, priceText, replyNote, timeAgo, whatsappLink, whatsappNumber } from "../src/lib/market";
import { inAppBrowserFor } from "../src/lib/device";
import { MESSAGE_MAX, messageNote, otherOf, pair, parseMessage, parseReason, sideOf } from "../src/lib/chat";
import { reminderNote } from "../src/lib/reminders";
import { checkinOpen, dueReminder, formatTime, nextSaturday, relativeDay, utcToZoned, zonedToUtc } from "../src/lib/time";
import { mapLink, parseCampaign, parsePhone, parseWalk } from "../src/lib/walk-form";

let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(`${name}\n    ${(e as Error).message.split("\n").join("\n    ")}`);
  }
}

const eat = (s: string) => new Date(`${s}+03:00`); // Nairobi time

/* ───────────── Time ───────────── */

test("Nairobi times convert to and from UTC", () => {
  const t = zonedToUtc("2026-11-14", "06:30");
  assert.equal(t.toISOString(), "2026-11-14T03:30:00.000Z");
  assert.deepEqual(utcToZoned(t), { day: "2026-11-14", time: "06:30", weekday: 6 });
  assert.equal(formatTime(t), "6:30 am");
  assert.equal(formatTime(eat("2026-11-14T19:05:00")), "7:05 pm");
  assert.equal(formatTime(eat("2026-11-14T12:00:00")), "12:00 pm");
});

test("a date near midnight lands on the right Nakuru day", () => {
  // 22:30 UTC on Friday is already Saturday 01:30 in Nakuru.
  assert.equal(utcToZoned(new Date("2026-11-13T22:30:00Z")).day, "2026-11-14");
});

test("new walks default to the coming Saturday", () => {
  assert.equal(nextSaturday(eat("2026-11-12T10:00:00")), "2026-11-14"); // Thursday
  assert.equal(nextSaturday(eat("2026-11-14T05:00:00")), "2026-11-14"); // Saturday itself
  assert.equal(nextSaturday(eat("2026-11-15T09:00:00")), "2026-11-21"); // Sunday: next week
  assert.equal(nextSaturday(new Date("2026-11-13T22:30:00Z")), "2026-11-14"); // Friday night UTC, Saturday in Nakuru
});

test("today and tomorrow read as words", () => {
  const now = eat("2026-11-13T20:00:00");
  assert.equal(relativeDay(eat("2026-11-14T06:30:00"), now), "Tomorrow");
  assert.equal(relativeDay(eat("2026-11-13T21:00:00"), now), "Today");
  assert.equal(relativeDay(eat("2026-11-21T06:30:00"), now), "Sat 21 Nov");
});

/* ───────────── Reminders ───────────── */

const sat = { startsAt: eat("2026-11-14T06:30:00"), eveSentAt: null, soonSentAt: null };

test("the evening reminder goes at 7 pm the day before (Friday for Saturday)", () => {
  assert.equal(dueReminder(sat, eat("2026-11-13T18:00:00")), null);
  assert.equal(dueReminder(sat, eat("2026-11-13T19:00:00")), "eve");
  assert.equal(dueReminder(sat, eat("2026-11-13T23:00:00")), "eve");
  assert.equal(dueReminder({ ...sat, eveSentAt: new Date() }, eat("2026-11-13T19:00:00")), null);
});

test("a Sunday walk is reminded on Saturday evening", () => {
  const sun = { ...sat, startsAt: eat("2026-11-15T07:00:00") };
  assert.equal(dueReminder(sun, eat("2026-11-13T19:00:00")), null);
  assert.equal(dueReminder(sun, eat("2026-11-14T19:00:00")), "eve");
});

test("the second reminder goes on the first hourly run within 2.5 hours of the start", () => {
  assert.equal(dueReminder({ ...sat, eveSentAt: new Date() }, eat("2026-11-14T03:00:00")), null);
  assert.equal(dueReminder({ ...sat, eveSentAt: new Date() }, eat("2026-11-14T04:00:00")), "soon"); // 2.5 h before 6:30
  const seven = { ...sat, startsAt: eat("2026-11-14T07:00:00"), eveSentAt: new Date() };
  assert.equal(dueReminder(seven, eat("2026-11-14T04:00:00")), null); // 3 h before
  assert.equal(dueReminder(seven, eat("2026-11-14T05:00:00")), "soon"); // 2 h before
  assert.equal(dueReminder({ ...sat, soonSentAt: new Date() }, eat("2026-11-14T05:00:00")), null);
});

test("no reminders once a walk starts, or if it's called off", () => {
  assert.equal(dueReminder(sat, eat("2026-11-14T06:30:00")), null);
  assert.equal(dueReminder({ ...sat, cancelled: true }, eat("2026-11-13T19:00:00")), null);
});

test("a walk posted on the morning itself only gets the second reminder", () => {
  assert.equal(dueReminder(sat, eat("2026-11-14T04:00:00")), "soon");
});

test("reminder wording names the walk, time and place, with no em dashes", () => {
  const w = { id: "x", title: "Menengai Crater rim", distanceKm: 14, meetingPoint: "Athletic Club gate", startsAt: eat("2026-11-14T06:30:00"), dressCode: "Green jersey" };
  const eve = reminderNote("eve", w);
  assert.equal(eve.title, "Tomorrow: Menengai Crater rim");
  assert.match(eve.body, /14 km\. Meet at Athletic Club gate, 6:30 am\. Wear: Green jersey\./);
  const soon = reminderNote("soon", w);
  assert.equal(soon.title, "We leave at 6:30 am: Menengai Crater rim");
  for (const n of [eve, soon]) assert.ok(!/[—–]/.test(n.title + n.body));
});

/* ───────────── Check-in ───────────── */

test("check-in opens 3 hours before and closes at the end of the next day", () => {
  const start = eat("2026-11-14T06:30:00");
  assert.equal(checkinOpen(start, eat("2026-11-14T03:00:00")), false);
  assert.equal(checkinOpen(start, eat("2026-11-14T03:30:00")), true);
  assert.equal(checkinOpen(start, eat("2026-11-14T18:00:00")), true);
  assert.equal(checkinOpen(start, eat("2026-11-15T23:59:00")), true);
  assert.equal(checkinOpen(start, eat("2026-11-16T00:00:00")), false);
});

/* ───────────── Record ───────────── */

test("distances: commas, decimals and long walks", () => {
  assert.equal(parseKm("12"), 12);
  assert.equal(parseKm("7,5"), 7.5);
  assert.equal(parseKm(" 8.25 "), 8.3);
  assert.equal(parseKm("0"), null);
  assert.equal(parseKm("-3"), null);
  assert.equal(parseKm("85"), 85); // longer than the old 60 km cap
  assert.equal(parseKm("1001"), null); // a typo, not a walk
  assert.equal(parseKm("19", 18), null); // more than the route
  assert.equal(parseKm("abc"), null);
  assert.equal(kmText(12.5), "12.5 km");
  assert.equal(kmText(1000), "1,000 km");
});

test("milestones: first walk, then kilometres and walk counts", () => {
  assert.deepEqual(milestones(0, 0).done, []);
  assert.equal(milestones(0, 0).next?.title, "First walk");
  const one = milestones(14, 1);
  assert.deepEqual(one.done.map((m) => m.title), ["First walk", "10 km"]);
  assert.equal(one.next?.title, "5 walks");
  const many = milestones(104, 6);
  assert.deepEqual(many.done.map((m) => m.title), ["First walk", "5 walks", "10 km", "50 km", "100 km"]);
});

test("the next milestone is whichever is close: a few km away beats walks", () => {
  assert.deepEqual(milestones(42, 3).next, { title: "50 km", line: "8 km to go." });
  assert.deepEqual(milestones(20, 4).next, { title: "5 walks", line: "1 more walk to go." });
});

test("milestone copy is encouraging, never a ranking", () => {
  const all = milestones(5000, 500).done.map((m) => m.title + m.line).join(" ");
  assert.ok(!/rank|top |leader|beat|fastest|best walker/i.test(all));
  assert.ok(!/[—–]/.test(all));
});

test("places walked: each once, first visit first, ignoring capitals", () => {
  assert.deepEqual(placesWalked([{ places: ["Nakuru town", "Menengai Crater"] }, { places: ["nakuru  Town", "Lake Nakuru"] }]), ["Nakuru town", "Menengai Crater", "Lake Nakuru"]);
  assert.deepEqual(splitPlaces("Lanet, Lake Nakuru\nBaharini,, "), ["Lanet", "Lake Nakuru", "Baharini"]);
});

test("headcount line is friendly", () => {
  assert.equal(comingText(0, false), "Be the first to say you're coming.");
  assert.equal(comingText(1, true), "You're coming.");
  assert.equal(comingText(2, true), "You and 1 other are coming.");
  assert.equal(comingText(34, true), "You and 33 others are coming.");
  assert.equal(comingText(1, false), "1 person is coming.");
});

/* ───────────── Forms ───────────── */

const form = (o: Record<string, string>) => (k: string) => o[k];
const good = { title: "Menengai Crater rim", places: "Nakuru town, Menengai", distance: "14", meetingPoint: "Athletic Club gate", mapUrl: "maps.app.goo.gl/abc", day: "2026-11-14", time: "06:30", dressCode: "Green jersey", notes: "", campaignId: "" };

test("a walk form turns into a walk at the right moment", () => {
  const r = parseWalk(form(good));
  assert.ok("value" in r);
  assert.equal(r.value.startsAt.toISOString(), "2026-11-14T03:30:00.000Z");
  assert.deepEqual(r.value.places, ["Nakuru town", "Menengai"]);
  assert.equal(r.value.mapUrl, "https://maps.app.goo.gl/abc");
  assert.equal(r.value.notes, null);
});

test("a walk form says what's missing", () => {
  assert.deepEqual(parseWalk(form({ ...good, title: " " })), { error: "Give the route a name, for example “Menengai Crater rim”." });
  assert.deepEqual(parseWalk(form({ ...good, distance: "" })), { error: "Enter the distance in km, for example 18." });
  assert.deepEqual(parseWalk(form({ ...good, meetingPoint: "" })), { error: "Say where everyone meets." });
  assert.ok("error" in parseWalk(form({ ...good, day: "" })));
});

test("map links: web links only", () => {
  assert.equal(mapLink(""), null);
  assert.equal(mapLink("https://maps.google.com/?q=Nakuru"), "https://maps.google.com/?q=Nakuru");
  assert.equal(mapLink("javascript:alert(1)"), false);
});

test("campaign dates: one day or a range, never backwards", () => {
  const c = parseCampaign(form({ name: "World Mental Health Day", startsOn: "2027-10-10", endsOn: "" }));
  assert.ok("value" in c && c.value.endsOn === "2027-10-10");
  assert.ok("error" in parseCampaign(form({ name: "X", startsOn: "2027-10-10", endsOn: "2027-10-01" })));
});

test("phone numbers: Kenyan formats in, nonsense out", () => {
  assert.equal(parsePhone("0712 345 678"), "0712 345 678");
  assert.equal(parsePhone("+254712345678"), "+254712345678");
  assert.equal(parsePhone(""), null);
  assert.equal(parsePhone("call me"), false);
  assert.equal(parsePhone("123"), false);
});

/* ───────────── The Wednesday market ───────────── */

test("the market opens on Wednesdays only, in Nakuru time", () => {
  assert.equal(marketOpen(eat("2026-11-18T00:05:00")), true); // Wednesday, just after midnight
  assert.equal(marketOpen(eat("2026-11-18T23:55:00")), true);
  assert.equal(marketOpen(eat("2026-11-17T23:55:00")), false); // Tuesday night
  assert.equal(marketOpen(eat("2026-11-19T00:05:00")), false); // Thursday
  // 21:30 UTC on Tuesday is already Wednesday 00:30 in Nakuru.
  assert.equal(marketOpen(new Date("2026-11-17T21:30:00Z")), true);
});

test("the next market day is today on a Wednesday, otherwise the coming one", () => {
  assert.equal(nextMarketDay(eat("2026-11-18T10:00:00")), "2026-11-18");
  assert.equal(nextMarketDay(eat("2026-11-19T10:00:00")), "2026-11-25");
  assert.equal(nextMarketDay(eat("2026-11-16T10:00:00")), "2026-11-18");
});

test("a listing stays up for exactly a week", () => {
  const posted = eat("2026-11-18T09:00:00");
  assert.equal(listingLive(posted, eat("2026-11-25T08:59:00")), true);
  assert.equal(listingLive(posted, eat("2026-11-25T09:00:00")), false);
  assert.equal(daysLeft(posted, eat("2026-11-18T09:00:00")), 7);
  assert.equal(daysLeft(posted, eat("2026-11-24T10:00:00")), 1);
  assert.equal(daysLeft(posted, eat("2026-11-26T10:00:00")), 0);
});

test("prices read the way people say them", () => {
  assert.equal(priceText(1500), "KSh 1,500");
  assert.equal(priceText(3500, "night"), "KSh 3,500 / night");
  assert.equal(priceText(800, "kg"), "KSh 800 / kg");
  assert.equal(priceText(null, "night"), "Ask for price");
  assert.equal(priceText(1500, "nonsense"), "KSh 1,500");
  assert.equal(priceText(null), "Ask for price");
  assert.equal(priceText(0), "Free");
});

test("Kenyan numbers become WhatsApp numbers", () => {
  assert.equal(whatsappNumber("0712 345 678"), "254712345678");
  assert.equal(whatsappNumber("0110 345 678"), "254110345678");
  assert.equal(whatsappNumber("+254 712 345 678"), "254712345678");
  assert.equal(whatsappNumber("712345678"), "254712345678");
  assert.match(whatsappLink("0712 345 678", "Hi, is it available?"), /^https:\/\/wa\.me\/254712345678\?text=Hi%2C%20is%20it%20available%3F$/);
});

test("the sell form checks what it needs", () => {
  const phone = (v: unknown) => (String(v ?? "").trim() ? String(v) : null);
  const form = (o: Record<string, string>) => (k: string) => o[k];
  const ok = parseListing(form({ title: "  Honey   jar ", price: "1,500", category: "food", phone: "0712345678" }), phone);
  const v = "value" in ok ? ok.value : undefined;
  assert.equal(v?.title, "Honey jar");
  assert.equal(v?.priceKsh, 1500);
  const noPrice = parseListing(form({ title: "Chapati", price: "", category: "food", phone: "0712345678" }), phone);
  assert.equal("value" in noPrice ? noPrice.value?.priceKsh : "error", null);
  assert.ok("error" in parseListing(form({ title: "ok", category: "food", phone: "0712345678" }), phone));
  assert.ok("error" in parseListing(form({ title: "Honey", price: "12.50", category: "food", phone: "0712345678" }), phone));
  assert.ok("error" in parseListing(form({ title: "Honey", category: "cars", phone: "0712345678" }), phone));
  assert.ok("error" in parseListing(form({ title: "Honey", category: "food", phone: "" }), phone));
  const stay = parseListing(form({ title: "Studio flat in Milimani", price: "3500", priceUnit: "night", negotiable: "1", location: "  Milimani,   Nakuru ", category: "stays", phone: "0712345678" }), phone);
  const sv = "value" in stay ? stay.value : undefined;
  assert.equal(sv?.priceUnit, "night");
  assert.equal(sv?.negotiable, true);
  assert.equal(sv?.location, "Milimani, Nakuru");
  // No price: "per night" and "negotiable" mean nothing, so they're dropped.
  const ask = parseListing(form({ title: "Studio flat", price: "", priceUnit: "night", negotiable: "1", category: "stays", phone: "0712345678" }), phone);
  assert.deepEqual("value" in ask ? [ask.value?.priceUnit, ask.value?.negotiable] : [], ["item", false]);
  assert.ok("error" in parseListing(form({ title: "Studio", price: "100", priceUnit: "decade", category: "stays", phone: "0712345678" }), phone));
});

/* ───────────── The club feed ───────────── */

test("a post needs words or a photo", () => {
  assert.ok("error" in parsePost("   ", 0));
  assert.ok("value" in parsePost("", 1));
  assert.ok("value" in parsePost("Great walk!", 0));
});

test("post times read naturally", () => {
  const now = eat("2026-11-18T10:00:00");
  assert.equal(timeAgo(eat("2026-11-18T09:59:40"), now), "Just now");
  assert.equal(timeAgo(eat("2026-11-18T09:45:00"), now), "15 min");
  assert.equal(timeAgo(eat("2026-11-18T07:00:00"), now), "3 h");
  assert.equal(timeAgo(eat("2026-11-17T08:00:00"), now), "Yesterday");
  assert.equal(timeAgo(eat("2026-11-14T08:00:00"), now), "Sat 14 Nov");
});

test("photos are recognised by their bytes, not their name", () => {
  assert.equal(photoType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])), "image/jpeg");
  assert.equal(photoType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), "image/png");
  assert.equal(photoType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0])), "image/webp");
  assert.equal(photoType(new TextEncoder().encode("<svg onload=alert(1)>")), null);
});

test("a new post's notification names the poster and opens the post", () => {
  const n = postNote({ id: "p1", authorName: "Wanjiru Kamau", body: "See you at 6:30!", photoCount: 0 });
  assert.equal(n.title, "Wanjiru posted in Community");
  assert.equal(n.body, "See you at 6:30!");
  assert.equal(n.url, "/community/p1");
  assert.equal(n.tag, "post-p1");
  assert.equal(postNote({ id: "p2", authorName: "", body: "", photoCount: 2 }).body, "Shared 2 photos.");
  assert.equal(postNote({ id: "p3", authorName: "Otieno", body: "  ", photoCount: 1 }).title, "Otieno posted in Community");
  const long = postNote({ id: "p4", authorName: "A", body: "word ".repeat(60), photoCount: 0 }).body;
  assert.ok(long.length <= 110 && long.endsWith("…"));
});

test("a reply's notification goes to the post and buzzes again", () => {
  const n = replyNote({ postId: "p1", authorName: "Akinyi Ouma", body: "Count me\nin!" });
  assert.equal(n.title, "Akinyi replied to your post");
  assert.equal(n.body, "Count me in!");
  assert.equal(n.url, "/community/p1");
  assert.equal(n.renotify, true);
});

test("badges show a count, nothing at zero, and 9+ past nine", () => {
  assert.equal(badgeText(0), "");
  assert.equal(badgeText(-2), "");
  assert.equal(badgeText(3), "3");
  assert.equal(badgeText(9), "9");
  assert.equal(badgeText(14), "9+");
});

test("likes on one post read as one line", () => {
  assert.equal(likersText(["Akinyi Ouma"]), "Akinyi");
  assert.equal(likersText(["Akinyi Ouma", "Kamau Njoroge"]), "Akinyi and Kamau");
  assert.equal(likersText(["Akinyi", "Kamau", "Njeri"]), "Akinyi, Kamau and 1 other");
  assert.equal(likersText(["Akinyi", "Kamau", "Njeri", "Otieno", "", "Chebet", "Mutua", "Kiprono", "Wanjiru"]), "Akinyi, Kamau and 7 others");
});

test("an answer to your comment says so, and opens the post", () => {
  const n = commentReplyNote({ postId: "p9", authorName: "Kibet Rotich", body: "Agreed!" });
  assert.equal(n.title, "Kibet replied to your comment");
  assert.equal(n.url, "/community/p9");
  assert.notEqual(n.tag, replyNote({ postId: "p9", authorName: "K", body: "x" }).tag);
});

test("in-app browsers are spotted, real browsers aren't", () => {
  const android = "Mozilla/5.0 (Linux; Android 14; SM-A145F Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36";
  assert.equal(inAppBrowserFor(`${android} WhatsApp/2.24.13`), "WhatsApp");
  assert.equal(inAppBrowserFor(`${android} [FB_IAB/FB4A;FBAV/470.0]`), "Facebook");
  assert.equal(inAppBrowserFor(android), "another app");
  assert.equal(inAppBrowserFor("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0"), "Instagram");
  // Chrome on Android, Samsung Internet and Safari on iPhone are real browsers.
  assert.equal(inAppBrowserFor("Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36"), null);
  assert.equal(inAppBrowserFor("Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36"), null);
  assert.equal(inAppBrowserFor("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"), null);
});

/* ───────────── Chats and removing members ───────────── */

test("each pair of members has one chat, whoever starts it", () => {
  assert.deepEqual(pair("bob", "amy"), { userA: "amy", userB: "bob" });
  assert.deepEqual(pair("amy", "bob"), pair("bob", "amy"));
  const c = pair("amy", "bob");
  assert.equal(sideOf(c, "amy"), "a");
  assert.equal(sideOf(c, "bob"), "b");
  assert.equal(sideOf(c, "eve"), null);
  assert.equal(otherOf(c, "amy"), "bob");
  assert.equal(otherOf(c, "bob"), "amy");
});

test("a message needs words, keeps line breaks and has a length limit", () => {
  assert.ok("error" in parseMessage("   "));
  assert.ok("error" in parseMessage(undefined));
  assert.deepEqual(parseMessage("  Hi Akinyi \r\nSee you Saturday "), { value: "Hi Akinyi \nSee you Saturday" });
  assert.deepEqual(parseMessage("one\n\n\n\n\ntwo"), { value: "one\n\ntwo" });
  const long = parseMessage("x".repeat(MESSAGE_MAX + 50));
  assert.equal("value" in long ? long.value?.length : 0, MESSAGE_MAX);
});

test("a removal reason is optional and kept short", () => {
  assert.equal(parseReason(""), null);
  assert.equal(parseReason("   "), null);
  assert.equal(parseReason("  Selling   outside the market "), "Selling outside the market");
  assert.equal(parseReason("y".repeat(500))?.length, 200);
});

test("a message notification names the sender and opens the chat", () => {
  const n = messageNote({ chatId: "c1", authorName: "Akinyi Otieno", body: "Are you coming   on Saturday?" });
  assert.equal(n.title, "Akinyi Otieno");
  assert.equal(n.body, "Are you coming on Saturday?");
  assert.equal(n.url, "/chats/c1");
  assert.equal(n.tag, "chat-c1");
  assert.equal(n.renotify, true);
  assert.equal(messageNote({ chatId: "c1", authorName: " ", body: "Hi" }).title, "A member");
  assert.ok(messageNote({ chatId: "c1", authorName: "A", body: "z".repeat(300) }).body.endsWith("…"));
});

/* ───────────── Result ───────────── */

if (failures.length) {
  console.error(`\n${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`All ${passed} logic tests passed.`);
