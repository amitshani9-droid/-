// === 1. Data & Config (מאגר המילים המשודרג) ===
const wordPacks = {
    general: [
        "פלאפל", "מטקות", "מילואים", "חתונה", "פקק תנועה", "בנימין נתניהו", "גל גדות", "נועה קירל",
        "הכותל המערבי", "חרמון", "תל אביב", "ים המלח", "ווטסאפ", "אינסטגרם", "טיקטוק", "Waze",
        "שבת", "על האש", "חופשה", "משכנתא", "כדורגל", "חדר כושר", "פיצה", "מזגן", "יתוש"
    ],
    army: [
        "מפקד", "טירונות", "רגילה", "גימלים", "שמירה", "מטווח", "חדר אוכל", "מדים", "דיסקית",
        "שיפצור", "פזצטא", "מסע כומתה", "סיירת מטכ\"ל", "כיפת ברזל", "הייטק", "אקזיט", "סטארטאפ",
        "משקיע", "מניות", "באג", "קוד", "מתכנת", "שרת", "ענן"
    ],
    kids: [
        "כלב", "חתול", "בית ספר", "גלידה", "שוקולד", "אמא", "אבא", "סבתא", "יום הולדת", "בלון",
        "מתנה", "כדור", "בובה", "גן שעשועים", "נדנדה", "אופניים", "בריכה", "ים", "שמש", "ירח"
    ],
    hard: [
        "אוקסימורון", "סטטוס קוו", "בירוקרטיה", "אינפלציה", "קונפליקט", "פרדוקס", "מטאפורה",
        "פרוטוקול", "אלגוריתם", "קוגניציה", "אסימטריה", "דמוגרפיה", "היפותזה", "ציניות"
    ]
};

let gameState = {
    teams: [
        { name: "Team 1", score: 0 },
        { name: "Team 2", score: 0 }
    ],
    config: {
        timePerRound: 60,
        winningScore: 30,
        selectedPack: 'general'
    },
    currentTeamIndex: 0,
    currentRoundScore: 0,
    timer: 60,
    timerInterval: null,
    isPlaying: false
};

// === 2. Sound Engine (מנוע סאונד ללא קבצים) ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function sfxCorrect() { playTone(600, 'sine', 0.1); setTimeout(() => playTone(800, 'sine', 0.2), 100); }
function sfxSkip() { playTone(150, 'sawtooth', 0.3); }
function sfxTimeUp() { playTone(800, 'square', 0.1); setTimeout(() => playTone(400, 'square', 0.4), 150); }

// === 3. DOM Elements ===
const screens = {
    setup: document.getElementById('screen-setup'),
    turnIntro: document.getElementById('screen-turn-intro'),
    game: document.getElementById('screen-game'),
    summary: document.getElementById('screen-summary'),
    victory: document.getElementById('screen-victory')
};

// === 4. Helper Functions ===
function showScreen(screenName) {
    Object.values(screens).forEach(el => el.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

function getRandomWord() {
    const pack = wordPacks[gameState.config.selectedPack];
    return pack[Math.floor(Math.random() * pack.length)];
}

function updateScoreDisplay() {
    document.getElementById('summ-team1-name').innerText = gameState.teams[0].name;
    document.getElementById('summ-team2-name').innerText = gameState.teams[1].name;
    document.getElementById('summ-score1').innerText = gameState.teams[0].score;
    document.getElementById('summ-score2').innerText = gameState.teams[1].score;
}

// === 5. Game Logic ===

// Setup -> Start
document.getElementById('btn-start-game').addEventListener('click', () => {
    // אתחול הקשר אודיו (חובה בדפדפנים מודרניים בלחיצת כפתור)
    if (audioCtx.state === 'suspended') audioCtx.resume();

    gameState.teams[0].name = document.getElementById('team1-name').value || "קבוצה 1";
    gameState.teams[1].name = document.getElementById('team2-name').value || "קבוצה 2";
    gameState.config.timePerRound = parseInt(document.getElementById('round-time').value) || 60;
    gameState.config.winningScore = parseInt(document.getElementById('winning-score').value) || 30;
    gameState.config.selectedPack = document.getElementById('category-select').value;

    gameState.currentTeamIndex = 0;
    prepareTurn();
});

function prepareTurn() {
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    document.getElementById('current-team-display').innerText = currentTeam.name;
    showScreen('turnIntro');
}

document.getElementById('btn-ready').addEventListener('click', () => {
    gameState.currentRoundScore = 0;
    gameState.timer = gameState.config.timePerRound;
    gameState.isPlaying = true;

    document.getElementById('game-team-name').innerText = gameState.teams[gameState.currentTeamIndex].name;
    updateTimerDisplay();
    nextWord();
    showScreen('game');

    gameState.timerInterval = setInterval(() => {
        gameState.timer--;
        updateTimerDisplay();
        if (gameState.timer <= 0) endTurn();
    }, 1000);
});

function updateTimerDisplay() {
    const el = document.getElementById('timer-display');
    el.innerText = gameState.timer;
    if (gameState.timer <= 10) {
        el.classList.add('text-red-500', 'scale-110');
        el.classList.remove('text-white');
    } else {
        el.classList.add('text-white');
        el.classList.remove('text-red-500', 'scale-110');
    }
}

function nextWord() {
    const wordCard = document.getElementById('word-card');
    wordCard.classList.remove('card-pop');
    void wordCard.offsetWidth;
    wordCard.classList.add('card-pop');
    document.getElementById('current-word').innerText = getRandomWord();
}

// Controls
document.getElementById('btn-correct').addEventListener('click', () => {
    if (!gameState.isPlaying) return;
    sfxCorrect(); // הפעלת סאונד
    gameState.currentRoundScore++;
    nextWord();
});

document.getElementById('btn-skip').addEventListener('click', () => {
    if (!gameState.isPlaying) return;
    sfxSkip(); // הפעלת סאונד
    // gameState.currentRoundScore--; // אפשר להוריד את ההערה אם רוצים עונש
    nextWord();
});

function endTurn() {
    clearInterval(gameState.timerInterval);
    gameState.isPlaying = false;
    sfxTimeUp(); // סאונד סיום

    const teamIdx = gameState.currentTeamIndex;
    gameState.teams[teamIdx].score += gameState.currentRoundScore;

    document.getElementById('round-points').innerText = (gameState.currentRoundScore > 0 ? "+" : "") + gameState.currentRoundScore;
    updateScoreDisplay();
    showScreen('summary');
}

document.getElementById('btn-next-round').addEventListener('click', () => {
    const teamIdx = gameState.currentTeamIndex;
    if (gameState.teams[teamIdx].score >= gameState.config.winningScore) {
        showVictory(gameState.teams[teamIdx].name);
        return;
    }
    gameState.currentTeamIndex = gameState.currentTeamIndex === 0 ? 1 : 0;
    prepareTurn();
});

// פונקציית ניצחון עם קונפטי
function showVictory(winnerName) {
    document.getElementById('winner-name').innerText = winnerName;
    showScreen('victory');

    // הפעלת קונפטי
    const duration = 3000;
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#fbbf24', '#ef4444', '#3b82f6'] // צבעים מותאמים
        });
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#fbbf24', '#ef4444', '#3b82f6']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

// === Rules Modal Logic ===
const rulesModal = document.getElementById('modal-rules');
const btnOpenRules = document.getElementById('btn-open-rules');
const btnCloseRules = document.getElementById('btn-close-rules');
const btnCloseRulesBottom = document.getElementById('btn-close-rules-bottom');

function toggleRules() {
    rulesModal.classList.toggle('hidden');
}

// Open
btnOpenRules.addEventListener('click', toggleRules);

// Close
btnCloseRules.addEventListener('click', toggleRules);
btnCloseRulesBottom.addEventListener('click', toggleRules);

// Close when clicking outside the box
rulesModal.addEventListener('click', (e) => {
    if (e.target === rulesModal) {
        toggleRules();
    }
});
