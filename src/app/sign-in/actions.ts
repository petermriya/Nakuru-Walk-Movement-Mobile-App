"use server";

import { testLinks, testLinksEnabled } from "@/lib/auth";

/** On this Mac only: hand the test sign-in link to the page, so nobody has to read the server log. */
export async function testSignInLink(email: string) {
  const key = String(email).trim().toLowerCase();
  if (!testLinksEnabled || !key.endsWith(".test")) return null;
  const url = testLinks().get(key) ?? null;
  testLinks().delete(key);
  return url;
}
