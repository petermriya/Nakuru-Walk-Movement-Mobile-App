import Link from "next/link";
import { Page } from "@/components/ui";

export default function NotFound() {
  return (
    <Page className="pt-20 text-center">
      <h1 className="display text-[32px]">This path doesn’t go anywhere</h1>
      <p className="mt-3 text-[16px] text-muted">The page may have moved, or the walk was removed.</p>
      <Link href="/home" className="btn mt-8">Back to walks</Link>
    </Page>
  );
}
