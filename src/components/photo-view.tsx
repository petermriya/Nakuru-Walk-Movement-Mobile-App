import { Icon } from "@/components/ui";

const src = (id: string) => `/api/photo/${id}`;

/** Photos on a post in the feed: one large, or two or three side by side. */
export function PhotoGrid({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  const cols = ids.length === 1 ? "grid-cols-1" : ids.length === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className={`grid gap-1 overflow-hidden rounded-2xl ${cols}`}>
      {ids.map((id) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={id} src={src(id)} alt="" loading="lazy" className={`w-full bg-surface-2 object-cover ${ids.length === 1 ? "aspect-[4/3]" : "aspect-square"}`} />
      ))}
    </div>
  );
}

/** Photos you swipe through, on a post's or an item's own page. */
export function PhotoSwipe({ ids, alt }: { ids: string[]; alt: string }) {
  if (!ids.length) return null;
  if (ids.length === 1) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src(ids[0])} alt={alt} className="max-h-[70vh] w-full rounded-[24px] bg-surface-2 object-cover shadow-card" />;
  }
  return (
    <div className="swipe -mx-4 gap-2.5 px-4" style={{ scrollPaddingInline: 16 }}>
      {ids.map((id, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={id} src={src(id)} alt={`${alt}, photo ${i + 1} of ${ids.length}`} loading={i ? "lazy" : undefined} className="aspect-[4/5] w-[84%] rounded-[24px] bg-surface-2 object-cover shadow-card" />
      ))}
    </div>
  );
}

/** A market item's square picture, or a quiet tile when it has no photo. */
export function ItemPicture({ id, className = "" }: { id?: string; className?: string }) {
  return id ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src(id)} alt="" loading="lazy" className={`aspect-square w-full bg-surface-2 object-cover ${className}`} />
  ) : (
    <div className={`flex aspect-square w-full items-center justify-center bg-[linear-gradient(145deg,var(--surface-2),#e2e7d8)] text-control ${className}`}>
      <Icon.tag className="size-10" />
    </div>
  );
}
