// Vercel serverless function: the Go4FPV AI tutor.
// POST /api/tutor  { messages: [{role, content}], context: { build, issues, lesson } }
// Requires ANTHROPIC_API_KEY in the Vercel project's environment variables.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Model per the product spec: Haiku 5.5 for chat (fast and cheap).
const MODEL = "claude-haiku-5-5";
const DAILY_LIMIT = 20;            // questions per visitor per day (spec: 20/day per user)
const MAX_TURNS = 12;              // history sent to the model
const MAX_CHARS = 1500;            // per user message

const SYSTEM = `אתה המורה של Go4FPV: מדריך FPV סבלני שמסביר בעברית פשוטה למתחילים בישראל.
כללים:
- ענה בעברית, קצר וברור (עד 6–8 משפטים), עם צעדים ממוספרים כשמבקשים "איך".
- אתה מכיר את הבילד של המשתמש (מופיע בהקשר). התייחס לחלקים הספציפיים שלו בשמם.
- בשאלות תאימות: מנוע התאימות של האפליקציה הוא הקובע. אם בהקשר יש שגיאת תאימות, הסבר אותה ואל תסתור אותה. אם אתה לא בטוח במפרט של חלק, תגיד שצריך לבדוק בדף היצרן.
- בטיחות: בכל שאלה על סוללות LiPo, הלחמה, מתח גבוה או טיסה ליד אנשים, הוסף אזהרת בטיחות קצרה. לעולם אל תאשר לדלג על צ'קליסט הבטיחות, על Smoke Stopper או על הסרת פרופלורים בזמן עבודה על השולחן.
- רגולציה בישראל משתנה: אל תצטט חוק כעובדה. הפנה לאתר רת"א לבדיקת הכללים העדכניים.
- אם שואלים משהו שלא קשור ל-FPV ורחפנים, החזר בעדינות לנושא.`;

const hits = new Map(); // best-effort, per warm instance; replace with Firestore/KV when auth lands

function rateLimited(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const key = ip + "|" + day;
  const n = (hits.get(key) || 0) + 1;
  hits.set(key, n);
  if (hits.size > 5000) hits.clear();
  return n > DAILY_LIMIT;
}

function contextText(ctx = {}) {
  const parts = [];
  if (ctx.build && Object.keys(ctx.build).length) {
    parts.push("הבילד של המשתמש:\n" + Object.entries(ctx.build).map(([cat, name]) => `- ${cat}: ${name}`).join("\n"));
  }
  if (Array.isArray(ctx.issues) && ctx.issues.length) {
    parts.push("תוצאות מנוע התאימות:\n" + ctx.issues.slice(0, 10).map(i => `- [${i.level}] ${i.title}: ${i.msg}`).join("\n"));
  }
  if (ctx.page) parts.push("המסך שהמשתמש נמצא בו: " + String(ctx.page).slice(0, 60));
  return parts.join("\n\n").slice(0, 4000);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return res.status(503).json({ error: "config", message: "המורה עוד לא הוגדר: צריך להוסיף ANTHROPIC_API_KEY בהגדרות הפרויקט ב-Vercel." });
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const history = Array.isArray(body.messages) ? body.messages : [];
  const clean = history
    .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (clean.length && clean[0].role !== "user") clean.shift();
  if (!clean.length || clean[clean.length - 1].role !== "user") return res.status(400).json({ error: "no_question" });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  if (rateLimited(ip)) return res.status(429).json({ error: "daily_limit", message: `הגעת למכסה של ${DAILY_LIMIT} שאלות להיום. נתראה מחר!` });

  // Build context goes in front of the first user turn so the stable system prompt stays cacheable.
  const ctx = contextText(body.context);
  if (ctx) clean[0] = { role: "user", content: `[הקשר מהאפליקציה]\n${ctx}\n\n[השאלה]\n${clean[0].content}` };

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      cache_control: { type: "ephemeral" },
      system: SYSTEM,
      messages: clean,
    });
    if (response.stop_reason === "refusal") {
      return res.status(200).json({ reply: "על זה אני לא יכול לעזור. אפשר לשאול אותי כל דבר על בניית רחפן, הגדרות או טיסה." });
    }
    const reply = response.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return res.status(200).json({ reply: reply || "לא הצלחתי לנסח תשובה. נסה לשאול שוב במילים אחרות." });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(503).json({ error: "busy", message: "המורה עמוס כרגע. נסה שוב בעוד דקה." });
    if (error instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: "config", message: "המורה עוד לא הוגדר (חסר מפתח API בשרת)." });
    if (error instanceof Anthropic.APIError) return res.status(502).json({ error: "upstream", message: "תקלה זמנית אצל המורה. נסה שוב." });
    return res.status(500).json({ error: "server", message: "תקלה זמנית. נסה שוב." });
  }
}
