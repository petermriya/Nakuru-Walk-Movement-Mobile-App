/* A walk's route: a line through every stop, each one named under its dot, so
   members can see the whole path at a glance. The line draws itself once when
   the screen opens (a clip that opens left to right, which every browser draws
   the same way), and holds still for anyone who has asked their phone for less motion. */

export function RouteLine({ stops, tone = "light" }: { stops: string[]; tone?: "light" | "dark" }) {
  const names = stops.map((s) => s.trim()).filter(Boolean);
  if (names.length < 2) return null;
  const W = 300;
  const H = 30;
  const pad = 7;
  const n = names.length;
  const xs = names.map((_, i) => pad + ((W - pad * 2) * i) / (n - 1));
  // A gentle rise and fall between stops, like a path over the land.
  const y = (i: number) => (i % 2 === 0 ? 17 : 11);
  let d = `M ${xs[0]} ${y(0)}`;
  for (let i = 1; i < n; i++) {
    const mid = (xs[i - 1] + xs[i]) / 2;
    d += ` C ${mid} ${y(i - 1)}, ${mid} ${y(i)}, ${xs[i]} ${y(i)}`;
  }
  const light = tone === "light";
  const stroke = light ? "#ffffff" : "var(--accent)";
  const fill = light ? "#0e4a2e" : "var(--surface)";
  const ends = light ? "text-white" : "text-ink";
  const middle = light ? "text-white/65" : "text-faint";

  // Quiet, like a route map: the stops in between are named just above the line,
  // small and light; start and finish sit below it, a little stronger. Each name gets
  // its own space, so nothing overlaps and long names are cut short rather than wrapping.
  const slot = 100 / (n - 1);
  const ROW = 16;
  const label = (i: number) => (xs[i] / W) * 100;

  const svg = (solid: boolean) => (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 block h-[30px] w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
      {solid ? (
        <path d={d} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ) : (
        <path d={d} fill="none" stroke={stroke} strokeOpacity={0.3} strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );

  return (
    <figure aria-label={`Route: ${names.join(", then ")}`}>
      {n > 2 && (
        <div className="relative mb-0.5" style={{ height: ROW }} aria-hidden>
          {names.slice(1, -1).map((name, k) => (
            <span
              key={k}
              className={`absolute -translate-x-1/2 truncate text-center text-[11.5px] leading-[16px] ${middle}`}
              style={{ left: `${label(k + 1)}%`, maxWidth: `calc(${slot}% - 4px)`, width: "max-content" }}
            >
              {name}
            </span>
          ))}
        </div>
      )}
      <div className="relative h-[30px]">
        {svg(false)}
        <div className="route-reveal absolute inset-0">{svg(true)}</div>
        {/* Stops sit on top as HTML, so they stay round however wide the phone is. */}
        {xs.map((x, i) => (
          <span
            key={i}
            aria-hidden
            className="route-stop absolute size-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px]"
            style={{ left: `${(x / W) * 100}%`, top: y(i), borderColor: stroke, background: i === 0 || i === n - 1 ? stroke : fill, animationDelay: `${150 + (950 * i) / (n - 1)}ms` }}
          />
        ))}
      </div>
      <div className={`mt-0.5 flex justify-between gap-4 text-[12.5px] leading-[16px] font-semibold ${ends}`} aria-hidden>
        <span className="min-w-0 truncate">{names[0]}</span>
        <span className="min-w-0 truncate text-right">{names[n - 1]}</span>
      </div>
    </figure>
  );
}
