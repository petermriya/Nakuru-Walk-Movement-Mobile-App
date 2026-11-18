"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Icon } from "@/components/ui";
import { testSignInLink } from "./actions";

export function SignInForm({ google, testLinks, next }: { google: boolean; testLinks: boolean; next: string }) {
  const [googleState, setGoogleState] = useState<"idle" | "opening" | "error">("idle");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [link, setLink] = useState<string | null>(null);

  async function withGoogle() {
    setGoogleState("opening");
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next, errorCallbackURL: "/sign-in?error=1" });
    if (error) setGoogleState("error");
  }

  async function testLink(e: React.FormEvent) {
    e.preventDefault();
    setSent("sending");
    const { error } = await authClient.signIn.magicLink({ email: email.trim(), callbackURL: next });
    if (!error) setLink(await testSignInLink(email));
    setSent(error ? "error" : "sent");
  }

  return (
    <div className="space-y-6">
      {google && (
        <>
          <button type="button" className="btn btn-white w-full gap-3" disabled={googleState === "opening"} onClick={withGoogle}>
            <Icon.google className="size-5" />
            {googleState === "opening" ? "Opening Google…" : "Continue with Google"}
          </button>
          {googleState === "error" && <p className="text-[14px] text-negative" role="alert">Couldn’t reach Google. Check your connection and try again.</p>}
        </>
      )}
      {testLinks && (
        <form onSubmit={testLink} className="panel space-y-3 p-5">
          <p className="text-[14px] text-muted">On this Mac only: test accounts on a .test address sign in here without Google.</p>
          <label htmlFor="email" className="label">Test email</label>
          <input id="email" type="email" required className="field" placeholder="tester@nakuruwalk.test" value={email} onChange={(e) => setEmail(e.target.value)} />
          {sent === "sent" && link && (
            <a href={link} className="btn w-full" role="status">
              Sign in as {email.trim()}
            </a>
          )}
          {sent === "error" && <p role="alert" className="text-[14px] text-negative">Only .test addresses work here.</p>}
          <button className="btn btn-quiet w-full" disabled={sent === "sending"}>Send test link</button>
        </form>
      )}
    </div>
  );
}
