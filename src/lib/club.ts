import "server-only";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { clubMembers, clubs } from "@/db/schema";
import { requireUser } from "@/lib/auth";

/** The club this person belongs to. One club for now; the first one they joined
    if there are ever several (a club switcher can come later). */
export const membershipOf = cache(async (userId: string) => {
  const [m] = await db
    .select({ club: clubs, role: clubMembers.role })
    .from(clubMembers)
    .innerJoin(clubs, eq(clubs.id, clubMembers.clubId))
    .where(eq(clubMembers.userId, userId))
    .orderBy(asc(clubMembers.joinedAt))
    .limit(1);
  return m ?? null;
});

/** Signed in and in a club, or sent where they can fix that. */
export async function requireMember() {
  const me = await requireUser();
  const m = await membershipOf(me.id);
  if (!m) redirect("/welcome");
  return { me, club: m.club, admin: m.role === "admin" };
}

export async function requireAdmin() {
  const ctx = await requireMember();
  if (!ctx.admin) redirect("/home");
  return ctx;
}
