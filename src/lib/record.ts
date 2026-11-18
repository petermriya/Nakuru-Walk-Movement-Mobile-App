/* A member's own record: how far they've walked, how many walks, and where.
   No ranking against anyone else, ever: the club is company, not competition. */

/** Walks can be any length (day walks, long hikes, multi-day trips). This only catches typos like 180 for 18.0. */
export const MAX_KM = 1000;

/** Round to one decimal place, the way km are stored. */
export const km1 = (n: number) => Math.round(n * 10) / 10;

/** "12 km", "7.5 km" */
export const kmText = (n: number) => `${km1(n).toLocaleString("en", { maximumFractionDigits: 1 })} km`;

/** A typed distance → a number between 0.1 and the limit, or null. Accepts "12,5" too. */
export function parseKm(v: unknown, limit = MAX_KM): number | null {
  const n = Number(String(v ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const r = km1(n);
  return r >= 0.1 && r <= limit ? r : null;
}

export type Milestone = { key: string; title: string; line: string };

const WALK_STEPS: [number, string, string][] = [
  [1, "First walk", "You came out and did it. Welcome to the club."],
  [5, "5 walks", "Five weekends well spent."],
  [10, "10 walks", "Ten walks in. You're a regular now."],
  [25, "25 walks", "Twenty-five walks with the club."],
  [50, "50 walks", "Fifty walks. Nakuru knows your footsteps."],
  [100, "100 walks", "A hundred walks. Thank you for showing up."],
];

const KM_STEPS: [number, string, string][] = [
  [10, "10 km", "Your first 10 km with the club."],
  [50, "50 km", "Fifty kilometres. Your legs know the way now."],
  [100, "100 km", "A hundred kilometres on your own two feet."],
  [250, "250 km", "Two hundred and fifty kilometres together."],
  [500, "500 km", "Five hundred kilometres. Remarkable."],
  [1000, "1,000 km", "A thousand kilometres. A true walker of Nakuru."],
];

/** Every milestone reached, oldest first, and the next one to look forward to. */
export function milestones(totalKm: number, walksDone: number) {
  const done: Milestone[] = [];
  for (const [n, title, line] of WALK_STEPS) if (walksDone >= n) done.push({ key: `w${n}`, title, line });
  for (const [n, title, line] of KM_STEPS) if (totalKm >= n) done.push({ key: `k${n}`, title, line });

  const nextWalk = WALK_STEPS.find(([n]) => walksDone < n);
  const nextKm = KM_STEPS.find(([n]) => totalKm < n);
  let next: { title: string; line: string } | null = null;
  if (walksDone === 0) next = { title: "First walk", line: "Your first walk is the big one. Come along this weekend." };
  else if (nextKm && (!nextWalk || nextKm[0] - totalKm <= 15)) next = { title: nextKm[1], line: `${kmText(nextKm[0] - totalKm)} to go.` };
  else if (nextWalk) next = { title: nextWalk[1], line: `${nextWalk[0] - walksDone} more ${nextWalk[0] - walksDone === 1 ? "walk" : "walks"} to go.` };
  return { done, next };
}

/** Distinct places walked, in the order first visited. Capitals and spacing don't count. */
export function placesWalked(walksInOrder: { places: string[] }[]) {
  const seen = new Map<string, string>();
  for (const w of walksInOrder)
    for (const p of w.places) {
      const name = p.trim().replace(/\s+/g, " ");
      const k = name.toLowerCase();
      if (name && !seen.has(k)) seen.set(k, name);
    }
  return [...seen.values()];
}

/** "Menengai Crater, Lake Nakuru, Ngata" from what an admin typed (commas or new lines). */
export function splitPlaces(v: string) {
  return v
    .split(/[,\n]/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 12)
    .map((s) => s.slice(0, 60));
}

/** A friendly line for the walk page headcount, never a ranking. */
export function comingText(n: number, mine: boolean) {
  if (n === 0) return "Be the first to say you're coming.";
  if (mine) return n === 1 ? "You're coming." : `You and ${n - 1} ${n - 1 === 1 ? "other" : "others"} are coming.`;
  return `${n} ${n === 1 ? "person is" : "people are"} coming.`;
}
