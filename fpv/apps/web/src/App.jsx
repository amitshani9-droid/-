import { useEffect, useMemo, useState } from "react";
import data from "@compat/data/parts.json";
import { CATEGORIES, SYSTEM_LABEL, PROTOCOL_LABEL, check, errorsIfChosen, totals, missingParts } from "@compat/src/index.js";
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
  const ctx = { answers, setAnswers, profile, quizDone, ids, setIds, tools, setTools, mode, setMode, build, toolParts, issues, errors, t, applyPreset, done, setDone, steps, setSteps, checks, setChecks, hash };

  return (
    <div className="min-h-full flex flex-col">
      <TopBar t={t} errors={errors.length} view={view} hasBuild={Object.values(build).some(Boolean)} />
      <main className="flex-1 w-full max-w-3xl mx-auto gutter pb-28 pt-4">
        {view === "home" && <Home {...ctx} />}
        {view === "quiz" && <Quiz {...ctx} />}
        {view === "route" && <Route {...ctx} />}
        {view === "build" && <Builder {...ctx} />}
        {view === "cart" && <Cart {...ctx} />}
        {view === "learn" && <Learn {...ctx} />}
        {view === "lesson" && <Lesson {...ctx} />}
        {view === "safety" && <Safety {...ctx} />}
      </main>
      <BottomNav view={view} />
    </div>
  );
}

// ---------- chrome ----------
function TopBar({ t, errors, view, hasBuild }) {
  return (
    <header className="sticky z-40 border-b border-line bg-ink/90 backdrop-blur" style={{ top: "env(safe-area-inset-top, 0px)", background: "rgba(7,9,11,.88)" }}>
      <div className="max-w-3xl mx-auto gutter h-14 flex items-center justify-between gap-3">
        <a href="#" className="flex items-center gap-2 font-black text-lg">
          <span className="w-7 h-7 grid place-items-center border border-line text-neon osd text-xs">G4</span>
          <span>{CONFIG.BRAND}<span className="text-neon"> Builder</span></span>
        </a>
        {hasBuild && view !== "home" && (
          <a href="#build" className="osd text-xs flex items-center gap-3 text-muted">
            <span className="text-fg">{ils(t.price)}</span>
            <span>{t.auw}g</span>
            <span className={errors ? "text-bad" : "text-neon"}>{errors ? `${errors} ERR` : "OK"}</span>
          </a>
        )}
      </div>
    </header>
  );
}

function BottomNav({ view }) {
  const items = [["route", "המסלול", "bnf"], ["build", "קונפיגורטור", "stack"], ["learn", "שיעורים", "camera"], ["safety", "בטיחות", "battery"]];
  const active = v => view === v || (v === "learn" && view === "lesson") || (v === "build" && view === "cart") || (v === "route" && view === "quiz");
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-line" style={{ background: "rgba(7,9,11,.94)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }} aria-label="ניווט ראשי">
      <div className="max-w-3xl mx-auto grid grid-cols-4 gutter">
        {items.map(([v, label, icon]) => (
          <a key={v} href={"#" + v} className={`flex flex-col items-center gap-1 py-2.5 text-[12px] ${active(v) ? "text-neon" : "text-muted"}`} aria-current={active(v) ? "page" : undefined}>
            <Icon name={icon} />{label}
          </a>
        ))}
      </div>
    </nav>
  );
}

// ---------- home ----------
function Home({ quizDone, profile }) {
  return (
    <div className="rise">
      <section className="hud scan overflow-hidden px-5 pt-6 pb-7 mt-2">
        <div className="osd text-[11px] text-neon flex justify-between mb-4"><span>● REC 00:00</span><span>25.2V · 6S</span></div>
        <div className="grid md:grid-cols-[1fr_260px] gap-4 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-black leading-[1.05] tracking-tight">מאפס מוחלט<br />ועד <span className="text-neon">טיסה ראשונה</span>.</h1>
            <p className="text-muted mt-4 max-w-md leading-relaxed">שאלון של 2 דקות, מסלול אישי לפי המטרה והתקציב שלך, קונפיגורטור שבודק שכל חלק מתאים לשאר, ושיעורים קצרים בעברית. בלי לזרוק כסף על חלקים שלא מתאימים.</p>
            <div className="flex flex-wrap gap-3 mt-6">
              {quizDone
                ? <><a href="#route" className="btn btn-neon">להמשיך במסלול שלי ←</a><a href="#quiz" className="btn btn-ghost">לענות מחדש</a></>
                : <a href="#quiz" className="btn btn-neon">להתחיל את השאלון ←</a>}
              <a href="#build" className="btn btn-ghost">ישר לקונפיגורטור</a>
            </div>
            {quizDone && <p className="osd text-xs text-muted mt-4">הפרופיל שלך: <span className="text-fg">{profile.classInfo.label}</span> · {profile.video === "digital" ? "דיגיטלי" : "אנלוגי"} · {profile.path === "bnf" ? "מוכן לטיסה" : "בנייה עצמית"}</p>}
          </div>
          <Drone className="w-56 md:w-full mx-auto" glow />
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-3 mt-4">
        {[
          ["01", "שאלון חכם", "10 שאלות על המטרה, הניסיון והתקציב. בסוף תקבל מסלול ובילד מומלץ."],
          ["02", "קונפיגורטור", `${PARTS.length} חלקים, 13 כללי תאימות. כל חלק שלא מתאים מסומן בשורה שמסבירה למה.`],
          ["03", "שיעורים + בטיחות", "6 שיעורי יסוד של 3–4 דקות, וצ'קליסט שחייב לעבור לפני הטיסה הראשונה."],
        ].map(([n, h, p]) => (
          <div key={n} className="border border-line bg-panel p-4">
            <div className="osd text-neon text-xs">{n}</div>
            <h3 className="font-bold mt-1">{h}</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">{p}</p>
          </div>
        ))}
      </section>
      <p className="text-xs text-muted mt-6 leading-relaxed">המוצר חינמי. חלק מקישורי הקנייה הם קישורי שותפים: אם תקנה דרכם, נקבל עמלה קטנה. זה לא משנה את המחיר שלך, ולא את בדיקות התאימות או את סדר ההמלצות.</p>
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
    assemble: <>הסדר: מנועים לזרועות, סטאק על הפריים, הלחמת מנועים ל-ESC, מקלט ו-VTX ל-UART, מצלמה. חיבור ראשון תמיד דרך Smoke Stopper. מדריך הרכבה מונפש לפי הבילד שלך מגיע בשלב הבא; בינתיים עברו על <a className="text-neon underline" href="#lesson-components">שיעור הרכיבים</a>.</>,
    setup: <>Betaflight Configurator: צריבת קושחה, הגדרת פורטים (UART של המקלט ושל ה-VTX), בינד למקלט, כיוון מנועים, מתג Arm, מצבי טיסה ו-Failsafe. {p.path === "bnf" ? "ברחפן מוכן רוב זה כבר מוגדר: רק בינד, מתגים ו-Failsafe." : ""}</>,
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
function Builder({ ids, setIds, tools, setTools, mode, setMode, build, toolParts, issues, errors, t, quizDone, applyPreset }) {
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

  return (
    <div className="rise">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black">קונפיגורטור</h1>
          <p className="text-sm text-muted">בחר חלק לכל מקום. כל בחירה נבדקת מול שאר הבילד.</p>
        </div>
        <div className="flex border border-line osd text-xs" role="tablist">
          {[["build", "בנייה"], ["bnf", "מוכן (BNF)"]].map(([m, l]) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`px-3 py-2 ${mode === m ? "bg-neon text-ink" : "text-muted"}`}>{l}</button>
          ))}
        </div>
      </div>

      {empty && (
        <div className="hud p-4 mt-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm">{quizDone ? "יש לך פרופיל. רוצה להתחיל מהבילד שהמלצנו?" : "לא בטוח מאיפה להתחיל? השאלון בונה לך בילד מומלץ."}</p>
          {quizDone ? <button className="btn btn-neon" onClick={applyPreset}>לטעון בילד מומלץ</button> : <a className="btn btn-neon" href="#quiz">לשאלון</a>}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-2.5 mt-4">
        {cats.map(c => {
          const p = build[c];
          const bad = errors.some(e => e.cats.includes(c));
          const needed = missing.includes(c);
          return (
            <button key={c} onClick={() => setPicker(c)} onAnimationEnd={() => setShakeId(null)}
              className={`text-right border bg-panel p-3.5 flex gap-3 items-start transition hover:border-muted ${bad ? "bd-error" : p ? "border-line" : "border-dashed border-line"} ${shakeId === c ? "shake" : ""}`}>
              <span className={`mt-0.5 ${bad ? "text-bad" : p ? "text-neon" : "text-muted"}`}><Icon name={CATEGORIES[c].icon} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2 text-xs text-muted"><span>{CATEGORIES[c].label}</span>{p && <span className="osd">{ils(p.price)}</span>}</span>
                {p ? <>
                  <span className="block font-bold leading-snug mt-0.5">{title(p)}</span>
                  <span className="flex flex-wrap gap-1 mt-1.5">{specLine(p).map(s => <span key={s} className="chip">{s}</span>)}</span>
                </> : <span className={`block mt-0.5 ${needed ? "text-fg" : "text-muted"}`}>+ בחר {needed ? "" : "(לא חובה)"}</span>}
              </span>
            </button>
          );
        })}
        <ToolsSlot tools={tools} setTools={setTools} />
      </div>

      <section className="mt-6">
        <h2 className="font-black text-lg mb-2">בדיקת תאימות</h2>
        {empty ? <p className="text-sm text-muted">בחר חלקים, והבדיקה תתעדכן כאן בזמן אמת.</p> : (
          <div className="space-y-2">
            {errors.map((e, k) => <IssueRow key={"e" + k} i={e} />)}
            {warns.map((e, k) => <IssueRow key={"w" + k} i={e} />)}
            {!errors.length && !warns.length && <p className="text-neon text-sm font-bold">✓ הכול מתאים. אפשר לעבור לרשימת הקניות.</p>}
            {oks.length > 0 && (
              <details className="text-sm"><summary className="cursor-pointer text-muted osd text-xs py-1">{oks.length} בדיקות עברו</summary>
                <div className="flex flex-wrap gap-1.5 mt-2">{oks.map((o, k) => <Level key={k} level="ok">{o.title}: {o.msg}</Level>)}</div>
              </details>
            )}
          </div>
        )}
      </section>

      {!empty && (
        <div className="fixed inset-x-0 z-30" style={{ bottom: "calc(58px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="max-w-3xl mx-auto gutter">
            <div className="hud flex items-center justify-between gap-3 px-4 py-3" style={{ background: "rgba(13,17,20,.97)" }}>
              <div className="osd text-sm leading-tight">
                <div className="text-lg text-fg">{ils(t.price)}</div>
                <div className="text-muted text-xs font-sans">{t.auw}g משקל המראה · <span className={errors.length ? "text-bad" : "text-neon"}>{errors.length ? `${errors.length} שגיאות` : "תואם"}</span></div>
              </div>
              <a href="#cart" className="btn btn-neon">רשימת קניות ←</a>
            </div>
          </div>
        </div>
      )}

      {!empty && <div className="h-24" aria-hidden="true" />}
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
                <span className="font-bold leading-snug">{title(p)}</span>
                <span className="osd shrink-0">{ils(p.price)}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">{specLine(p).map(s => <span key={s} className="chip">{s}</span>)}</div>
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
  const text = items.map(p => `• ${title(p)} — ${ils(p.price)}`).join("\n") + `\nסה"כ: ${ils(t.price)}`;
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
              <div className="font-bold leading-snug">{title(p)}</div>
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
