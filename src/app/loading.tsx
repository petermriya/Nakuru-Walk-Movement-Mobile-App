import { Page } from "@/components/ui";

/** Shown instantly while a screen loads. */
export default function Loading() {
  return (
    <Page>
      <div className="loading-bar mt-16 h-[220px] rounded-[22px] bg-surface" />
      <div className="loading-bar mt-4 h-16 rounded-[22px] bg-surface" />
      <div className="loading-bar mt-4 h-16 rounded-[22px] bg-surface" />
    </Page>
  );
}
