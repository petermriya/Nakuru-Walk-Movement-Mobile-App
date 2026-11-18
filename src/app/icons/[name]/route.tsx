import { ImageResponse } from "next/og";
import { MarkSvg } from "@/components/logo";
import { Mark } from "../../icon-art";

/* /icons/192 and /icons/512: the app icon (also used as maskable).
   /icons/badge: the sun and path alone in white, for Android's status bar,
   which shows only the shape. */
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const headers = { "Cache-Control": "public, max-age=604800, immutable" };
  if (name === "badge") return new ImageResponse(<div style={{ display: "flex" }}><MarkSvg size={96} mono /></div>, { width: 96, height: 96, headers });
  const size = name === "192" ? 192 : name === "512" ? 512 : 0;
  if (!size) return new Response("Not found", { status: 404 });
  return new ImageResponse(<Mark size={size} />, { width: size, height: size, headers });
}
