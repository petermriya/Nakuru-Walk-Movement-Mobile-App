import { getSession } from "@/lib/auth";
import { membershipOf } from "@/lib/club";
import { photoData } from "@/lib/queries";

/* A photo from a post or a market item. Only members of the club it belongs
   to can load it. Photos never change, so the phone keeps its copy. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });
  const m = await membershipOf(session.user.id);
  if (!m) return new Response(null, { status: 403 });
  const photo = await photoData(id, m.club.id);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
