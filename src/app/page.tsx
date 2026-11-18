import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/** Opening the app: the walks if you're signed in, sign-in if not. */
export default async function Root() {
  redirect((await getSession()) ? "/home" : "/sign-in");
}
