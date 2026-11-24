// Interactive top-view schematic of the build. Each part is a node: teal = chosen, red = in an error,
// dashed = still missing. Errors draw a red line between the two parts involved. Click a node to pick that part.
import { CATEGORIES } from "@compat/src/index.js";

const POS = {
  frame: [160, 100], motors: [310, 52], props: [110, 248], stack: [210, 150], camera: [210, 82],
  vtx: [210, 218], receiver: [272, 150], battery: [148, 150], radio: [46, 300], goggles: [374, 300], charger: [210, 312], bnf: [210, 150],
};
const MOTORS = [[110, 52], [310, 52], [110, 248], [310, 248]];

function stateOf(cat, build, errors, missing) {
  if (errors.some(e => e.cats.includes(cat))) return "error";
  if (build[cat]) return "on";
  return missing.includes(cat) ? "missing" : "optional";
}
const COL = {
  on: { stroke: "var(--neon)", fill: "rgba(45,212,191,.14)", text: "#e6ecef" },
  error: { stroke: "var(--bad)", fill: "rgba(242,116,116,.16)", text: "#ffd5d5" },
  missing: { stroke: "#56606c", fill: "rgba(255,255,255,.02)", text: "#8d96a3", dash: "4 4" },
  optional: { stroke: "#353d47", fill: "transparent", text: "#5f6874", dash: "2 5" },
};

function Node({ cat, x, y, r = 17, state, label, onPick, children }) {
  const c = COL[state];
  return (
    <g role="button" tabIndex={0} aria-label={`${CATEGORIES[cat].label}: ${state === "on" ? "נבחר" : state === "error" ? "שגיאת תאימות" : "לא נבחר"}`}
      onClick={() => onPick(cat)} onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick(cat))} style={{ cursor: "pointer" }} className="bd-node">
      {children || <circle cx={x} cy={y} r={r} fill={c.fill} stroke={c.stroke} strokeWidth="1.8" strokeDasharray={c.dash} />}
      {state === "error" && <circle cx={x + r - 2} cy={y - r + 2} r="6" fill="var(--bad)" />}
      {label !== false && <text x={x} y={y + r + 14} textAnchor="middle" fontSize="11" fill={c.text} fontFamily="Heebo, sans-serif" fontWeight="600">{label || CATEGORIES[cat].label.split(" (")[0]}</text>}
    </g>
  );
}

export default function BuildDiagram({ build, errors, missing, mode, onPick }) {
  const st = c => stateOf(c, build, errors, missing);
  const lines = [];
  errors.forEach(e => {
    const cs = [...new Set(e.cats)].filter(c => POS[c] && (mode === "bnf" ? !CATEGORIES[c].airframe : true));
    if (cs.length >= 2) lines.push([POS[cs[0]], POS[cs[1]], e.title]);
  });
  const digital = build.vtx && build.vtx.includesCamera;
  const fr = COL[st("frame")];
  return (
    <div className="hud p-3 sm:p-4" style={{ background: "radial-gradient(70% 60% at 50% 45%, rgba(45,212,191,.06), transparent 70%), var(--panel)" }}>
      <div className="flex items-center justify-between px-1 mb-1">
        <h2 className="font-bold">תרשים הבילד</h2>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "var(--neon)" }} />נבחר</span>
          <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "var(--bad)" }} />שגיאה</span>
          <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full inline-block border border-dashed" style={{ borderColor: "#6b7480" }} />חסר</span>
        </div>
      </div>
      <svg viewBox="0 0 420 335" className="w-full h-auto max-h-[360px]" role="group" aria-label="תרשים הבילד. לחצו על חלק כדי לבחור אותו">
        {mode === "bnf" ? (
          <Node cat="bnf" x={210} y={150} state={st("bnf")} onPick={onPick} label={build.bnf ? build.bnf.name.split(" (")[0] : "רחפן מוכן"}>
            <g opacity={build.bnf ? 1 : .55}>
              <g stroke={COL[st("bnf")].stroke} strokeWidth="12" strokeLinecap="round" strokeOpacity=".5" strokeDasharray={COL[st("bnf")].dash}>
                <line x1="110" y1="52" x2="310" y2="248" /><line x1="310" y1="52" x2="110" y2="248" />
              </g>
              {MOTORS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="40" fill={COL[st("bnf")].fill} stroke={COL[st("bnf")].stroke} strokeWidth="1.5" strokeDasharray={COL[st("bnf")].dash} />)}
              <rect x="180" y="120" width="60" height="60" rx="10" fill="#161b21" stroke={COL[st("bnf")].stroke} strokeWidth="1.8" />
            </g>
          </Node>
        ) : (
          <>
            {/* frame arms */}
            <g role="button" tabIndex={0} aria-label="פריים" onClick={() => onPick("frame")} onKeyDown={e => e.key === "Enter" && onPick("frame")} style={{ cursor: "pointer" }}>
              <g stroke={st("frame") === "on" ? "#2a3a3a" : st("frame") === "error" ? "rgba(242,116,116,.35)" : "#232a32"} strokeWidth="16" strokeLinecap="round">
                <line x1="110" y1="52" x2="310" y2="248" /><line x1="310" y1="52" x2="110" y2="248" />
              </g>
              <g stroke={fr.stroke} strokeWidth="1.5" strokeDasharray={fr.dash} fill="none">
                <line x1="110" y1="52" x2="310" y2="248" /><line x1="310" y1="52" x2="110" y2="248" />
              </g>
              <text x="146" y="86" fontSize="11" fill={fr.text} fontFamily="Heebo, sans-serif" fontWeight="600" textAnchor="middle" transform="rotate(44 146 86)">{build.frame ? `פריים ${build.frame.size}״` : "פריים"}</text>
            </g>
            {/* props rings + motors */}
            <g role="button" tabIndex={0} aria-label="פרופלורים" onClick={() => onPick("props")} onKeyDown={e => e.key === "Enter" && onPick("props")} style={{ cursor: "pointer" }}>
              {MOTORS.map(([x, y], i) => { const c = COL[st("props")]; return <circle key={i} cx={x} cy={y} r="40" fill={st("props") === "on" ? "rgba(45,212,191,.05)" : "transparent"} stroke={c.stroke} strokeOpacity=".75" strokeWidth="1.4" strokeDasharray={c.dash || "1 0"} />; })}
              <text x="110" y="304" textAnchor="middle" fontSize="11" fill={COL[st("props")].text} fontFamily="Heebo, sans-serif" fontWeight="600">{build.props ? `פרופים ${build.props.size}״` : "פרופלורים"}</text>
            </g>
            <g role="button" tabIndex={0} aria-label="מנועים" onClick={() => onPick("motors")} onKeyDown={e => e.key === "Enter" && onPick("motors")} style={{ cursor: "pointer" }}>
              {MOTORS.map(([x, y], i) => { const c = COL[st("motors")]; return <circle key={i} cx={x} cy={y} r="13" fill={c.fill === "transparent" ? "#161b21" : c.fill} stroke={c.stroke} strokeWidth="1.8" strokeDasharray={c.dash} />; })}
              {st("motors") === "error" && <circle cx={321} cy={41} r="6" fill="var(--bad)" />}
              <text x="310" y="108" textAnchor="middle" fontSize="11" fill={COL[st("motors")].text} fontFamily="Heebo, sans-serif" fontWeight="600">{build.motors ? `${build.motors.stator} · ${build.motors.kv}KV` : "מנועים"}</text>
            </g>
            <Node cat="stack" x={210} y={150} state={st("stack")} onPick={onPick} label={false}>
              <rect x="182" y="122" width="56" height="56" rx="9" fill={COL[st("stack")].fill === "transparent" ? "#161b21" : COL[st("stack")].fill} stroke={COL[st("stack")].stroke} strokeWidth="1.8" strokeDasharray={COL[st("stack")].dash} />
              <text x="210" y="148" textAnchor="middle" fontSize="11" fill={COL[st("stack")].text} fontFamily="Heebo, sans-serif" fontWeight="700">FC</text>
              <text x="210" y="163" textAnchor="middle" fontSize="10" fill={COL[st("stack")].text} fontFamily="Heebo, sans-serif" opacity=".8">ESC</text>
            </Node>
            <Node cat="camera" x={210} y={82} r={13} state={digital ? (st("vtx") === "error" ? "error" : st("vtx")) : st("camera")} onPick={c => onPick(digital ? "vtx" : c)} label="מצלמה" />
            <Node cat="vtx" x={210} y={218} r={14} state={st("vtx")} onPick={onPick} label="VTX" />
            <Node cat="receiver" x={272} y={150} r={12} state={st("receiver")} onPick={onPick} label="מקלט" />
            <Node cat="battery" x={148} y={150} r={15} state={st("battery")} onPick={onPick} label="סוללה">
              <rect x="128" y="138" width="40" height="24" rx="5" fill={COL[st("battery")].fill === "transparent" ? "#161b21" : COL[st("battery")].fill} stroke={COL[st("battery")].stroke} strokeWidth="1.8" strokeDasharray={COL[st("battery")].dash} />
              <text x="148" y="154" textAnchor="middle" fontSize="10" fill={COL[st("battery")].text} fontFamily="Heebo, sans-serif" fontWeight="700">{build.battery ? `${build.battery.cells}S` : "+"}</text>
            </Node>
          </>
        )}
        {mode === "bnf" && <Node cat="battery" x={148} y={290} r={15} state={st("battery")} onPick={onPick} label={build.battery ? `סוללה ${build.battery.cells}S` : "סוללה"} />}
        <Node cat="radio" x={46} y={290} r={15} state={st("radio")} onPick={onPick} label="שלט" />
        <Node cat="goggles" x={374} y={290} r={15} state={st("goggles")} onPick={onPick} label="משקפות" />
        <Node cat="charger" x={mode === "bnf" ? 272 : 210} y={mode === "bnf" ? 290 : 300} r={12} state={st("charger")} onPick={onPick} label="מטען" />
        {/* error connectors */}
        {lines.map(([a, b, t], i) => (
          <g key={i} pointerEvents="none">
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--bad)" strokeWidth="2" strokeDasharray="5 4" className="err-line" />
            <circle cx={(a[0] + b[0]) / 2} cy={(a[1] + b[1]) / 2} r="8" fill="var(--bad)" />
            <text x={(a[0] + b[0]) / 2} y={(a[1] + b[1]) / 2 + 4} textAnchor="middle" fontSize="11" fill="#1a0505" fontWeight="800">!</text>
          </g>
        ))}
      </svg>
      <p className="text-[11px] text-muted text-center -mt-1">לחצו על חלק בתרשים כדי לבחור אותו</p>
    </div>
  );
}
