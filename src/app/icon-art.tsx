import { MarkSvg } from "@/components/logo";

/** The app icon, full bleed: Android and iPhone round the corners themselves.
    The sun and path sit inside the centre 80%, so a circle crop keeps them. */
export function Mark({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, display: "flex" }}>
      <MarkSvg size={size} />
    </div>
  );
}
