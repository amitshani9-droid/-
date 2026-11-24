// Questionnaire → profile → route + recommended (Go4FPV) preset build.
export const QUESTIONS = [
  { id: "goal", q: "מה אתה רוצה לעשות עם הרחפן?", hint: "אין תשובה לא נכונה. זה קובע איזה רחפן מתאים לך.", options: [
    { v: "freestyle", label: "פריסטייל", sub: "פליפים, רולים, צלילות" },
    { v: "cinematic", label: "צילום סינמטי", sub: "שוטים חלקים לווידאו" },
    { v: "longrange", label: "לונג ריינג'", sub: "טיסות רחוקות, הרים ונופים" },
    { v: "race", label: "מירוצים", sub: "מהירות בין שערים" },
    { v: "whoop", label: "ווף לבית", sub: "רחפן זעיר שלא שובר כלום" },
  ] },
  { id: "exp", q: "כמה ניסיון יש לך?", options: [
    { v: "none", label: "אפס", sub: "רק ראיתי סרטונים" },
    { v: "sim", label: "סימולטור", sub: "שיחקתי קצת" },
    { v: "dji", label: "רחפן רגיל", sub: "DJI Mini / Mavic וכו'" },
    { v: "fpv", label: "כבר מטיס FPV", sub: "יש לי רחפן מוכן" },
  ] },
  { id: "budget", q: "מה התקציב הכולל, כולל שלט ומשקפות?", options: [
    { v: "low", label: "עד ₪2,500", sub: "מתחילים חכם" },
    { v: "mid", label: "₪2,500–5,000", sub: "הכי נפוץ" },
    { v: "high", label: "₪5,000+", sub: "רוצה את הטוב ביותר" },
  ] },
  { id: "video", q: "איזו תמונה אתה רוצה במשקפות?", hint: "דיגיטלי = תמונה חדה (וגם יקר). אנלוגי = זול, קל ומהיר.", options: [
    { v: "digital", label: "דיגיטלי (HD)", sub: "DJI / Walksnail" },
    { v: "analog", label: "אנלוגי", sub: "זול וקליל" },
    { v: "unsure", label: "לא יודע", sub: "תמליץ לי" },
  ] },
  { id: "path", q: "לבנות בעצמך או לקנות מוכן?", options: [
    { v: "build", label: "לבנות", sub: "להבין כל בורג" },
    { v: "bnf", label: "מוכן לטיסה (BNF)", sub: "לעוף כמה שיותר מהר" },
    { v: "unsure", label: "לא יודע", sub: "תמליץ לי" },
  ] },
  { id: "solder", q: "הלחמת פעם?", options: [
    { v: "none", label: "אף פעם" },
    { v: "some", label: "קצת" },
    { v: "good", label: "בטוח בעצמי" },
  ] },
  { id: "have", q: "מה כבר יש לך?", multi: true, hint: "אפשר לבחור כמה. מה שיש לך לא ייכנס לרשימת הקניות.", options: [
    { v: "radio", label: "שלט ELRS" },
    { v: "goggles", label: "משקפות FPV" },
    { v: "charger", label: "מטען סוללות" },
    { v: "none", label: "כלום עדיין" },
  ] },
  { id: "where", q: "איפה תטיס בעיקר?", options: [
    { v: "open", label: "שטח פתוח", sub: "שדות, חוף, הרים" },
    { v: "urban", label: "פארקים וסביבה עירונית" },
    { v: "indoor", label: "בתוך הבית" },
  ] },
  { id: "gopro", q: "תרצה לצלם עם GoPro על הרחפן?", options: [
    { v: "yes", label: "כן" }, { v: "no", label: "לא" },
  ] },
  { id: "age", q: "מה הגיל שלך?", hint: "שואלים בגלל הרגולציה: רישיון מטיס לרחפן קטן ניתן מגיל 16.", options: [
    { v: "u16", label: "מתחת ל-16" }, { v: "16plus", label: "16 ומעלה" },
  ] },
];

const CLASS_INFO = {
  whoop: { label: "ווף לבית (65 מ\"מ, 1S)", why: "קטן, רך ובטוח לטיסה בבית. הדרך הכי זולה ללמוד לטוס." },
  cinematic: { label: "סינווופ 3.5\"", why: "פרופים מוגנים בתעלות, טיסה חלקה ויציבה. מושלם לשוטים קרובים לאנשים ולמבנים." },
  freestyle: { label: "5\" פריסטייל 6S", why: "הסטנדרט של FPV: חזק, עמיד, וכל חלק חילוף זמין בכל מקום." },
  longrange: { label: "7\" לונג ריינג'", why: "פרופים גדולים וסוללת Li-ion לזמן טיסה ארוך ומרחק." },
};

export function profileFrom(a) {
  const have = a.have || [];
  let cls = a.goal === "whoop" || a.where === "indoor" ? "whoop"
    : a.goal === "cinematic" ? (a.gopro === "yes" && a.where === "open" ? "freestyle" : "cinematic")
    : a.goal === "longrange" ? "longrange" : "freestyle";
  if (cls === "longrange" && a.budget === "low") cls = "freestyle";

  const video = cls === "whoop" ? "analog"
    : a.video === "analog" ? "analog"
    : a.video === "digital" ? "digital"
    : a.budget === "low" ? "analog" : "digital";

  const beginner = a.exp === "none" || a.exp === "dji";
  const path = cls === "whoop" ? "bnf"
    : a.path === "bnf" ? "bnf"
    : a.path === "build" ? "build"
    : (a.solder === "none" || beginner) ? "bnf" : "build";

  const simHours = a.exp === "fpv" ? 0 : a.exp === "sim" ? 5 : 15;
  return { cls, classInfo: CLASS_INFO[cls], video, path, simHours, beginner, under16: a.age === "u16", have, budget: a.budget || "mid", goal: a.goal };
}

// Go4FPV preset builds (part ids from parts.json)
export function presetFor(p) {
  const tier = p.budget;
  const radio = tier === "high" ? "radio-boxer" : "radio-pocket";
  const g = {
    digital: tier === "high" ? "gog-dji-3" : "gog-dji-n3",
    analog: tier === "low" ? "gog-ev800d" : "gog-skyzone-04x",
  };
  let b;
  if (p.cls === "whoop") b = { bnf: "bnf-air65", battery: "bat-bt20-1s-300", radio: "radio-pocket", goggles: "gog-ev800d", charger: "chg-bt20-1s" };
  else if (p.path === "bnf") {
    b = p.cls === "cinematic" ? { bnf: "bnf-cinelog35-o4", battery: "bat-gnb-4s-850-xt30", goggles: g.digital }
      : p.cls === "longrange" ? { bnf: "bnf-chimera7-o3", battery: "bat-p45b-6s1p", goggles: g.digital }
      : p.video === "analog" ? { bnf: "bnf-nazgul-f5-analog", battery: "bat-cnhl-6s-1100", goggles: g.analog }
      : { bnf: "bnf-nazgul-f5-o3", battery: "bat-cnhl-6s-1100", goggles: g.digital };
    b = { ...b, radio, charger: p.cls === "longrange" ? "chg-608ac" : "chg-m7" };
    if (p.cls === "cinematic" || p.cls === "longrange") b.goggles = g.digital;
  } else {
    if (p.cls === "cinematic") b = { frame: "frame-cinelog35", motors: "mot-speedx2-2105-2650", stack: "stack-speedybee-f405-mini", vtx: "vtx-dji-o4-pro", receiver: "rx-rp1", props: "props-gemfan-d90", battery: "bat-gnb-4s-850-xt60", goggles: g.digital };
    else if (p.cls === "longrange") b = { frame: "frame-chimera7", motors: "mot-xing2-2806-1300", stack: "stack-blitz-f7-e55", vtx: "vtx-dji-o4-pro", receiver: "rx-rp3", props: "props-hq-7x4x3", battery: "bat-p45b-6s1p", goggles: g.digital };
    else if (p.video === "analog") b = { frame: "frame-source-one-v5", motors: "mot-velox-2207-1750", stack: "stack-speedybee-f405-v4", vtx: "vtx-unify-pro32", camera: "cam-ratel2", receiver: "rx-ep2", props: "props-hq-5x43x3", battery: "bat-cnhl-6s-1100", goggles: g.analog };
    else b = { frame: "frame-nazgul-evoque-f5", motors: "mot-xing2-2207-1855", stack: "stack-speedybee-f405-v4", vtx: "vtx-dji-o4-pro", receiver: "rx-rp1", props: "props-gemfan-51466", battery: "bat-cnhl-6s-1100", goggles: g.digital };
    b = { ...b, radio, charger: p.cls === "longrange" ? "chg-608ac" : "chg-m7" };
  }
  const tools = ["tool-lipo-bag", "tool-straps"];
  if (p.path === "build") tools.unshift("tool-pinecil", "tool-smoke-stopper", "tool-flux");
  return { build: b, tools };
}

export const STEPS = [
  { id: "quiz", title: "שאלון פתיחה", time: "2 דקות" },
  { id: "route", title: "המלצת מסלול", time: "" },
  { id: "radio", title: "ציוד בסיס: שלט קודם", time: "" },
  { id: "sim", title: "סימולטור", time: "10–20 שעות" },
  { id: "build", title: "קונפיגורטור", time: "" },
  { id: "assemble", title: "הרכבה", time: "ערב-שניים", buildOnly: true },
  { id: "setup", title: "הגדרה ב-Betaflight", time: "שעה" },
  { id: "safety", title: "בדיקת בטיחות לפני טיסה", time: "10 דקות" },
  { id: "fly", title: "טיסה ראשונה", time: "" },
];
