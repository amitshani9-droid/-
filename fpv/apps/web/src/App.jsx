import { useEffect, useMemo, useState } from "react";
import data from "@compat/data/parts.json";
import { CATEGORIES, SYSTEM_LABEL, PROTOCOL_LABEL, check, errorsIfChosen, totals, missingParts, performance } from "@compat/src/index.js";
import { assemblySteps } from "./assembly.js";
import { betaflightCli } from "./betaflight.js";
import { QUESTIONS, profileFrom, presetFor, STEPS } from "./quiz.js";
import { LESSONS, PREFLIGHT, LIPO_RULES } from "./lessons.js";
import { buyLink, CONFIG } from "./config.js";
import { Drone, Icon, Level, ils } from "./ui.jsx";

const PARTS = data.parts;
const title = p => (["Generic", "DIY"].includes(p.brand) ? "" : p.brand + " ") + p.name;
const BY_ID = Object.fromEntries(PARTS.map(p => [p.id, p]));
const BUILD_CATS = ["frame", "motors", "stack", "vtx", "camera", "receiver", "props", "battery", "radio", "goggles", "charger"];
const BNF_CATS = ["bnf", "battery", "radio", "goggles", "charger"];

// ---------- storage ----------
const load = (k, d) => { try { const v = localStorage.getItem("g4f_" + k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem("g4f_" + k, JSON.stringify(v)); } catch { /* private mode */ } };
function useStored(key, init) {
  const [v, setV] = useState(() => load(key, init));
  useEffect(() => save(key, v), [key, v]);
  return [v, setV];
}
function useHash() {
  const [h, setH] = useState(() => location.hash.slice(1));
  useEffect(() => { const f = () => { setH(location.hash.slice(1)); window.scrollTo(0, 0); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return h;
}
const go = h => { location.hash = h; };

function specLine(p) {
  switch (p.cat) {
    case "frame": return [`${p.size}"`, `פרופ עד ${p.maxProp}"`, `מנוע ${p.motorMount.map(m => m + "×" + m).join("/")}`, `סטאק ${p.stackMount.join("/")}`];
    case "motors": return [p.stator, `${p.kv}KV`, `${p.cells[0] === p.cells[1] ? p.cells[0] : p.cells.join("–")}S`, `${p.maxA}A`];
    case "stack": return [`${p.cells.join("–")}S`, `${p.escA}A`, `${p.mount}mm`, `${p.uarts} UART`];
    case "vtx": return [SYSTEM_LABEL[p.system], `${p.vin.join("–")}V`, p.includesCamera ? "כולל מצלמה" : "בלי מצלמה"];
    case "camera": return [SYSTEM_LABEL[p.system], `${p.width}mm`];
    case "receiver": return [PROTOCOL_LABEL[p.protocol]];
    case "props": return [`${p.size}"`];
    case "battery": return [`${p.cells}S`, `${p.mah}mAh`, p.connector, p.chem === "liion" ? "Li-ion" : "LiPo"];
    case "radio": return p.protocols.map(x => PROTOCOL_LABEL[x]);
    case "goggles": return p.systems.map(x => SYSTEM_LABEL[x]);
    case "charger": return [`עד ${p.maxCells}S`];
    case "bnf": return [SYSTEM_LABEL[p.system], `${p.cells}S`, PROTOCOL_LABEL[p.protocol]];
    default: return [];
  }
}

// ======================================================================
export default function App() {
  const hash = useHash();
  const [answers, setAnswers] = useStored("answers", {});
  const [ids, setIds] = useStored("build", {});
  const [tools, setTools] = useStored("tools", []);
  const [mode, setMode] = useStored("mode", "build");
  const [done, setDone] = useStored("lessons", {});
  const [steps, setSteps] = useStored("steps", {});
  const [checks, setChecks] = useStored("checks", {});
  const [hangar, setHangar] = useStored("hangar", []);
  const [guideDone, setGuideDone] = useStored("guide", {});

  const quizDone = QUESTIONS.every(q => answers[q.id] && (!q.multi || answers[q.id].length));
  const profile = useMemo(() => quizDone ? profileFrom(answers) : null, [answers, quizDone]);

  const cats = mode === "bnf" ? BNF_CATS : BUILD_CATS;
  const build = useMemo(() => {
    const b = {};
    BUILD_CATS.concat("bnf").forEach(c => { b[c] = null; });
    cats.forEach(c => { b[c] = ids[c] ? BY_ID[ids[c]] || null : null; });
    return b;
  }, [ids, mode]);
  const toolParts = tools.map(t => BY_ID[t]).filter(Boolean);
  const issues = useMemo(() => check(build), [build]);
  const errors = issues.filter(i => i.level === "error");
  const t = totals(build, toolParts);
  const perf = useMemo(() => performance(build), [build]);

  function applyPreset() {
    const { build: b, tools: tl } = presetFor(profile);
    const have = profile.have || [];
    const next = { ...b };
    if (have.includes("radio")) delete next.radio;
    if (have.includes("goggles")) delete next.goggles;
    if (have.includes("charger")) delete next.charger;
    setIds(next); setTools(tl); setMode(b.bnf ? "bnf" : "build");
    setSteps(s => ({ ...s, route: true }));
    go("build");
  }

  const view = hash.startsWith("lesson-") ? "lesson" : hash || "home";
  const ctx = { perf, hangar, setHangar, guideDone, setGuideDone, answers, setAnswers, profile, quizDone, ids, setIds, tools, setTools, mode, setMode, build, toolParts, issues, errors, t, applyPreset, done, setDone, steps, setSteps, checks, setChecks, hash };

  const hasBuild = Object.values(build).some(Boolean);
  return (
    <div className="min-h-full">
      <Sidebar view={view} t={t} errors={errors.length} hasBuild={hasBuild} quizDone={quizDone} hangarCount={hangar.length} />
      <div className="md:mr-64 min-h-full flex flex-col">
        <TopBar t={t} errors={errors.length} view={view} hasBuild={hasBuild} />
        <main className="flex-1 w-full max-w-5xl mx-auto gutter md:px-10 pb-28 md:pb-16 pt-5 md:pt-10">
          {view === "home" && <Home {...ctx} />}
          {view === "quiz" && <Quiz {...ctx} />}
          {view === "route" && <Route {...ctx} />}
          {view === "build" && <Builder {...ctx} />}
          {view === "cart" && <Cart {...ctx} />}
          {view === "learn" && <Learn {...ctx} />}
          {view === "lesson" && <Lesson {...ctx} />}
          {view === "safety" && <Safety {...ctx} />}
          {view === "guide" && <Guide {...ctx} />}
          {view === "betaflight" && <BetaflightView {...ctx} />}
          {view === "hangar" && <Hangar {...ctx} />}
        </main>
      </div>
      <BottomNav view={view} />
      {["build", "guide", "betaflight", "lesson", "learn", "route", "cart"].includes(view) && <Tutor build={build} issues={issues} view={view} />}
    </div>
  );
}

// ---------- chrome ----------
const NAV = [["route", "המסלול שלי", "route"], ["build", "קונפיגורטור", "build"], ["hangar", "האנגר", "hangar"], ["learn", "שיעורים", "learn"], ["safety", "בטיחות", "safety"]];
const isActive = (view, v) => view === v || (v === "learn" && view === "lesson") || (v === "build" && ["cart", "guide", "betaflight"].includes(view)) || (v === "route" && view === "quiz");

function Logo() {
  return (
    <a href="#" className="flex items-center gap-2.5" aria-label={CONFIG.BRAND + " Builder, דף הבית"}>
      <span className="w-8 h-8 rounded-[9px] grid place-items-center" style={{ background: "linear-gradient(135deg,#2dd4bf,#0f766e)" }}>
        <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]" fill="none" stroke="#032420" strokeWidth="1.8"><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" strokeWidth="2.2" /><circle cx="6" cy="6" r="3.2" /><circle cx="18" cy="6" r="3.2" /><circle cx="6" cy="18" r="3.2" /><circle cx="18" cy="18" r="3.2" /><rect x="9.6" y="9.6" width="4.8" height="4.8" rx="1.2" fill="#032420" stroke="none" /></svg>
      </span>
      <span className="font-extrabold text-[17px] tracking-tight">{CONFIG.BRAND}<span className="text-muted font-medium"> Builder</span></span>
    </a>
  );
}

function StatusPill({ errors }) {
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${errors ? "text-bad" : "text-neon"}`}><Icon name={errors ? "warn" : "ok"} className="w-3.5 h-3.5" />{errors ? `${errors} שגיאות` : "תואם"}</span>;
}

function Sidebar({ view, t, errors, hasBuild, quizDone, hangarCount }) {
  return (
    <aside className="hidden md:flex fixed inset-y-0 right-0 w-64 flex-col border-l border-line px-4 py-6" style={{ background: "#0e1115" }}>
      <div className="px-2"><Logo /></div>
      <nav className="mt-8 space-y-1" aria-label="ניווט ראשי">
        {NAV.map(([v, label, icon]) => (
          <a key={v} href={"#" + v} className="nav-item" aria-current={isActive(view, v) ? "page" : undefined}>
            <Icon name={icon} className="w-[18px] h-[18px]" />{label}
            {v === "hangar" && hangarCount > 0 && <span className="mr-auto text-[11px] text-muted bg-panel2 px-1.5 py-0.5 rounded-md">{hangarCount}</span>}
          </a>
        ))}
      </nav>
      <div className="mt-auto">
        {hasBuild ? (
          <a href="#build" className="block border border-line bg-panel p-4 card-hover">
            <div className="text-xs text-muted">הבילד הנוכחי</div>
            <div className="text-xl font-bold osd mt-1">{ils(t.price)}</div>
            <div className="flex items-center justify-between mt-1"><span className="text-xs text-muted osd">{t.auw}g</span><StatusPill errors={errors} /></div>
          </a>
        ) : !quizDone && (
          <a href="#quiz" className="block border border-line bg-panel p-4 card-hover">
            <div className="font-semibold text-sm">לא יודעים מאיפה להתחיל?</div>
            <div className="text-xs text-muted mt-1">שאלון של 2 דקות בונה לכם מסלול ובילד.</div>
            <div className="text-neon text-sm font-semibold mt-2">להתחיל ←</div>
          </a>
        )}
        <p className="text-[11px] text-muted mt-4 px-1">חינמי · בעברית · גרסה 0.2</p>
      </div>
    </aside>
  );
}

function TopBar({ t, errors, view, hasBuild }) {
  return (
    <header className="md:hidden sticky z-40 border-b border-line" style={{ top: "env(safe-area-inset-top, 0px)", background: "rgba(11,13,16,.9)", backdropFilter: "blur(12px)" }}>
      <div className="gutter h-14 flex items-center justify-between gap-3">
        <Logo />
        {hasBuild && view !== "home" && (
          <a href="#build" className="flex items-center gap-2.5 text-xs">
            <span className="osd font-semibold">{ils(t.price)}</span>
            <StatusPill errors={errors} />
          </a>
        )}
      </div>
    </header>
  );
}

function BottomNav({ view }) {
  const items = NAV.filter(([v]) => v !== "hangar");
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line" style={{ background: "rgba(11,13,16,.95)", backdropFilter: "blur(12px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }} aria-label="ניווט ראשי">
      <div className="grid grid-cols-4 gutter">
        {items.map(([v, label, icon]) => {
          const on = isActive(view, v);
          return (
            <a key={v} href={"#" + v} className={`flex flex-col items-center gap-1 pt-2 pb-2.5 text-[11.5px] font-medium ${on ? "text-fg" : "text-muted"}`} aria-current={on ? "page" : undefined}>
              <span className={`px-4 py-1 rounded-full ${on ? "bg-neon-soft text-neon" : ""}`}><Icon name={icon} className="w-[19px] h-[19px]" /></span>{label.replace(" שלי", "")}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

// ---------- home ----------
function Home({ quizDone, profile }) {
  return (
    <div className="rise">
      <section className="hud hero-glow overflow-hidden">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6 items-center p-6 md:p-10">
          <div>
            <span className="eyebrow">ללמוד, לבנות ולטוס FPV · בעברית</span>
            <h1 className="text-[2.35rem] md:text-[3.25rem] font-extrabold leading-[1.06] mt-3">מאפס מוחלט<br />ועד <span className="text-neon">טיסה ראשונה</span>.</h1>
            <p className="text-[#b4bcc7] mt-4 max-w-md leading-relaxed text-[16.5px]">מסלול אישי לפי המטרה והתקציב שלכם, קונפיגורטור שבודק שכל חלק מתאים לשאר, ושיעורים קצרים. בלי לזרוק כסף על חלקים שלא מתאימים.</p>
            <div className="flex flex-wrap gap-3 mt-7">
              {quizDone
                ? <><a href="#route" className="btn btn-neon">להמשיך במסלול שלי<Icon name="back" className="w-4 h-4" /></a><a href="#quiz" className="btn btn-ghost">לענות מחדש</a></>
                : <a href="#quiz" className="btn btn-neon">להתחיל: שאלון של 2 דקות<Icon name="back" className="w-4 h-4" /></a>}
              <a href="#build" className="btn btn-ghost">ישר לקונפיגורטור</a>
            </div>
            {quizDone && <p className="text-sm text-muted mt-5">הפרופיל שלכם: <span className="text-fg font-medium">{profile.classInfo.label}</span> · {profile.video === "digital" ? "דיגיטלי" : "אנלוגי"} · {profile.path === "bnf" ? "מוכן לטיסה" : "בנייה עצמית"}</p>}
          </div>
          <div className="relative mx-auto w-full max-w-[340px]">
            <Drone className="w-full" />
            <div className="absolute top-3 left-0 w-max hud px-3 py-2 text-xs flex items-center gap-2"><Icon name="ok" className="w-4 h-4 text-neon" /><span><b className="osd">13/13</b> בדיקות תאימות</span></div>
            <div className="absolute bottom-10 right-0 w-max hud px-3 py-2 text-xs"><div className="text-muted">זמן טיסה משוער</div><div className="osd font-bold text-base" dir="ltr" style={{ textAlign: "right" }}>4.5–6.5 min</div></div>
            <div className="absolute bottom-0 left-2 w-max hud px-3 py-2 text-xs"><div className="text-muted">דחף-משקל</div><div className="osd font-bold text-base" dir="ltr" style={{ textAlign: "right" }}>11.9 : 1</div></div>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-3 mt-4">
        {[
          ["route", "שאלון ומסלול אישי", "10 שאלות על המטרה, הניסיון והתקציב, ובסוף מסלול של 9 שלבים ובילד מומלץ."],
          ["build", "קונפיגורטור חכם", `${PARTS.length} חלקים ו-13 כללי תאימות. חלק שלא מתאים מסומן עוד לפני שבוחרים, עם הסבר למה.`],
          ["guide", "מהרכבה ועד טיסה", "מדריך הרכבה לפי החלקים שלכם, קובץ Betaflight מוכן, שיעורים וצ'קליסט בטיחות."],
        ].map(([icon, h, p]) => (
          <div key={h} className="border border-line bg-panel p-5">
            <span className="w-9 h-9 grid place-items-center rounded-[10px] bg-neon-soft text-neon"><Icon name={icon} className="w-[18px] h-[18px]" /></span>
            <h3 className="font-bold mt-3">{h}</h3>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">{p}</p>
          </div>
        ))}
      </section>
      <p className="text-xs text-muted mt-6 leading-relaxed max-w-2xl">המוצר חינמי. חלק מקישורי הקנייה הם קישורי שותפים: אם תקנו דרכם נקבל עמלה קטנה, בלי שהמחיר שלכם ישתנה. העמלה לא משפיעה על בדיקות התאימות ולא על סדר ההמלצות.</p>
    </div>
  );
}

// ---------- quiz ----------
function Quiz({ answers, setAnswers }) {
  const firstOpen = QUESTIONS.findIndex(q => !answers[q.id] || (q.multi && !answers[q.id].length));
  const [i, setI] = useState(firstOpen === -1 ? 0 : firstOpen);
  const q = QUESTIONS[i];
  const val = answers[q.id];
  const next = () => { if (i < QUESTIONS.length - 1) setI(i + 1); else go("route"); };
  function pick(v) {
    if (q.multi) {
      let arr = Array.isArray(val) ? [...val] : [];
      if (v === "none") arr = ["none"];
      else { arr = arr.filter(x => x !== "none"); arr = arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]; }
      setAnswers({ ...answers, [q.id]: arr });
    } else {
      setAnswers({ ...answers, [q.id]: v });
      setTimeout(next, 160);
    }
  }
  return (
    <div className="rise" key={q.id}>
      <div className="flex items-center justify-between osd text-xs text-muted mb-2">
        <button onClick={() => i > 0 ? setI(i - 1) : go("")} className="hover:text-fg">→ חזרה</button>
        <span>שאלה {i + 1}/{QUESTIONS.length}</span>
      </div>
      <div className="h-1 bg-panel2 mb-6"><div className="h-full bg-neon transition-all" style={{ width: `${(i + 1) / QUESTIONS.length * 100}%` }} /></div>
      <h2 className="text-2xl md:text-3xl font-black">{q.q}</h2>
      {q.hint && <p className="text-muted text-sm mt-2">{q.hint}</p>}
      <div className="grid sm:grid-cols-2 gap-2.5 mt-6">
        {q.options.map(o => {
          const sel = q.multi ? (val || []).includes(o.v) : val === o.v;
          return (
            <button key={o.v} onClick={() => pick(o.v)} className={`text-right border p-4 bg-panel transition ${sel ? "bd-neon bg-neon-soft" : "border-line hover:border-muted"}`} aria-pressed={sel}>
              <div className="font-bold flex items-center justify-between">{o.label}{sel && <span className="text-neon osd">✓</span>}</div>
              {o.sub && <div className="text-sm text-muted mt-0.5">{o.sub}</div>}
            </button>
          );
        })}
      </div>
      {q.multi && <button className="btn btn-neon w-full mt-5" disabled={!val || !val.length} style={{ opacity: val && val.length ? 1 : .4 }} onClick={next}>המשך ←</button>}
    </div>
  );
}

// ---------- route ----------
function Route({ profile, quizDone, applyPreset, steps, setSteps, ids }) {
  if (!quizDone) return (
    <div className="hud p-6 text-center mt-6 rise">
      <Drone className="w-32 mx-auto" spinning={false} />
      <h2 className="text-2xl font-black mt-3">המסלול שלך מתחיל בשאלון</h2>
      <p className="text-muted mt-2">10 שאלות, 2 דקות. בסוף תקבל המלצה מדויקת ובילד מוכן לקונפיגורטור.</p>
      <a href="#quiz" className="btn btn-neon mt-5">להתחיל ←</a>
    </div>
  );
  const p = profile;
  const preset = presetFor(p).build;
  const radioName = BY_ID[preset.radio]?.name;
  const content = {
    quiz: <>ענית על השאלון. אפשר <a className="text-neon underline" href="#quiz">לשנות תשובות</a> בכל רגע.</>,
    route: <>{p.classInfo.why} {p.path === "bnf" ? "המלצה: רחפן מוכן (BNF). לומדים לטוס קודם, ובונים את הרחפן השני." : "המלצה: בנייה עצמית. תבין כל חלק ותדע לתקן אחרי כל התרסקות."}</>,
    radio: <>{p.have.includes("radio") ? "כבר יש לך שלט, מעולה. ודא שהוא ELRS 2.4GHz." : <>קונים שלט קודם: הוא עובד גם בסימולטור וגם עם כל רחפן בהמשך. ההמלצה שלנו: <b>{radioName}</b>.</>}</>,
    sim: p.simHours ? <>{p.simHours} שעות בסימולטור (Liftoff, Uncrashed או Velocidrone, כ-₪70–90) עם השלט מחובר ב-USB. מתחילים ב-Angle ועוברים כמה שיותר מהר ל-Acro. כל התרסקות בסימולטור חוסכת כסף אמיתי.</> : "יש לך ניסיון. 2–3 שעות חימום בסימולטור על הבילד החדש מספיקות.",
    build: <>פותחים את הבילד המומלץ, בודקים שאין שגיאות תאימות, ומחליפים חלקים לפי הטעם. <button className="text-neon underline" onClick={applyPreset}>לפתוח את הבילד המומלץ</button></>,
    assemble: <>הסדר: מנועים לזרועות, סטאק על הפריים, הלחמת מנועים ל-ESC, מקלט ו-VTX ל-UART, מצלמה. חיבור ראשון תמיד דרך Smoke Stopper. יש לך <a className="text-neon underline" href="#guide">מדריך הרכבה צעד-אחר-צעד</a> שנבנה לפי החלקים שבחרת.</>,
    setup: <>Betaflight Configurator: צריבת קושחה, הגדרת פורטים (UART של המקלט ושל ה-VTX), בינד למקלט, כיוון מנועים, מתג Arm, מצבי טיסה ו-Failsafe. {p.path === "bnf" ? "ברחפן מוכן רוב זה כבר מוגדר: רק בינד, מתגים ו-Failsafe. " : ""}<a className="text-neon underline" href="#betaflight">קובץ CLI מוכן לבילד שלך</a>.</>,
    safety: <>לפני כל טיסה: <a className="text-neon underline" href="#safety">הצ'קליסט</a>. עד שכל הסעיפים מסומנים, לא ממריאים.</>,
    fly: <>שטח פתוח, ריחוף נמוך, שמיניות גדולות ואיטיות. נחיתה ב-3.5V לתא. ואז: עוד סוללה.</>,
  };
  const list = STEPS.filter(s => !(s.buildOnly && p.path === "bnf"));
  const doneMap = { ...steps, quiz: true, route: steps.route || Object.keys(ids).length > 0 };
  const count = list.filter(s => doneMap[s.id]).length;
  return (
    <div className="rise">
      <section className="hud p-5">
        <div className="osd text-xs text-neon">הפרופיל שלך</div>
        <h1 className="text-3xl font-black mt-1">{p.classInfo.label}</h1>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="chip">{p.video === "digital" ? "וידאו דיגיטלי" : "וידאו אנלוגי"}</span>
          <span className="chip">{p.path === "bnf" ? "מוכן לטיסה (BNF)" : "בנייה עצמית"}</span>
          {p.simHours > 0 && <span className="chip">סימולטור קודם: {p.simHours} ש'</span>}
        </div>
        {p.under16 && <p className="text-sm text-warn mt-4 leading-relaxed">⚠ רישיון מטיס לרחפן קטן ניתן מגיל 16. עד אז: סימולטור, ווף בתוך הבית, או הטסה במסגרת מבוגר אחראי. בדקו את ההנחיות העדכניות של רת"א.</p>}
        <button onClick={applyPreset} className="btn btn-neon w-full mt-5">לפתוח את הבילד המומלץ של {CONFIG.BRAND} ←</button>
      </section>

      <div className="flex items-center justify-between mt-7 mb-3">
        <h2 className="text-xl font-black">המסלול שלך</h2>
        <span className="osd text-xs text-muted">{count}/{list.length} הושלמו</span>
      </div>
      <ol className="relative">
        {list.map((s, n) => {
          const d = !!doneMap[s.id];
          return (
            <li key={s.id} className="relative pr-10 pb-5">
              {n < list.length - 1 && <span className="absolute right-[13px] top-7 bottom-0 w-px bg-line" />}
              <button onClick={() => setSteps({ ...steps, [s.id]: !steps[s.id] })} disabled={s.id === "quiz"}
                className={`absolute right-0 top-0.5 w-7 h-7 grid place-items-center border osd text-xs ${d ? "bg-neon text-ink border-neon" : "border-line text-muted bg-panel"}`}
                aria-label={d ? "סמן כלא הושלם" : "סמן כהושלם"}>{d ? "✓" : n + 1}</button>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className={`font-bold ${d ? "text-muted" : ""}`}>{s.title}</h3>
                {s.time && <span className="osd text-[11px] text-muted">{s.time}</span>}
              </div>
              <p className="text-sm text-muted mt-1 leading-relaxed">{content[s.id]}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------- configurator ----------
function Builder({ ids, setIds, tools, setTools, mode, setMode, build, toolParts, issues, errors, t, quizDone, applyPreset, perf, hangar, setHangar }) {
  const [picker, setPicker] = useState(null);
  const [shakeId, setShakeId] = useState(null);
  const cats = mode === "bnf" ? BNF_CATS : BUILD_CATS;
  const warns = issues.filter(i => i.level === "warn");
  const oks = issues.filter(i => i.level === "ok");
  const missing = missingParts(build);
  const empty = !Object.values(build).some(Boolean);

  function choose(cat, part) {
    setIds({ ...ids, [cat]: part ? part.id : undefined });
    if (part && errorsIfChosen(build, part).length) setShakeId(cat);
    setPicker(null);
  }

  const compat = (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-bold text-lg">בדיקת תאימות</h2>
        {!empty && <span className="text-xs text-muted osd">{oks.length} עברו · {warns.length} אזהרות · {errors.length} שגיאות</span>}
      </div>
      {empty ? <p className="text-sm text-muted">בחרו חלקים, והבדיקה תתעדכן כאן בזמן אמת.</p> : (
        <div className="space-y-2">
          {errors.map((e, k) => <IssueRow key={"e" + k} i={e} />)}
          {warns.map((e, k) => <IssueRow key={"w" + k} i={e} />)}
          {!errors.length && !warns.length && <div className="border lv-ok p-3.5 text-sm font-medium flex items-center gap-2"><Icon name="ok" className="w-4 h-4" />הכול מתאים. אפשר לעבור לרשימת הקניות.</div>}
          {oks.length > 0 && (
            <details className="text-sm"><summary className="cursor-pointer text-muted text-xs py-1.5">הצג את {oks.length} הבדיקות שעברו</summary>
              <div className="flex flex-wrap gap-1.5 mt-2">{oks.map((o, k) => <Level key={k} level="ok">{o.title}: {o.msg}</Level>)}</div>
            </details>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="rise">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="eyebrow">{mode === "bnf" ? "רחפן מוכן + ציוד" : "בנייה עצמית"}</span>
          <h1 className="text-[1.75rem] font-extrabold mt-1">קונפיגורטור</h1>
          <p className="text-sm text-muted mt-1">בחרו חלק לכל מקום. כל בחירה נבדקת מול שאר הבילד בזמן אמת.</p>
        </div>
        <div className="flex p-1 bg-panel border border-line text-sm" role="tablist" aria-label="סוג בילד">
          {[["build", "בנייה"], ["bnf", "מוכן (BNF)"]].map(([m, l]) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`px-4 py-1.5 rounded-[9px] font-medium transition ${mode === m ? "bg-panel2 text-fg shadow" : "text-muted hover:text-fg"}`} style={mode === m ? { boxShadow: "0 0 0 1px var(--line2)" } : undefined}>{l}</button>
          ))}
        </div>
      </div>

      {empty && (
        <div className="hud p-5 mt-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 grid place-items-center rounded-[10px] bg-neon-soft text-neon"><Icon name="tutor" /></span>
            <p className="text-sm">{quizDone ? "יש לכם פרופיל. להתחיל מהבילד שהמלצנו?" : "לא בטוחים מאיפה להתחיל? השאלון בונה לכם בילד מומלץ."}</p>
          </div>
          {quizDone ? <button className="btn btn-neon" onClick={applyPreset}>לטעון בילד מומלץ</button> : <a className="btn btn-neon" href="#quiz">לשאלון</a>}
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 mt-5">
        <div className="min-w-0 space-y-6">
          <div className="grid sm:grid-cols-2 gap-2.5">
            {cats.map(c => {
              const p = build[c];
              const bad = errors.some(e => e.cats.includes(c));
              const needed = missing.includes(c);
              return (
                <button key={c} onClick={() => setPicker(c)} onAnimationEnd={() => setShakeId(null)}
                  className={`text-right border bg-panel p-4 flex gap-3 items-start card-hover ${bad ? "bd-error" : p ? "border-line" : "border-dashed border-line"} ${shakeId === c ? "shake" : ""}`}>
                  <span className={`shrink-0 w-9 h-9 grid place-items-center rounded-[10px] ${bad ? "lv-error" : p ? "bg-neon-soft text-neon" : "bg-panel2 text-muted"}`}><Icon name={CATEGORIES[c].icon} className="w-[18px] h-[18px]" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2 text-xs text-muted"><span>{CATEGORIES[c].label}</span>{p && <span className="osd text-fg font-medium">{ils(p.price)}</span>}</span>
                    {p ? <>
                      <span className="block font-semibold leading-snug mt-0.5"><bdi>{title(p)}</bdi></span>
                      <span className="flex flex-wrap gap-1 mt-2">{specLine(p).map(s => <span key={s} className="chip"><bdi>{s}</bdi></span>)}</span>
                    </> : <span className={`flex items-center gap-1 mt-1 text-sm ${needed ? "text-fg" : "text-muted"}`}><Icon name="plus" className="w-4 h-4" />בחירה{needed ? "" : " (לא חובה)"}</span>}
                  </span>
                </button>
              );
            })}
            <ToolsSlot tools={tools} setTools={setTools} />
          </div>
          {perf && <PerfPanel perf={perf} />}
          {compat}
        </div>

        {/* desktop summary */}
        <aside className="hidden lg:block">
          <div className="sticky top-8 space-y-3">
            <div className="hud p-5">
              <div className="text-xs text-muted">סה"כ משוער</div>
              <div className="text-[2rem] font-extrabold osd leading-tight mt-0.5">{ils(t.price)}</div>
              <div className="flex items-center justify-between mt-2 text-sm"><span className="text-muted osd">{t.auw}g משקל המראה</span><StatusPill errors={errors.length} /></div>
              {perf && <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-panel2 rounded-[10px] p-2.5"><div className="text-[11px] text-muted">זמן טיסה</div><div className="osd font-bold" dir="ltr" style={{ textAlign: "right" }}>{perf.flightMin[0]}–{perf.flightMin[1]}′</div></div>
                <div className="bg-panel2 rounded-[10px] p-2.5"><div className="text-[11px] text-muted">דחף-משקל</div><div className="osd font-bold" dir="ltr" style={{ textAlign: "right" }}>{perf.twr}:1</div></div>
              </div>}
              <a href="#cart" className={`btn btn-neon w-full mt-4 ${empty ? "pointer-events-none opacity-40" : ""}`}><Icon name="cart" className="w-4 h-4" />רשימת קניות</a>
            </div>
            {!empty && (
              <div className="hud p-2">
                <a href="#guide" className="nav-item"><Icon name="guide" className="w-[18px] h-[18px]" />מדריך הרכבה</a>
                <a href="#betaflight" className="nav-item"><Icon name="betaflight" className="w-[18px] h-[18px]" />קובץ Betaflight</a>
                <SaveToHangar ids={ids} tools={tools} mode={mode} hangar={hangar} setHangar={setHangar} build={build} variant="row" />
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* phone: actions + sticky bar */}
      {!empty && (
        <div className="lg:hidden grid grid-cols-3 gap-2 mt-5">
          <a href="#guide" className="border border-line bg-panel p-3 text-center text-[13px] card-hover"><Icon name="guide" className="w-5 h-5 mx-auto text-neon mb-1" />מדריך הרכבה</a>
          <a href="#betaflight" className="border border-line bg-panel p-3 text-center text-[13px] card-hover"><Icon name="betaflight" className="w-5 h-5 mx-auto text-neon mb-1" />Betaflight</a>
          <SaveToHangar ids={ids} tools={tools} mode={mode} hangar={hangar} setHangar={setHangar} build={build} />
        </div>
      )}
      {!empty && (
        <div className="lg:hidden fixed inset-x-0 z-30 md:mr-64" style={{ bottom: "calc(62px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="gutter">
            <div className="hud flex items-center justify-between gap-3 px-4 py-3" style={{ background: "rgba(18,22,27,.97)", backdropFilter: "blur(10px)" }}>
              <div className="leading-tight">
                <div className="text-lg font-bold osd">{ils(t.price)}</div>
                <div className="text-xs text-muted flex items-center gap-2"><span className="osd">{t.auw}g</span><StatusPill errors={errors.length} /></div>
              </div>
              <a href="#cart" className="btn btn-neon"><Icon name="cart" className="w-4 h-4" />רשימת קניות</a>
            </div>
          </div>
        </div>
      )}
      {!empty && <div className="h-24 lg:hidden" aria-hidden="true" />}
      {picker && <Picker cat={picker} build={build} current={build[picker]} onPick={p => choose(picker, p)} onClose={() => setPicker(null)} />}
    </div>
  );
}

function IssueRow({ i }) {
  return (
    <div className={`border p-3 ${i.level === "error" ? "lv-error" : "lv-warn"}`} style={{ color: "inherit" }}>
      <div className={`font-bold text-sm ${i.level === "error" ? "text-bad" : "text-warn"}`}>{i.level === "error" ? "✕" : "!"} {i.title}</div>
      <p className="text-sm text-fg mt-1 leading-relaxed">{i.msg}</p>
      {i.fix && <p className="text-xs text-muted mt-1">הפתרון: {i.fix}</p>}
    </div>
  );
}

function ToolsSlot({ tools, setTools }) {
  const [open, setOpen] = useState(false);
  const all = PARTS.filter(p => p.cat === "tools");
  return (
    <div className="border border-line bg-panel p-3.5 sm:col-span-2">
      <button className="w-full flex justify-between items-center text-right" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="flex items-center gap-3"><span className="text-neon"><Icon name="tools" /></span>
          <span><span className="block text-xs text-muted">כלים וציוד נלווה</span><span className="font-bold">{tools.length ? `${tools.length} פריטים` : "+ הוסף"}</span></span></span>
        <span className="osd text-muted text-xs">{open ? "סגור ▲" : "פתח ▼"}</span>
      </button>
      {open && (
        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          {all.map(p => {
            const on = tools.includes(p.id);
            return (
              <label key={p.id} className={`flex items-center gap-2 border p-2.5 cursor-pointer text-sm ${on ? "bd-neon bg-neon-soft" : "border-line"}`}>
                <input type="checkbox" checked={on} onChange={() => setTools(on ? tools.filter(x => x !== p.id) : [...tools, p.id])} className="accent-[#4ff0c4]" />
                <span className="flex-1">{p.name}</span><span className="osd text-muted text-xs">{ils(p.price)}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Picker({ cat, build, current, onPick, onClose }) {
  const list = PARTS.filter(p => p.cat === cat).map(p => ({ p, errs: errorsIfChosen(build, p) }))
    .sort((a, b) => (a.errs.length > 0) - (b.errs.length > 0) || a.p.price - b.p.price);
  useEffect(() => { const k = e => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,.7)" }} onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={CATEGORIES[cat].label}>
      <div className="w-full max-w-xl bg-panel border border-line max-h-[85vh] flex flex-col rise" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="font-black flex items-center gap-2"><span className="text-neon"><Icon name={CATEGORIES[cat].icon} /></span>{CATEGORIES[cat].label}</h2>
          <button onClick={onClose} className="osd text-muted px-2" aria-label="סגור">✕</button>
        </div>
        <div className="overflow-y-auto p-3 space-y-2">
          {list.map(({ p, errs }) => (
            <button key={p.id} onClick={() => onPick(p)} className={`w-full text-right border p-3 transition ${current?.id === p.id ? "bd-neon bg-neon-soft" : errs.length ? "border-line opacity-70" : "border-line hover:border-muted"}`}>
              <div className="flex justify-between gap-3">
                <span className="font-bold leading-snug"><bdi>{title(p)}</bdi></span>
                <span className="osd shrink-0">{ils(p.price)}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">{specLine(p).map(s => <span key={s} className="chip"><bdi>{s}</bdi></span>)}</div>
              <div className="mt-2">{errs.length ? <Level level="error">{errs[0].title}</Level> : <Level level="ok">מתאים לבילד</Level>}</div>
              {errs.length > 0 && <p className="text-xs text-muted mt-1 leading-relaxed">{errs[0].msg}</p>}
            </button>
          ))}
          {current && <button onClick={() => onPick(null)} className="w-full btn btn-ghost">הסר בחירה</button>}
        </div>
      </div>
    </div>
  );
}

// ---------- cart ----------
function Cart({ build, toolParts, errors, t, mode }) {
  const [copied, setCopied] = useState(false);
  const cats = mode === "bnf" ? BNF_CATS : BUILD_CATS;
  const items = cats.map(c => build[c]).filter(Boolean).concat(toolParts);
  const suggestions = [];
  if (mode !== "bnf" && !toolParts.some(p => p.kind === "iron")) suggestions.push(BY_ID["tool-pinecil"]);
  if (mode !== "bnf" && !toolParts.some(p => p.kind === "smoke")) suggestions.push(BY_ID["tool-smoke-stopper"]);
  if (!toolParts.some(p => p.kind === "lipobag")) suggestions.push(BY_ID["tool-lipo-bag"]);
  const text = items.map(p => `• $<bdi>{title(p)}</bdi> — ${ils(p.price)}`).join("\n") + `\nסה"כ: ${ils(t.price)}`;
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { const el = document.getElementById("cart-text"); if (el) { el.hidden = false; el.select(); } }
  }
  if (!items.length) return <div className="text-center mt-10"><p className="text-muted">הרשימה ריקה.</p><a className="btn btn-neon mt-4" href="#build">לקונפיגורטור</a></div>;
  return (
    <div className="rise">
      <a href="#build" className="osd text-xs text-muted">→ חזרה לקונפיגורטור</a>
      <h1 className="text-2xl font-black mt-2">רשימת קניות</h1>
      {errors.length > 0 && <p className="lv-error border p-3 mt-3 text-sm">יש {errors.length} שגיאות תאימות בבילד. כדאי לתקן אותן לפני שקונים. <a href="#build" className="underline">לתיקון</a></p>}
      <div className="hud mt-4 divide-y divide-[color:var(--line)]">
        {items.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-3.5">
            <span className="text-neon"><Icon name={CATEGORIES[p.cat].icon} /></span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted">{CATEGORIES[p.cat].label}</div>
              <div className="font-bold leading-snug"><bdi>{title(p)}</bdi></div>
            </div>
            <span className="osd text-sm">{ils(p.price)}</span>
            <a href={buyLink(p)} target="_blank" rel="noopener sponsored" className="btn btn-ghost !py-2 !px-3 text-sm">לקנייה</a>
          </div>
        ))}
        <div className="flex justify-between p-4 osd"><span className="text-muted">סה"כ משוער</span><span className="text-xl text-neon">{ils(t.price)}</span></div>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-5">
          <h2 className="font-bold mb-2">לא לשכוח</h2>
          <div className="grid sm:grid-cols-3 gap-2">
            {suggestions.map(p => (
              <a key={p.id} href={buyLink(p)} target="_blank" rel="noopener sponsored" className="border border-line bg-panel p-3 text-sm hover:border-muted">
                <div className="font-bold">{p.name}</div><div className="osd text-muted text-xs mt-1">{ils(p.price)} · לקנייה ←</div>
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-5">
        <button onClick={copy} className="btn btn-ghost">{copied ? "✓ הועתק" : "העתק רשימה"}</button>
        <a className="btn btn-ghost" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent("הבילד שלי ב-" + CONFIG.BRAND + ":\n" + text)}`}>שלח בוואטסאפ</a>
      </div>
      <textarea id="cart-text" hidden readOnly value={text} className="w-full mt-3 bg-panel border border-line p-3 text-sm h-40" />
      <p className="text-xs text-muted mt-5 leading-relaxed">המחירים משוערים ומשתנים בין חנויות. קישורי הקנייה הם קישורי שותפים: אם תקנה דרכם, נקבל עמלה קטנה בלי שהמחיר שלך ישתנה. העמלה לא משפיעה על בדיקות התאימות ולא על סדר ההמלצות.</p>
    </div>
  );
}

// ---------- lessons ----------
function Learn({ done }) {
  const n = LESSONS.filter(l => done[l.id]).length;
  return (
    <div className="rise">
      <h1 className="text-2xl font-black">שיעורי יסוד</h1>
      <p className="text-sm text-muted">6 שיעורים של 3–4 דקות. כל שיעור נגמר בשאלת בדיקה אחת.</p>
      <div className="h-1 bg-panel2 mt-4"><div className="h-full bg-neon" style={{ width: `${n / LESSONS.length * 100}%` }} /></div>
      <p className="osd text-xs text-muted mt-1">{n}/{LESSONS.length} הושלמו</p>
      <div className="space-y-2 mt-4">
        {LESSONS.map((l, k) => (
          <a key={l.id} href={"#lesson-" + l.id} className="flex items-center gap-3 border border-line bg-panel p-4 hover:border-muted">
            <span className={`w-8 h-8 grid place-items-center border osd text-sm ${done[l.id] ? "bg-neon text-ink border-neon" : "border-line text-muted"}`}>{done[l.id] ? "✓" : k + 1}</span>
            <span className="flex-1"><span className="block text-xs text-muted">{l.unit} · {l.min} דק'</span><span className="font-bold">{l.title}</span></span>
            <span className="text-muted">←</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function Lesson({ hash, done, setDone }) {
  const id = hash.slice("lesson-".length);
  const idx = LESSONS.findIndex(l => l.id === id);
  const l = LESSONS[idx];
  const [ans, setAns] = useState(null);
  useEffect(() => setAns(null), [id]);
  if (!l) return <p className="text-muted">השיעור לא נמצא. <a className="text-neon" href="#learn">לכל השיעורים</a></p>;
  const nextL = LESSONS[idx + 1];
  const right = ans === l.quiz.correct;
  return (
    <article className="rise" key={id}>
      <a href="#learn" className="osd text-xs text-muted">→ כל השיעורים</a>
      <div className="osd text-xs text-neon mt-3">{l.unit} · שיעור {idx + 1} · {l.min} דק'</div>
      <h1 className="text-3xl font-black mt-1">{l.title}</h1>
      <div className="space-y-5 mt-5 max-w-prose">
        {l.body.map(([h, p]) => (
          <section key={h}><h2 className="font-bold text-lg">{h}</h2><p className="text-[15.5px] leading-[1.8] text-fg/90 mt-1" style={{ color: "#cdd8d5" }}>{p}</p></section>
        ))}
      </div>
      <section className="hud p-4 mt-7">
        <div className="osd text-xs text-neon">שאלת בדיקה</div>
        <h3 className="font-bold mt-1">{l.quiz.q}</h3>
        <div className="space-y-2 mt-3">
          {l.quiz.options.map((o, k) => {
            const state = ans === null ? "" : k === l.quiz.correct ? "bd-neon bg-neon-soft" : k === ans ? "bd-error" : "opacity-60";
            return <button key={k} disabled={ans !== null} onClick={() => { setAns(k); if (k === l.quiz.correct) setDone({ ...done, [l.id]: true }); }} className={`w-full text-right border border-line p-3 ${state}`}>{o}</button>;
          })}
        </div>
        {ans !== null && (
          <div className="mt-3 text-sm">
            <p className={right ? "text-neon font-bold" : "text-bad font-bold"}>{right ? "✓ נכון!" : "✕ לא בדיוק."}</p>
            <p className="text-muted mt-1">{l.quiz.explain}</p>
            {!right && <button className="text-neon underline mt-2" onClick={() => setAns(null)}>לנסות שוב</button>}
          </div>
        )}
      </section>
      <div className="flex justify-between mt-6">
        {nextL ? <a href={"#lesson-" + nextL.id} className="btn btn-neon">לשיעור הבא ←</a> : <a href="#safety" className="btn btn-neon">לצ'קליסט הבטיחות ←</a>}
      </div>
    </article>
  );
}

// ---------- safety ----------
function Safety({ checks, setChecks }) {
  const all = PREFLIGHT.every((_, k) => checks["p" + k]);
  return (
    <div className="rise">
      <h1 className="text-2xl font-black">בדיקת בטיחות לפני טיסה</h1>
      <p className="text-sm text-muted">עד שכל הסעיפים מסומנים, לא ממריאים. מאפסים לפני כל יום טיסות.</p>
      <div className="hud mt-4 p-2">
        {PREFLIGHT.map((item, k) => (
          <label key={k} className="flex items-start gap-3 p-2.5 cursor-pointer">
            <input type="checkbox" className="mt-1 w-5 h-5 accent-[#4ff0c4]" checked={!!checks["p" + k]} onChange={e => setChecks({ ...checks, ["p" + k]: e.target.checked })} />
            <span className={checks["p" + k] ? "text-muted line-through" : ""}>{item}</span>
          </label>
        ))}
      </div>
      <div className={`mt-3 p-3 border osd text-sm ${all ? "lv-ok" : "border-line text-muted"}`}>{all ? "✓ READY TO ARM · מוכן לטיסה" : `${PREFLIGHT.filter((_, k) => checks["p" + k]).length}/${PREFLIGHT.length} · עוד לא`}</div>
      <button className="text-xs text-muted underline mt-2" onClick={() => setChecks({})}>איפוס לרשימה חדשה</button>

      <h2 className="font-black text-lg mt-8">5 כללי LiPo</h2>
      <ul className="mt-2 space-y-1.5">{LIPO_RULES.map(r => <li key={r} className="flex gap-2 text-sm"><span className="text-warn osd">!</span>{r}</li>)}</ul>

      <h2 className="font-black text-lg mt-8">רגולציה</h2>
      <p className="text-sm text-muted mt-1 leading-relaxed">הכללים בישראל משתנים, ולכן לא נכתבים כאן כעובדה סופית. לפני טיסה ראשונה בדקו באתר רת"א את הדרישות העדכניות: רישום הכטב"ם, רישיון מטיס (לרחפן קטן מגיל 16), מגבלות גובה, מרחק ממגורים ואזורים אסורים.</p>
      <a className="btn btn-ghost mt-3" href="https://www.gov.il/he/search?query=%D7%A8%D7%97%D7%A4%D7%A0%D7%99%D7%9D" target="_blank" rel="noopener">חיפוש הנחיות רחפנים ב-gov.il ←</a>
      <p className="text-xs text-muted mt-6">התוכן חינוכי. האחריות להפעלת הרחפן היא של המטיס.</p>
    </div>
  );
}


// ---------- performance ----------
function PerfPanel({ perf }) {
  const clsLabel = { freestyle: "5\" פריסטייל", cinematic: "סינווופ", longrange: "לונג ריינג'", whoop: "ווף" }[perf.cls];
  return (
    <section className="hud mt-5 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-black">ביצועים משוערים</h2>
        <span className="osd text-[11px] text-muted">{clsLabel} · הערכה בלבד</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        {[
          ["זמן טיסה", `${perf.flightMin[0]}–${perf.flightMin[1]}`, "דק' בטיסה מעורבת"],
          ["דחף-משקל", `${perf.twr}:1`, `${(perf.thrust / 1000).toFixed(1)} ק"ג דחף`],
          ["גז בריחוף", `${perf.hoverThrottle}%`, "בערך"],
          ["משקל המראה", `${perf.auw}g`, `${perf.usableWh}Wh שמישים`],
        ].map(([k, v, sub]) => (
          <div key={k} className="border border-line p-2.5">
            <div className="text-[11px] text-muted">{k}</div>
            <div className="osd text-xl text-neon leading-tight mt-0.5" dir="ltr" style={{ textAlign: "right" }}>{v}</div>
            <div className="text-[11px] text-muted">{sub}</div>
          </div>
        ))}
      </div>
      {perf.notes.map((n, k) => <p key={k} className={`text-sm mt-2 ${n.level === "warn" ? "text-warn" : "text-muted"}`}>{n.level === "warn" ? "! " : ""}{n.msg}</p>)}
      <p className="text-[11px] text-muted mt-2 leading-relaxed">החישוב מבוסס על נצילות ממוצעת לפי גודל הפרופ, דחף משוער מהיצרן ו-80% מהאנרגיה של הסוללה. הזמן בפועל תלוי בסגנון הטיסה, ברוח ובטמפרטורה.</p>
    </section>
  );
}

// ---------- hangar ----------
function SaveToHangar({ ids, tools, mode, hangar, setHangar, build, variant }) {
  const [open, setOpen] = useState(false);
  const def = (build.bnf ? build.bnf.name : build.frame ? build.frame.name : "הבילד שלי").split(" (")[0];
  const [name, setName] = useState(def);
  const [saved, setSaved] = useState(false);
  function save(e) {
    e.preventDefault();
    setHangar([{ id: Date.now().toString(36), name: name.trim() || def, mode, ids, tools, savedAt: new Date().toISOString() }, ...hangar].slice(0, 20));
    setSaved(true); setOpen(false); setTimeout(() => setSaved(false), 2000);
  }
  return (
    <>
      {variant === "row"
        ? <button onClick={() => { setName(def); setOpen(true); }} className="nav-item w-full"><Icon name={saved ? "check" : "save"} className="w-[18px] h-[18px]" />{saved ? "נשמר בהאנגר" : "שמירה להאנגר"}</button>
        : <button onClick={() => { setName(def); setOpen(true); }} className="border border-line bg-panel p-3 text-center text-[13px] card-hover"><Icon name={saved ? "check" : "save"} className="w-5 h-5 mx-auto text-neon mb-1" />{saved ? "נשמר" : "שמירה"}</button>}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center gutter" style={{ background: "rgba(0,0,0,.7)" }} onClick={e => e.target === e.currentTarget && setOpen(false)} role="dialog" aria-modal="true" aria-label="שמירת בילד">
          <form onSubmit={save} className="hud w-full max-w-sm p-5 rise">
            <h2 className="font-black">שמירה להאנגר</h2>
            <label htmlFor="hangar-name" className="block text-sm text-muted mt-3 mb-1">שם הבילד</label>
            <input id="hangar-name" autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={40} className="w-full bg-panel2 border border-line p-3 text-fg" />
            <div className="flex gap-2 mt-4"><button className="btn btn-neon flex-1">שמור</button><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>ביטול</button></div>
          </form>
        </div>
      )}
    </>
  );
}

function Hangar({ hangar, setHangar, setIds, setTools, setMode }) {
  const [confirm, setConfirm] = useState(null);
  function load(h) { setIds(h.ids); setTools(h.tools || []); setMode(h.mode); go("build"); }
  return (
    <div className="rise">
      <a href="#build" className="osd text-xs text-muted">→ חזרה לקונפיגורטור</a>
      <h1 className="text-2xl font-black mt-2">האנגר שלי</h1>
      <p className="text-sm text-muted">בילדים ששמרת במכשיר הזה. אפשר לטעון, להשוות ולמחוק.</p>
      {!hangar.length && <div className="hud p-6 mt-4 text-center"><p className="text-muted">ההאנגר ריק. בנה בילד בקונפיגורטור ולחץ "שמור להאנגר".</p><a href="#build" className="btn btn-neon mt-4">לקונפיגורטור</a></div>}
      <div className="space-y-2 mt-4">
        {hangar.map(h => {
          const b = {}; Object.entries(h.ids || {}).forEach(([c, id]) => { if (id && BY_ID[id]) b[c] = BY_ID[id]; });
          const full = { frame: null, motors: null, stack: null, vtx: null, camera: null, receiver: null, props: null, battery: null, radio: null, goggles: null, charger: null, bnf: null, ...b };
          const errs = check(full).filter(i => i.level === "error").length;
          const tt = totals(full, (h.tools || []).map(x => BY_ID[x]).filter(Boolean));
          const pf = performance(full);
          return (
            <div key={h.id} className="border border-line bg-panel p-4">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold">{h.name}</h3>
                  <p className="text-xs text-muted">{h.mode === "bnf" ? "מוכן (BNF)" : "בנייה"} · נשמר {new Date(h.savedAt).toLocaleDateString("he-IL")}</p>
                </div>
                <div className="osd text-left text-sm shrink-0"><div>{ils(tt.price)}</div><div className={errs ? "text-bad text-xs" : "text-neon text-xs"}>{errs ? `${errs} ERR` : "OK"}</div></div>
              </div>
              {pf && <p className="osd text-xs text-muted mt-2">{tt.auw}g · TWR <span dir="ltr">{pf.twr}:1</span> · <span dir="ltr">{pf.flightMin[0]}–{pf.flightMin[1]}</span> דק'</p>}
              <div className="flex gap-2 mt-3">
                <button className="btn btn-neon !py-2 text-sm" onClick={() => load(h)}>טען לקונפיגורטור</button>
                {confirm === h.id
                  ? <button className="btn btn-ghost !py-2 text-sm text-bad" onClick={() => { setHangar(hangar.filter(x => x.id !== h.id)); setConfirm(null); }}>בטוח? מחק</button>
                  : <button className="btn btn-ghost !py-2 text-sm" onClick={() => setConfirm(h.id)}>מחק</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- assembly guide ----------
function Guide({ build, guideDone, setGuideDone, mode }) {
  const steps = assemblySteps(build);
  const key = (mode === "bnf" ? (build.bnf && build.bnf.id) : (build.frame && build.frame.id)) || "none";
  const dm = guideDone[key] || {};
  const n = steps.filter(s => dm[s.id]).length;
  const toggle = id => setGuideDone({ ...guideDone, [key]: { ...dm, [id]: !dm[id] } });
  const empty = !Object.values(build).some(Boolean);
  return (
    <div className="rise">
      <a href="#build" className="osd text-xs text-muted">→ חזרה לקונפיגורטור</a>
      <h1 className="text-2xl font-black mt-2">{mode === "bnf" ? "הכנה לטיסה" : "מדריך הרכבה"}</h1>
      <p className="text-sm text-muted">{empty ? "בחר חלקים בקונפיגורטור, והמדריך יתאים את עצמו אליהם." : "הצעדים נכתבו לפי החלקים שבחרת. סמן כל צעד כשסיימת."}</p>
      <div className="h-1 bg-panel2 mt-4"><div className="h-full bg-neon transition-all" style={{ width: `${n / steps.length * 100}%` }} /></div>
      <p className="osd text-xs text-muted mt-1">{n}/{steps.length}</p>
      <ol className="space-y-2.5 mt-4">
        {steps.map((s, k) => (
          <li key={s.id} className={`border bg-panel p-4 ${dm[s.id] ? "border-line opacity-70" : "border-line"}`}>
            <div className="flex gap-3">
              <button onClick={() => toggle(s.id)} className={`shrink-0 w-8 h-8 grid place-items-center border osd text-sm ${dm[s.id] ? "bg-neon text-ink border-neon" : "border-line text-muted"}`} aria-label={dm[s.id] ? "סמן כלא בוצע" : "סמן כבוצע"} aria-pressed={!!dm[s.id]}>{dm[s.id] ? "✓" : k + 1}</button>
              <div className="min-w-0">
                <h3 className="font-bold leading-snug">{s.title}</h3>
                <p className="text-sm leading-relaxed mt-1" style={{ color: "#c3cfcc" }}>{s.body}</p>
                {s.warn && <p className="text-sm text-warn mt-2">⚠ {s.warn}</p>}
                {s.tools && <div className="flex flex-wrap gap-1 mt-2">{s.tools.map(t => <span key={t} className="chip">{t}</span>)}</div>}
                {s.link && <a href={s.link} className="text-neon underline text-sm inline-block mt-2">פתח ←</a>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------- betaflight ----------
function BetaflightView({ build }) {
  const { cli, checks, digital } = betaflightCli(build);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(cli); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { const el = document.getElementById("cli-box"); if (el) { el.focus(); el.select(); } }
  }
  return (
    <div className="rise">
      <a href="#build" className="osd text-xs text-muted">→ חזרה לקונפיגורטור</a>
      <h1 className="text-2xl font-black mt-2">עוזר Betaflight</h1>
      <p className="text-sm text-muted">קובץ הגדרות שמתאים לבילד שלך{digital ? " (כולל OSD למשדר הדיגיטלי)" : ""}. מדביקים בטאב CLI של Betaflight Configurator ולוחצים Enter.</p>
      <div className="hud mt-4">
        <div className="flex items-center justify-between px-3 py-2 border-b border-line">
          <span className="osd text-xs text-neon">CLI · BF 4.4/4.5</span>
          <button onClick={copy} className="osd text-xs border border-line px-2 py-1 hover:border-muted">{copied ? "✓ הועתק" : "העתק"}</button>
        </div>
        <textarea id="cli-box" readOnly value={cli} dir="ltr" spellCheck="false" className="w-full bg-transparent osd text-[12.5px] leading-relaxed p-3 h-80 resize-y text-fg focus:outline-none" />
      </div>
      <p className="text-xs text-warn mt-2">⚠ ההגדרות מניחות מקלט על UART2 ו-VTX על UART1, כמו במדריך ההרכבה. חיברתם אחרת? שנו את מספרי ה-serial. תמיד בלי פרופלורים כשהרחפן מחובר למחשב.</p>
      <h2 className="font-black text-lg mt-7">בדיקות אחרי ההדבקה</h2>
      <ul className="mt-2 space-y-2">{checks.map(c => <li key={c} className="flex gap-2 text-sm"><span className="text-neon osd">▸</span>{c}</li>)}</ul>
    </div>
  );
}

// ---------- AI tutor ----------
function Tutor({ build, issues, view }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState(() => load("tutor", []));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => save("tutor", msgs.slice(-20)), [msgs]);
  const starters = ["למה צריך Smoke Stopper?", "מה ההבדל בין Angle ל-Acro?", "הבילד שלי מתאים למתחיל?"];
  async function ask(q) {
    const text = (q || input).trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    const ctxBuild = {}; Object.entries(build).forEach(([c, p]) => { if (p) ctxBuild[CATEGORIES[c].label] = title(p); });
    try {
      const r = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, context: { build: ctxBuild, issues: issues.filter(i => i.level !== "ok"), page: view } }) });
      const ct = r.headers.get("content-type") || "";
      const data = ct.includes("json") ? await r.json() : null;
      const reply = data && (data.reply || data.message);
      setMsgs([...next, { role: "assistant", content: reply || "המורה זמין אחרי העלאת האתר ל-Vercel עם מפתח API. בינתיים: השיעורים ומדריך ההרכבה מכסים את רוב השאלות.", error: !data || !data.reply }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "אין חיבור למורה כרגע. נסה שוב בעוד רגע.", error: true }]);
    } finally { setBusy(false); }
  }
  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className={`fixed z-40 btn btn-neon !rounded-full !p-0 w-12 h-12 md:w-auto md:h-auto md:!px-4 md:!py-3 shadow-lg md:!bottom-8 ${view === "build" ? "lg:!left-[calc(16px+env(safe-area-inset-left,0px))]" : ""}`} style={{ left: "calc(16px + env(safe-area-inset-left, 0px))", bottom: view === "build" ? "calc(148px + env(safe-area-inset-bottom, 0px))" : "calc(76px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 10px 30px -8px rgba(45,212,191,.5)" }} aria-label="שאל את המורה">
          <Icon name="tutor" className="w-5 h-5" /><span className="hidden md:inline">מורה AI</span>
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,.6)" }} onClick={e => e.target === e.currentTarget && setOpen(false)} role="dialog" aria-modal="true" aria-label="המורה של Go4FPV">
          <div className="w-full max-w-lg bg-panel border border-line h-[78vh] flex flex-col rise" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <div className="flex items-center justify-between p-3 border-b border-line">
              <div><h2 className="font-black">המורה של {CONFIG.BRAND}</h2><p className="text-[11px] text-muted">מכיר את הבילד שלך. לא מחליף את מנוע התאימות ואת צ'קליסט הבטיחות.</p></div>
              <button onClick={() => setOpen(false)} className="osd text-muted px-2" aria-label="סגור">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {!msgs.length && <div className="text-sm text-muted">שאל כל שאלה על בנייה, הגדרות או טיסה. לדוגמה:
                <div className="flex flex-wrap gap-2 mt-3">{starters.map(s => <button key={s} onClick={() => ask(s)} className="border border-line px-3 py-1.5 text-fg hover:border-muted">{s}</button>)}</div></div>}
              {msgs.map((m, k) => (
                <div key={k} className={`max-w-[88%] p-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "mr-auto ml-0 bg-panel2 border border-line" : `ml-auto mr-0 border ${m.error ? "lv-warn" : "bd-neon bg-neon-soft"}`}`} style={m.role === "user" ? { marginLeft: 0, marginRight: "auto" } : { marginRight: 0, marginLeft: "auto", color: m.error ? undefined : "var(--fg)" }}>{m.content}</div>
              ))}
              {busy && <div className="osd text-xs text-neon blink">המורה חושב…</div>}
            </div>
            <form onSubmit={e => { e.preventDefault(); ask(); }} className="p-3 border-t border-line flex gap-2">
              <label htmlFor="tutor-input" className="sr-only">שאלה למורה</label>
              <input id="tutor-input" value={input} onChange={e => setInput(e.target.value)} maxLength={1500} placeholder="מה רצית לשאול?" className="flex-1 bg-panel2 border border-line p-3 text-fg" />
              <button className="btn btn-neon" disabled={busy}>שלח</button>
            </form>
            {msgs.length > 0 && <button onClick={() => setMsgs([])} className="text-[11px] text-muted underline pb-2">שיחה חדשה</button>}
          </div>
        </div>
      )}
    </>
  );
}
