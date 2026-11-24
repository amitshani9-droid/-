// Small shared UI pieces: drone illustration, icons, status chips.
export function Drone({ className = "", spinning = true, glow = false }) {
  const props = [[60, 60, false], [200, 60, true], [60, 200, true], [200, 200, false]];
  return (
    <svg viewBox="0 0 260 260" className={className} role="img" aria-label="רחפן FPV במבט מלמעלה">
      <defs>
        <radialGradient id="pg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--neon)" stopOpacity=".25" />
          <stop offset="100%" stopColor="var(--neon)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow && <circle cx="130" cy="130" r="125" fill="url(#pg)" />}
      {/* arms */}
      <g stroke="#2a3439" strokeWidth="16" strokeLinecap="round">
        <line x1="72" y1="72" x2="188" y2="188" />
        <line x1="188" y1="72" x2="72" y2="188" />
      </g>
      <g stroke="#3a474d" strokeWidth="2" fill="none">
        <line x1="72" y1="72" x2="188" y2="188" />
        <line x1="188" y1="72" x2="72" y2="188" />
      </g>
      {/* body / stack */}
      <rect x="104" y="96" width="52" height="68" rx="6" fill="#151c20" stroke="#3a474d" strokeWidth="2" />
      <rect x="114" y="110" width="32" height="32" rx="3" fill="#0d1215" stroke="var(--neon)" strokeOpacity=".5" />
      <text x="130" y="131" textAnchor="middle" fontSize="9" fill="var(--neon)" fontFamily="Share Tech Mono, monospace">FC</text>
      {/* camera */}
      <rect x="118" y="82" width="24" height="16" rx="3" fill="#1d262b" stroke="#4a585e" />
      <circle cx="130" cy="88" r="5" fill="#0a0f12" stroke="var(--neon)" strokeWidth="1.5" />
      <circle cx="131.5" cy="86.5" r="1.3" fill="var(--neon)" className="blink" />
      {/* motors + props */}
      {props.map(([x, y, rev], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="48" fill="none" stroke="var(--neon)" strokeOpacity=".10" strokeDasharray="3 5" />
          <g className={spinning ? "prop" + (rev ? " rev" : "") : ""}>
            <path d={`M${x - 44} ${y} Q${x - 22} ${y - 9} ${x} ${y} Q${x + 22} ${y + 9} ${x + 44} ${y} Q${x + 22} ${y - 3} ${x} ${y} Q${x - 22} ${y + 3} ${x - 44} ${y}Z`} fill="#c7d3d0" fillOpacity={spinning ? ".35" : ".8"} />
            <path d={`M${x} ${y - 44} Q${x + 9} ${y - 22} ${x} ${y} Q${x - 9} ${y + 22} ${x} ${y + 44} Q${x + 3} ${y + 22} ${x} ${y} Q${x - 3} ${y - 22} ${x} ${y - 44}Z`} fill="#c7d3d0" fillOpacity={spinning ? ".35" : ".8"} />
          </g>
          <circle cx={x} cy={y} r="11" fill="#20292e" stroke="#56656b" strokeWidth="2" />
          <circle cx={x} cy={y} r="3.5" fill="var(--neon)" fillOpacity=".8" />
        </g>
      ))}
    </svg>
  );
}

const PATHS = {
  frame: "M4 4l16 16M20 4L4 20M9 9h6v6H9z",
  motor: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 5a4 4 0 110 8 4 4 0 010-8z",
  stack: "M5 6h14v4H5zM5 14h14v4H5zM8 10v4M16 10v4",
  vtx: "M12 14v7M8 21h8M12 14a3 3 0 100-6 3 3 0 000 6zM6 5a8 8 0 0112 0M3.5 2.5a12 12 0 0117 0",
  camera: "M3 7h12v10H3zM15 10l6-3v10l-6-3",
  rx: "M7 10h10v8H7zM12 10V3M9 5l3-2 3 2",
  props: "M12 12c-6-1-8-4-8-5s3 0 8 5zm0 0c6 1 8 4 8 5s-3 0-8-5z",
  battery: "M3 8h16v8H3zM19 10h2v4h-2M6 10v4M9 10v4",
  radio: "M5 9h14v11H5zM9 9V3M15 9V3M9 14h0M15 14h0",
  goggles: "M3 9h18v7h-6l-3-3-3 3H3z",
  charger: "M13 2L5 14h6l-1 8 8-12h-6z",
  tools: "M14 6l4-4 4 4-4 4M18 6L7 17l-3 3-1-1 3-3L17 5",
  bnf: "M12 2l3 6h6l-5 4 2 7-6-4-6 4 2-7-5-4h6z",
};
export function Icon({ name, className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] || PATHS.frame} />
    </svg>
  );
}

export function Level({ level, children }) {
  const cls = "lv-" + (level || "ok");
  const sym = level === "error" ? "✕" : level === "warn" ? "!" : "✓";
  return <span className={`osd inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 border rounded-sm ${cls}`}><b>{sym}</b>{children}</span>;
}

export const ils = n => "₪" + Math.round(n).toLocaleString("he-IL");
