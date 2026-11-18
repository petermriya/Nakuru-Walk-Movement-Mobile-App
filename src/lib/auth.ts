import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/** Members sign in with Google. On a Mac, test accounts on a .test address can
    sign in with a link printed in the terminal instead. Never live. */
export const testLinksEnabled =
  process.env.LOCAL_EMAIL_LINKS === "1" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.BETTER_AUTH_URL ?? "");

/** The latest test sign-in link per .test address, in this server's memory only. */
export const testLinks = () => ((globalThis as { __testLinks?: Map<string, string> }).__testLinks ??= new Map<string, string>());

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: googleEnabled
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
    : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 180, // stay signed in for half a year
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  onAPIError: { errorURL: "/sign-in" },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        if (!testLinksEnabled || !email.toLowerCase().endsWith(".test")) throw new Error("Sign in with Google.");
        console.log(`\n  Sign-in link for ${email}\n  ${url}\n`);
        // Also kept briefly so the sign-in page on this Mac can show it (see testSignInLink).
        testLinks().set(email.toLowerCase(), url);
      },
    }),
    nextCookies(),
  ],
});

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** For pages and actions that need someone signed in. */
export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  return s.user;
}
