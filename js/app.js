// === יאללה דבר! — לוגיקת המשחק ===
const CFG = window.APP_CONFIG;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem("yalla_" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("yalla_" + k, JSON.stringify(v)); } catch (e) { } }
};

const saved = store.get("settings", {});
const state = {
  teams: (saved.teams || ["קבוצה 1", "קבוצה 2"]).map(n => ({ name: n, score: 0 })),
  selectedPacks: saved.packs || ["general"],
  deck: [], cur: 0, roundScore: 0, roundWords: [], timer: 60, interval: null,
  playing: false, paused: false, lastChance: false, cfg: {}
};

// ---------- sound & haptics ----------
let audioCtx = null;
function tone(f, type, d) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = 0.1;
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
  } catch (e) { }
}
const vibrate = p => { if (navigator.vibrate) navigator.vibrate(p); };
let wakeLock = null;
async function keepAwake() { try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) { } }

// ---------- ui helpers ----------
const screens = ["setup", "turn", "game", "summary", "victory"];
function show(name) {
  screens.forEach(s => $("screen-" + s).classList.toggle("hidden", s !== name));
  $("btn-home").classList.toggle("hidden", name === "setup");
  $("btn-premium-top").classList.toggle("hidden", name === "game");
}
function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }
function toast(msg, ms = 2500) { const t = $("toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.add("hidden"), ms); }
function goHome() { if (confirm("לצאת למסך הראשי? המשחק יתאפס.")) newGame(); }
function newGame() { clearInterval(state.interval); state.playing = false; renderSetup(); show("setup"); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const isUnlocked = p => p.free || License.isPremium;
const premiumWordTotal = () => PACKS.filter(p => !p.free).reduce((s, p) => s + p.words.length, 0);

// ---------- setup ----------
function saveSettings() {
  store.set("settings", { teams: state.teams.map(t => t.name), packs: state.selectedPacks });
}
function renderTeams() {
  const c = $("teams-container"); c.innerHTML = "";
  state.teams.forEach((t, i) => {
    const d = document.createElement("div"); d.className = "flex gap-2";
    d.innerHTML = `<input type="text" maxlength="24" value="${esc(t.name)}" class="glass-input w-full p-3 rounded-xl text-center font-bold">` +
      (state.teams.length > 2 ? `<button class="text-red-400 px-3 rounded-xl hover:bg-red-400/10" aria-label="מחק">🗑️</button>` : "");
    d.querySelector("input").oninput = e => { t.name = e.target.value; saveSettings(); };
    const del = d.querySelector("button"); if (del) del.onclick = () => { state.teams.splice(i, 1); renderTeams(); saveSettings(); };
    c.appendChild(d);
  });
}
function addTeam() { if (state.teams.length >= 8) return; state.teams.push({ name: `קבוצה ${state.teams.length + 1}`, score: 0 }); renderTeams(); saveSettings(); }

function renderPacks() {
  state.selectedPacks = state.selectedPacks.filter(id => { const p = PACKS.find(x => x.id === id); return p && isUnlocked(p); });
  if (!state.selectedPacks.length) state.selectedPacks = ["general"];
  const g = $("packs-grid"); g.innerHTML = "";
  PACKS.forEach(p => {
    const b = document.createElement("button");
    const sel = state.selectedPacks.includes(p.id), locked = !isUnlocked(p);
    b.className = "pack" + (sel ? " selected" : "") + (locked ? " locked" : "");
    b.innerHTML = `${locked ? '<span class="lock">🔒</span>' : ""}<div class="text-xl">${p.emoji}</div><div class="nm">${esc(p.name)}</div><div class="cnt">${p.words.length} מילים</div>`;
    b.onclick = () => {
      if (locked) { openPremium(); return; }
      if (sel) { if (state.selectedPacks.length > 1) state.selectedPacks = state.selectedPacks.filter(x => x !== p.id); }
      else state.selectedPacks.push(p.id);
      saveSettings(); renderPacks();
    };
    g.appendChild(b);
  });
  const n = state.selectedPacks.reduce((s, id) => s + PACKS.find(p => p.id === id).words.length, 0);
  $("word-count").textContent = `${n} מילים נבחרו`;
}
function renderPremiumBadge() {
  const b = $("btn-premium-top");
  b.textContent = License.isPremium ? "👑 פרימיום" : "👑 לפתוח הכל";
  b.classList.toggle("owned", License.isPremium);
}
function renderSetup() { renderTeams(); renderPacks(); renderPremiumBadge(); }

// ---------- game flow ----------
$("btn-start").onclick = () => {
  tone(500, "sine", 0.05); keepAwake();
  state.teams.forEach((t, i) => { t.name = (t.name || "").trim() || `קבוצה ${i + 1}`; t.score = 0; });
  state.cfg = {
    time: Math.min(300, Math.max(10, parseInt($("round-time").value) || 60)),
    win: Math.max(1, parseInt($("winning-score").value) || 30),
    penalty: $("penalty-mode").checked, challenges: $("challenge-mode").checked
  };
  let words = state.selectedPacks.flatMap(id => PACKS.find(p => p.id === id).words);
  const custom = $("custom-words").value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  // מילים אישיות מקבלות משקל כפול כדי שיופיעו יותר
  words = [...new Set(words.concat(custom))].concat(custom);
  state.pool = words; state.deck = shuffle([...words]);
  state.cur = 0; saveSettings(); prepareTurn();
};

function prepareTurn() {
  const t = state.teams[state.cur];
  $("turn-team").textContent = t.name; $("turn-score").textContent = t.score;
  show("turn");
}

$("btn-ready").onclick = () => {
  Object.assign(state, { roundScore: 0, roundWords: [], timer: state.cfg.time, playing: true, paused: false, lastChance: false });
  $("game-team").textContent = state.teams[state.cur].name;
  $("game-round-score").textContent = "0";
  $("word-card").classList.remove("last");
  $("card-label").textContent = "המילה להסביר";
  $("paused-overlay").classList.add("hidden"); $("btn-pause").textContent = "⏸️";
  updateTimer(); nextWord(); show("game");
  clearInterval(state.interval);
  state.interval = setInterval(() => {
    if (state.paused) return;
    state.timer--; updateTimer();
    if (state.timer <= 0) { clearInterval(state.interval); lastChance(); }
  }, 1000);
};

$("btn-pause").onclick = () => {
  if (!state.playing || state.lastChance) return;
  state.paused = !state.paused;
  $("btn-pause").textContent = state.paused ? "▶️" : "⏸️";
  $("paused-overlay").classList.toggle("hidden", !state.paused);
};

function updateTimer() {
  const e = $("timer"); e.textContent = Math.max(0, state.timer);
  e.className = "timer" + (state.timer <= 0 ? " zero" : state.timer <= 10 ? " low" : "");
  $("timer-bar").style.width = (Math.max(0, state.timer) / state.cfg.time * 100) + "%";
  if (state.timer <= 10 && state.timer > 0) { tone(800, "square", 0.05); vibrate(40); }
}
function lastChance() {
  state.lastChance = true;
  $("word-card").classList.add("last");
  $("card-label").textContent = "⏰ מילה אחרונה!";
  tone(300, "sawtooth", 0.8); vibrate([200, 100, 200]);
}

function drawWord() {
  if (!state.deck.length) state.deck = shuffle([...state.pool]);
  return state.deck.pop();
}
function nextWord() {
  const c = $("word-card");
  c.classList.remove("card-pop"); void c.offsetWidth; c.classList.add("card-pop");
  state.word = drawWord();
  const w = $("current-word"); w.textContent = state.word;
  w.style.fontSize = state.word.length > 14 ? "2.2rem" : state.word.length > 9 ? "2.8rem" : "";
  const challenge = state.cfg.challenges && Math.random() < 0.2;
  $("challenge-box").classList.toggle("hidden", !challenge);
  c.classList.toggle("challenge", challenge);
  if (challenge) { $("challenge-text").textContent = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]; tone(1000, "triangle", 0.2); }
}

function act(correct) {
  if (!state.playing || state.paused) return;
  state.roundWords.push({ w: state.word, ok: correct });
  if (correct) { tone(600, "sine", 0.1); setTimeout(() => tone(800, "sine", 0.15), 90); vibrate(50); state.roundScore++; }
  else { tone(150, "sawtooth", 0.3); vibrate([50, 50]); if (state.cfg.penalty) state.roundScore--; }
  $("game-round-score").textContent = state.roundScore;
  if (state.lastChance) endTurn(); else nextWord();
}
$("btn-correct").onclick = () => act(true);
$("btn-skip").onclick = () => act(false);

function sortedTeams() { return [...state.teams].sort((a, b) => b.score - a.score); }

function endTurn() {
  state.playing = false; clearInterval(state.interval);
  const team = state.teams[state.cur];
  team.score += state.roundScore;
  $("round-points").textContent = (state.roundScore >= 0 ? "+" : "") + state.roundScore;
  $("round-points").className = "text-6xl font-black " + (state.roundScore > 0 ? "text-green-400" : "text-gray-400");
  const sorted = sortedTeams();
  $("scoreboard").innerHTML = sorted.map((t, i) =>
    `<div class="flex justify-between items-center p-3 rounded-xl ${t === team ? "bg-gray-700 border border-yellow-400" : "bg-gray-800/50"}">
      <div class="flex items-center gap-3"><span class="font-bold text-gray-500">#${i + 1}</span><span class="font-bold">${esc(t.name)}</span></div>
      <span class="text-xl font-black">${t.score}</span></div>`).join("");
  $("round-words").innerHTML = state.roundWords.map(r =>
    `<span class="chip ${r.ok ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300 line-through"}">${esc(r.w)}</span>`).join("") || '<span class="text-gray-500">—</span>';
  $("target-text").textContent = `יעד: ${state.cfg.win}`;
  $("progress-fill").style.width = Math.min(100, Math.max(0, sorted[0].score) / state.cfg.win * 100) + "%";
  $("leader-text").textContent = `${sorted[0].name} בראש!`;
  const someoneWon = state.teams.some(t => t.score >= state.cfg.win);
  $("btn-next").textContent = someoneWon ? "לטקס הניצחון 🏆" : "הבא בתור ←";
  show("summary");
}

$("btn-next").onclick = () => {
  if (state.teams.some(t => t.score >= state.cfg.win)) finishGame();
  else { state.cur = (state.cur + 1) % state.teams.length; prepareTurn(); }
};
$("btn-finish").onclick = () => { if (confirm("לסיים את המשחק עכשיו?")) finishGame(); };

function finishGame() {
  const s = sortedTeams();
  $("winner-name").textContent = s.length > 1 && s[0].score === s[1].score ? "תיקו! 🤝" : s[0].name;
  $("victory-upsell").classList.toggle("hidden", License.isPremium);
  show("victory");
  const played = store.get("games_played", 0) + 1; store.set("games_played", played);
  const end = Date.now() + 3000;
  (function f() {
    if (typeof confetti !== "function") return;
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(f);
  })();
}

const siteUrl = () => location.origin + location.pathname.replace(/index\.html$/, "");
$("btn-share").onclick = () => {
  const w = $("winner-name").textContent;
  const text = `🏆 ${w} ניצחו ב"יאללה דבר!" – משחק המסיבות הישראלי 🔥\nבואו נראה אתכם: ${siteUrl()}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
};

// ---------- premium ----------
function waLink(text) {
  const n = (CFG.SELLER_WHATSAPP || "").replace(/\D/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
function openPremium() {
  $("premium-sell").classList.toggle("hidden", License.isPremium);
  $("premium-owned").classList.toggle("hidden", !License.isPremium);
  $("premium-packs-list").innerHTML = PACKS.filter(p => !p.free).map(p =>
    `<div class="bg-black/25 rounded-xl p-2">${p.emoji} ${esc(p.name)}</div>`).join("");
  $("premium-word-count").textContent = premiumWordTotal();
  document.querySelectorAll(".price").forEach(e => e.textContent = CFG.PRICE);
  $("custom-price").textContent = CFG.CUSTOM_PACK_PRICE;
  $("pay-hint").textContent = CFG.PAYMENT_URL
    ? "אחרי התשלום שלחו לנו צילום מסך בוואטסאפ ותקבלו קישור הפעלה"
    : "נפתח וואטסאפ – נשלח לכם פרטי תשלום וקישור הפעלה";
  $("code-msg").classList.add("hidden");
  openModal("modal-premium");
}
$("btn-pay").onclick = () => {
  if (CFG.PAYMENT_URL) {
    window.open(CFG.PAYMENT_URL, "_blank");
    setTimeout(() => toast("אחרי התשלום – שלחו צילום מסך בוואטסאפ 📲", 4000), 800);
  } else {
    window.open(waLink(`היי! אני רוצה לקנות את יאללה דבר! פרימיום ב-₪${CFG.PRICE} 👑`), "_blank");
  }
};
$("btn-custom").onclick = () => window.open(waLink("היי! אני רוצה חבילת מילים מותאמת אישית לאירוע 🎉\nסוג האירוע: \nתאריך: "), "_blank");
$("btn-activate").onclick = async () => {
  const m = $("code-msg"); m.classList.remove("hidden");
  m.className = "text-sm mt-2 text-gray-400"; m.textContent = "בודק...";
  if (await License.activate($("code-input").value)) {
    m.className = "text-sm mt-2 text-green-400"; m.textContent = "✅ הופעל! כל החבילות פתוחות";
    onUnlocked();
  } else { m.className = "text-sm mt-2 text-red-400"; m.textContent = "❌ הקוד לא תקין. בדקו שהעתקתם את כולו"; }
};
function onUnlocked() {
  renderSetup();
  $("premium-sell").classList.add("hidden"); $("premium-owned").classList.remove("hidden");
  if (typeof confetti === "function") confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
}

// ---------- boot ----------
(async () => {
  renderSetup(); show("setup");
  await License.init();
  renderSetup();
  if (License.justUnlocked) { onUnlocked(); openModal("modal-premium"); }
  if (!store.get("seen_rules", false)) { store.set("seen_rules", true); openModal("modal-rules"); }
})();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { });
