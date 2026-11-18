import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { Icon } from "@/components/ui";
import { requireAdmin } from "@/lib/club";
import { walkData } from "@/lib/queries";
import { NewCodeButton } from "../parts";
import { KeepFresh } from "./fresh";

export const metadata = { title: "Check-in code" };

/** Full screen, for holding up at the start: members scan it with their phone camera. */
export default async function QrPage({ params }: PageProps<"/w/[id]/qr">) {
  const { id } = await params;
  const { me, club } = await requireAdmin();
  const { walk, there } = await walkData(id, club.id, me.id);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/w/${walk.id}/here?c=${walk.checkinCode}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#13261a", light: "#ffffff" } });

  return (
    <main className="flex min-h-dvh flex-col items-center bg-accent px-6 pt-[max(env(safe-area-inset-top),16px)] pb-10 text-white">
      <KeepFresh />
      <div className="flex w-full max-w-[420px] items-center">
        <Link href={`/w/${walk.id}`} className="-ml-2 inline-flex h-11 items-center gap-1 pr-3 pl-2 text-[15px] text-white/80">
          <Icon.back className="size-5" /> Back
        </Link>
      </div>
      <p className="mt-4 text-[15px] font-semibold text-white/80">{walk.title}</p>
      <h1 className="display mt-1 text-center text-[32px]">Scan to check in</h1>
      <div className="mt-6 w-full max-w-[340px] rounded-[28px] bg-white p-5" role="img" aria-label="Check-in code" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-6 text-center text-[16px] text-white/90">Open your phone camera and point it at the code.</p>
      <p className="display mt-6 text-[44px]">{there}</p>
      <p className="text-[14px] text-white/80">checked in so far</p>
      <div className="mt-auto pt-10">
        <NewCodeButton walkId={walk.id} />
      </div>
    </main>
  );
}
