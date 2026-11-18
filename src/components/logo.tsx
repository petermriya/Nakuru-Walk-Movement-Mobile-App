/* The Nakuru Walk mark: a path winding up a green hill toward the morning sun.
   Drawn once here and used for the app icons too, so they never drift apart. */

export function MarkSvg({ size, mono = false }: { size: number; mono?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {!mono && <rect width="100" height="100" fill="#1d6b3e" />}
      <circle cx="64" cy="33" r="11" fill={mono ? "#fff" : "#f2b445"} />
      {!mono && <path d="M0 74 C 22 56, 40 54, 58 62 S 86 62, 100 54 V100 H0Z" fill="#2c8550" />}
      <path d="M40 100 C 44 86, 68 82, 58 70 S 46 58, 56 50" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

/** In the app: the mark with rounded corners, like its home-screen icon. */
export function Logo({ size = 48 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0 overflow-hidden" style={{ width: size, height: size, borderRadius: size * 0.24 }}>
      <MarkSvg size={size} />
    </span>
  );
}
