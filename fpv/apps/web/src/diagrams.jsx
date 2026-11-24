// Teaching diagrams (inline SVG). Colors come from CSS variables so they match the app theme.
const C = { line: "#3a4350", fill: "#161b21", fill2: "#1d232b", text: "#c3cbd5", muted: "#8d96a3", accent: "var(--neon)", warn: "var(--warn)", bad: "var(--bad)", red: "#ef6b6b", black: "#9aa3ae", yellow: "#e9c46a", blue: "#6aa7ef" };
const T = ({ x, y, children, size = 12, fill = C.text, anchor = "middle", weight = 500 }) => (
  <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontWeight={weight} fontFamily="Heebo, system-ui, sans-serif">{children}</text>
);

function Frame({ title, caption, children, viewBox }) {
  return (
    <figure className="my-4">
      <div className="border border-line bg-panel p-3 sm:p-4" style={{ background: "#10141a" }}>
        <svg viewBox={viewBox} className="w-full h-auto" role="img" aria-label={title}>{children}</svg>
      </div>
      {caption && <figcaption className="text-xs text-muted mt-2 leading-relaxed">{caption}</figcaption>}
    </figure>
  );
}

/** Receiver → flight controller UART wiring, with TX/RX crossed. */
export function WiringRx({ uart = 2 }) {
  const pads = [["5V", C.red], ["GND", C.black], [`TX${uart}`, C.yellow], [`RX${uart}`, C.blue]];
  const rx = [["5V", C.red], ["GND", C.black], ["RX", C.blue], ["TX", C.yellow]];
  const yF = [60, 95, 130, 165], yR = [60, 95, 130, 165];
  const map = [0, 1, 3, 2]; // FC pad i -> receiver pin index
  return (
    <Frame title="חיווט מקלט לבקר הטיסה" viewBox="0 0 420 220" caption={`TX של הבקר מתחבר ל-RX של המקלט, ו-RX ל-TX. אותו עיקרון בכל UART (גם ב-VTX דיגיטלי).`}>
      <rect x="250" y="30" width="140" height="160" rx="12" fill={C.fill} stroke={C.line} />
      <T x={320} y={22} size={12} fill={C.muted}>בקר הטיסה (FC)</T>
      <rect x="30" y="40" width="100" height="140" rx="12" fill={C.fill2} stroke={C.line} />
      <T x={80} y={32} size={12} fill={C.muted}>מקלט ELRS</T>
      {pads.map(([l, col], i) => (
        <g key={l}>
          <rect x="262" y={yF[i] - 11} width="34" height="22" rx="4" fill="#c9a24a" opacity=".85" />
          <T x={340} y={yF[i] + 4} anchor="middle" size={12.5} weight={700}>{l}</T>
          <path d={`M262 ${yF[i]} C 200 ${yF[i]}, 190 ${yR[map[i]]}, 130 ${yR[map[i]]}`} stroke={col} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      ))}
      {rx.map(([l], i) => (
        <g key={"r" + l}>
          <circle cx="122" cy={yR[i]} r="5" fill="#c9a24a" />
          <T x={92} y={yR[i] + 4} size={12.5} weight={700}>{l}</T>
        </g>
      ))}
      <g transform="translate(196,148)">
        <rect x="-26" y="-11" width="52" height="20" rx="10" fill="rgba(45,212,191,.12)" stroke="var(--neon)" strokeOpacity=".5" />
        <T x={0} y={4} size={11} fill={C.accent} weight={700}>הצלבה</T>
      </g>
    </Frame>
  );
}

/** What "2207" means: stator diameter × height. */
export function StatorDiagram() {
  return (
    <Frame title="מה המספר 2207 אומר" viewBox="0 0 420 200" caption="שתי הספרות הראשונות: קוטר הסטטור במ״מ. שתי האחרונות: הגובה שלו. סטטור גדול = יותר מומנט לפרופים כבדים.">
      {/* top view */}
      <g transform="translate(110,100)">
        <circle r="62" fill={C.fill} stroke={C.line} />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <rect key={i} x="-6" y="-58" width="12" height="22" rx="2" fill="#b07a3c" opacity=".85" transform={`rotate(${(a * 180) / Math.PI})`} />;
        })}
        <circle r="30" fill={C.fill2} stroke={C.line} />
        <circle r="5" fill={C.muted} />
        <line x1="-62" y1="78" x2="62" y2="78" stroke={C.accent} strokeWidth="2" />
        <line x1="-62" y1="72" x2="-62" y2="84" stroke={C.accent} strokeWidth="2" /><line x1="62" y1="72" x2="62" y2="84" stroke={C.accent} strokeWidth="2" />
        <T x={0} y={96} size={13} fill={C.accent} weight={700}>22 מ״מ קוטר</T>
      </g>
      {/* side view */}
      <g transform="translate(300,100)">
        <rect x="-62" y="-24" width="124" height="48" rx="6" fill={C.fill} stroke={C.line} />
        {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={-56 + i * 13.5} y="-18" width="8" height="36" rx="1.5" fill="#b07a3c" opacity=".85" />)}
        <line x1="78" y1="-24" x2="78" y2="24" stroke={C.accent} strokeWidth="2" />
        <line x1="72" y1="-24" x2="84" y2="-24" stroke={C.accent} strokeWidth="2" /><line x1="72" y1="24" x2="84" y2="24" stroke={C.accent} strokeWidth="2" />
        <T x={78} y={46} size={13} fill={C.accent} weight={700}>7 מ״מ</T>
        <T x={0} y={-36} size={12} fill={C.muted}>מבט מהצד</T>
      </g>
      <T x={110} y={22} size={12} fill={C.muted}>מבט מלמעלה</T>
    </Frame>
  );
}

/** Props-out rotation: front-right spins counter-clockwise. */
export function PropDirection() {
  // seen from above, nose up: the drone's right side is on the right of the drawing
  const m = [[305, 60, "ccw"], [115, 60, "cw"], [305, 200, "cw"], [115, 200, "ccw"]];
  return (
    <Frame title="כיוון סיבוב הפרופלורים (Props Out)" viewBox="0 0 420 270" caption="מבט מלמעלה, האף למעלה. ב-Props Out (ברירת המחדל ב-Betaflight 4.x) הפרופים הקדמיים מסתובבים החוצה מהמצלמה: הקדמי-ימני נגד כיוון השעון.">
      <g stroke={C.line} strokeWidth="14" strokeLinecap="round"><line x1="115" y1="60" x2="305" y2="200" /><line x1="305" y1="60" x2="115" y2="200" /></g>
      <rect x="180" y="100" width="60" height="60" rx="10" fill={C.fill} stroke={C.line} />
      <path d="M210 82 l-10 14 h20 z" fill={C.accent} />
      <T x={210} y={74} size={12} fill={C.accent} weight={700}>קדימה</T>
      {m.map(([x, y, dir], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="44" fill="rgba(255,255,255,.02)" stroke={C.line} strokeDasharray="4 5" />
          <path d={dir === "cw" ? `M ${x - 30} ${y - 22} A 37 37 0 0 1 ${x + 30} ${y - 22}` : `M ${x + 30} ${y - 22} A 37 37 0 0 0 ${x - 30} ${y - 22}`} stroke={dir === "cw" ? C.blue : C.yellow} strokeWidth="3" fill="none" markerEnd={`url(#ar-${dir})`} />
          <circle cx={x} cy={y} r="10" fill={C.fill2} stroke={C.muted} />
          <T x={x} y={y + 62} size={12} fill={dir === "cw" ? C.blue : C.yellow} weight={700}>{dir === "cw" ? "עם כיוון השעון" : "נגד כיוון השעון"}</T>
        </g>
      ))}
      <defs>
        <marker id="ar-cw" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={C.blue} /></marker>
        <marker id="ar-ccw" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={C.yellow} /></marker>
      </defs>
      <T x={330} y={20} size={11} fill={C.muted}>צד ימין של הרחפן</T>
      <T x={90} y={20} size={11} fill={C.muted}>צד שמאל</T>
    </Frame>
  );
}

/** Mode 2 sticks. */
export function Mode2() {
  const stick = (cx, labels) => (
    <g>
      <rect x={cx - 62} y="40" width="124" height="124" rx="16" fill={C.fill} stroke={C.line} />
      <line x1={cx} y1="52" x2={cx} y2="152" stroke={C.line} /><line x1={cx - 50} y1="102" x2={cx + 50} y2="102" stroke={C.line} />
      <circle cx={cx} cy="102" r="14" fill={C.fill2} stroke={C.accent} strokeWidth="2" />
      <T x={cx} y="32" size={12} fill={C.text} weight={700}>{labels[0]}</T>
      <T x={cx} y="184" size={12} fill={C.text} weight={700}>{labels[1]}</T>
      <T x={cx - 76} y="106" size={11} fill={C.muted} anchor="end">{labels[2]}</T>
      <T x={cx + 76} y="106" size={11} fill={C.muted} anchor="start">{labels[3]}</T>
    </g>
  );
  return (
    <Frame title="שלט במוד 2" viewBox="0 0 440 200" caption="מקל שמאל: גז (למעלה/למטה) וסיבוב סביב הציר, Yaw (ימינה/שמאלה). מקל ימין: Pitch קדימה/אחורה ו-Roll לצדדים.">
      {stick(130, ["גז ↑", "גז ↓", "Yaw ←", "Yaw →"])}
      {stick(310, ["Pitch קדימה", "Pitch אחורה", "Roll ←", "Roll →"])}
    </Frame>
  );
}

/** LiPo per-cell voltage scale. */
export function LipoScale() {
  const x = v => 40 + ((v - 3.2) / 1.05) * 340;
  const marks = [[3.3, "מינימום", C.bad], [3.5, "נחיתה", C.warn], [3.8, "אחסון", C.accent], [4.2, "מלאה", C.text]];
  return (
    <Frame title="מתחי תא LiPo" viewBox="0 0 420 130" caption="המתחים לתא בודד. בסוללה של 6S כופלים ב-6: מלאה = 25.2V, נחיתה ≈ 21V, אחסון = 22.8V.">
      <defs><linearGradient id="lipo" x1="0" x2="1"><stop offset="0" stopColor="#ef6b6b" /><stop offset=".35" stopColor="#f2b84b" /><stop offset=".65" stopColor="#2dd4bf" /><stop offset="1" stopColor="#7dd3fc" /></linearGradient></defs>
      <rect x="40" y="56" width="350" height="14" rx="7" fill="url(#lipo)" opacity=".85" />
      {marks.map(([v, l, col]) => (
        <g key={v}>
          <line x1={x(v)} y1="46" x2={x(v)} y2="80" stroke={col} strokeWidth="2" />
          <T x={x(v)} y="38" size={12} fill={col} weight={700}>{l}</T>
          <T x={x(v)} y="98" size={12} fill={C.muted}>{v.toFixed(1)}V</T>
        </g>
      ))}
    </Frame>
  );
}

/** Video chain: camera → VTX → goggles must share one system. */
export function VideoChain() {
  const box = (x, label, sub, col = C.accent) => (
    <g>
      <rect x={x} y="48" width="110" height="64" rx="12" fill={C.fill} stroke={col} strokeOpacity=".6" />
      <T x={x + 55} y="76" size={13} weight={700}>{label}</T>
      <T x={x + 55} y="96" size={11} fill={C.muted}>{sub}</T>
    </g>
  );
  return (
    <Frame title="שרשרת הווידאו" viewBox="0 0 420 150" caption="שלושת החלקים חייבים להיות מאותה מערכת. משדר DJI לא ישדר למשקפות אנלוגיות או ל-Walksnail.">
      {box(10, "מצלמה", "על הרחפן")}
      {box(155, "משדר VTX", "על הרחפן")}
      {box(300, "משקפות", "על הראש")}
      <path d="M122 80 h28" stroke={C.accent} strokeWidth="2.5" markerEnd="url(#va)" />
      <path d="M267 80 h28" stroke={C.accent} strokeWidth="2.5" strokeDasharray="5 5" markerEnd="url(#va)" />
      <T x={281} y={70} size={10.5} fill={C.muted}>אלחוטי</T>
      <rect x="110" y="122" width="200" height="22" rx="11" fill="rgba(45,212,191,.1)" />
      <T x={210} y={137} size={11.5} fill={C.accent} weight={700}>אותה מערכת: DJI / Walksnail / אנלוגי</T>
      <defs><marker id="va" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--neon)" /></marker></defs>
    </Frame>
  );
}

/** Stack layering: FC above ESC on soft mounts. */
export function StackDiagram() {
  return (
    <Frame title="מבנה הסטאק" viewBox="0 0 420 190" caption="ה-ESC למטה, ה-FC למעלה, וביניהם כבל הרתמה. גומיות אנטי-ויברציה מבודדות את החיישנים מרעידות המנועים.">
      {[[30, "בקר טיסה (FC)", "מריץ Betaflight, מקלט ו-VTX מתחברים אליו", "var(--neon)"], [92, "ESC 4-in-1", "מזין את ארבעת המנועים", "#f2b84b"]].map(([y, l, s, col]) => (
        <g key={l}>
          <rect x="90" y={y} width="240" height="36" rx="6" fill={C.fill} stroke={col} strokeOpacity=".7" />
          <T x={210} y={y + 23} size={13} weight={700}>{l}</T>
          <T x={345} y={y + 23} size={11} fill={C.muted} anchor="start">{s.split(",")[0]}</T>
        </g>
      ))}
      {[105, 315].map(x => <g key={x}><rect x={x - 4} y="66" width="8" height="26" fill="#2a3139" /><rect x={x - 4} y="128" width="8" height="26" fill="#2a3139" /><circle cx={x} cy="70" r="5" fill="#555" /><circle cx={x} cy="132" r="5" fill="#555" /></g>)}
      <path d="M200 66 v26" stroke="#c9a24a" strokeWidth="5" strokeDasharray="3 2" />
      <T x={150} y={84} size={11} fill={C.muted} anchor="end">כבל הרתמה</T>
      <rect x="70" y="154" width="280" height="10" rx="3" fill="#20262d" />
      <T x={210} y={182} size={11} fill={C.muted}>פריים</T>
    </Frame>
  );
}

/** Battery lead + capacitor polarity. */
export function PowerLead({ connector = "XT60" }) {
  return (
    <Frame title="מחבר סוללה וקבל" viewBox="0 0 420 160" caption="אדום ל-+ (BAT+), שחור ל-− (GND). הקבל מולחם על אותם פדים, והרגל המסומנת שלו (פס בצד) הולכת ל-−.">
      <rect x="250" y="40" width="140" height="80" rx="10" fill={C.fill} stroke={C.line} />
      <T x={320} y={32} size={12} fill={C.muted}>ESC</T>
      <rect x="268" y="56" width="40" height="18" rx="4" fill="#c9a24a" /><T x={288} y={70} size={11} fill="#1a1205" weight={800}>BAT+</T>
      <rect x="268" y="88" width="40" height="18" rx="4" fill="#c9a24a" /><T x={288} y={102} size={11} fill="#1a1205" weight={800}>GND</T>
      <rect x="40" y="58" width="56" height="44" rx="8" fill="#e9c46a" opacity=".9" /><T x={68} y={85} size={12} fill="#1a1205" weight={800}>{connector}</T>
      <path d="M96 70 C 170 70, 190 65, 268 65" stroke={C.red} strokeWidth="4" fill="none" />
      <path d="M96 90 C 170 90, 190 97, 268 97" stroke={C.black} strokeWidth="4" fill="none" />
      <g transform="translate(200,132)">
        <rect x="-36" y="-12" width="72" height="24" rx="12" fill="#2b3640" stroke={C.line} />
        <rect x="18" y="-12" width="10" height="24" fill="#5b6a78" />
        <T x={-6} y={4} size={11} weight={700}>קבל</T>
        <path d="M-36 0 C -60 0, -40 -38, 68 -35" stroke={C.red} strokeWidth="1.5" fill="none" opacity=".7" />
      </g>
    </Frame>
  );
}

/** Flight modes summary card. */
export function FlightModes() {
  const modes = [["Angle", "מתיישר לבד, הטיה מוגבלת", 0], ["Horizon", "מתיישר, אבל מאפשר פליפ", 1], ["Acro", "אין יישור. שליטה מלאה", 2]];
  return (
    <Frame title="מצבי טיסה" viewBox="0 0 420 150">
      {modes.map(([n, d, i]) => {
        const x = 20 + i * 135;
        return (
          <g key={n}>
            <rect x={x} y="20" width="122" height="110" rx="12" fill={C.fill} stroke={i === 2 ? "var(--neon)" : C.line} strokeOpacity={i === 2 ? .7 : 1} />
            <g transform={`translate(${x + 61},60) rotate(${[-15, -50, -120][i]})`}>
              <rect x="-24" y="-4" width="48" height="8" rx="3" fill={C.muted} />
              <circle cx="-24" cy="0" r="6" fill={C.line} /><circle cx="24" cy="0" r="6" fill={C.line} />
            </g>
            <T x={x + 61} y="100" size={14} weight={800} fill={i === 2 ? C.accent : C.text}>{n}</T>
            <T x={x + 61} y="118" size={10.5} fill={C.muted}>{d}</T>
          </g>
        );
      })}
    </Frame>
  );
}

/** Stack and motor hole patterns, drawn to scale. */
export function MountPatterns() {
  const sq = (x, mm, label, col) => {
    const k = 3.2, w = mm * k;
    return (
      <g key={label}>
        <rect x={x} y={110 - w / 2} width={w} height={w} rx="4" fill="rgba(255,255,255,.02)" stroke={col} strokeOpacity=".5" strokeDasharray="4 4" />
        {[[0, 0], [w, 0], [0, w], [w, w]].map(([dx, dy], i) => <circle key={i} cx={x + dx} cy={110 - w / 2 + dy} r="4.5" fill={C.fill2} stroke={col} strokeWidth="1.5" />)}
        <T x={x + w / 2} y={110 + w / 2 + 22} size={13} fill={col} weight={800}>{label}</T>
      </g>
    );
  };
  return (
    <Frame title="דפוסי הרכבה" viewBox="0 0 420 210" caption="המרחק בין מרכזי החורים, בקנה מידה. הפריים קובע אילו גדלים נכנסים, ולכן בודקים אותו לפני שקונים סטאק ומנועים.">
      {sq(18, 30.5, "30.5 מ״מ", C.accent)}
      {sq(145, 20, "20 מ״מ", C.accent)}
      <line x1="236" y1="30" x2="236" y2="190" stroke={C.line} />
      {sq(262, 16, "מנוע 16×16", C.yellow)}
      {sq(342, 12, "12×12", C.yellow)}
      <T x={110} y={24} size={11} fill={C.muted}>סטאק</T>
      <T x={330} y={24} size={11} fill={C.muted}>מנועים</T>
    </Frame>
  );
}

/** Good vs cold solder joint. */
export function SolderJoint() {
  return (
    <Frame title="הלחמה טובה מול הלחמה קרה" viewBox="0 0 420 180" caption="משמאל: הלחמה טובה, חלקה ומבריקה, שעוטפת את החוט כמו הר געש קטן. מימין: הלחמה קרה, כדור אפור שלא נקשר לפד.">
      {[[0, true], [210, false]].map(([ox, good]) => (
        <g key={ox} transform={`translate(${ox},0)`}>
          <rect x="30" y="118" width="150" height="16" rx="3" fill="#1f5133" />
          <rect x="70" y="110" width="70" height="10" rx="2" fill="#c9a24a" />
          <path d="M105 20 L105 70" stroke={good ? C.red : C.red} strokeWidth="9" strokeLinecap="round" />
          <path d="M105 58 L105 98" stroke="#c0c6cc" strokeWidth="4" />
          {good
            ? <path d="M72 111 Q 105 60 138 111 Z" fill="url(#shine)" stroke="#e7ecf0" strokeOpacity=".5" />
            : <><ellipse cx="105" cy="95" rx="22" ry="18" fill="#7d8389" /><path d="M86 90 q6 -6 12 -2 M108 100 q6 4 10 -2" stroke="#5a6066" strokeWidth="2" fill="none" /><line x1="72" y1="114" x2="138" y2="114" stroke={C.bad} strokeWidth="2" strokeDasharray="3 3" /></>}
          <T x={105} y={160} size={13} weight={800} fill={good ? C.accent : C.bad}>{good ? "✓ טובה" : "✕ קרה"}</T>
        </g>
      ))}
      <defs><linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3f6f8" /><stop offset=".5" stopColor="#b8c0c7" /><stop offset="1" stopColor="#8a939b" /></linearGradient></defs>
    </Frame>
  );
}

export const DIAGRAMS = { WiringRx, StatorDiagram, PropDirection, Mode2, LipoScale, VideoChain, StackDiagram, PowerLead, FlightModes, MountPatterns, SolderJoint };
