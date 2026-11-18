import Link from "next/link";
import { redirect } from "next/navigation";
import { InstallApp } from "@/components/install";
import { OpenInBrowser } from "@/components/open-in-browser";
import { Logo } from "@/components/logo";
import { getSession, googleEnabled, testLinksEnabled } from "@/lib/auth";
import { SignInForm } from "./form";

export const metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: PageProps<"/sign-in">) {
  const { next, deleted, error } = await searchParams;
  const to = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/home";
  if (await getSession()) redirect(to);
  const joining = to.startsWith("/join/");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-6 pt-[12vh] pb-10">
      <Logo size={64} />
      <h1 className="display mt-8 text-[44px]">Nakuru Walk</h1>
      <p className="mt-4 text-[19px] leading-snug">
        {joining ? "You’re one tap from joining Nakuru Walk Movement." : "See the next walk, say you’re coming, and keep a record of every kilometre."}
      </p>
      {error && <p className="panel mt-8 p-5 text-[16px]" role="alert">That sign-in didn’t finish. Nothing is wrong with your account. Try again below.</p>}
      {deleted && <p className="panel mt-8 p-5 text-[16px]" role="status">Your account and everything in it have been deleted.</p>}
      <OpenInBrowser className="mt-8" />
      <div className="mt-10">
        {googleEnabled || testLinksEnabled ? (
          <>
            <SignInForm google={googleEnabled} testLinks={testLinksEnabled} next={to} />
            <InstallApp where="sign-in" />
          </>
        ) : (
          <p className="panel p-6 text-[16px]">Sign-in opens soon. The admins will share the link in your WhatsApp group.</p>
        )}
      </div>
      <p className="mt-auto pt-12 text-[13px] text-muted">
        New here? Signing in creates your account. By continuing you agree to the <Link href="/terms" className="underline">terms</Link> and{" "}
        <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
    </main>
  );
}
