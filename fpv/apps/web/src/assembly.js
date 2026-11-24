// Build-specific assembly steps. Text adapts to the parts that were actually chosen.
const UART_RX = "UART2", UART_VTX = "UART1";

export function assemblySteps(b) {
  if (b.bnf) return bnfSteps(b);
  const { frame, motors, stack, vtx, camera, receiver, props, battery } = b;
  const digital = vtx && vtx.includesCamera;
  const steps = [];
  steps.push({
    id: "prep", title: "הכנת שולחן העבודה",
    body: "משטח עמיד לחום, תאורה טובה, מלחם על 350–380°C, בדיל 63/37 ופלקס. מפרידים את כל החלקים לפי שקיות ובודקים שכולם הגיעו.",
    tools: ["מלחם", "בדיל + פלקס", "מברגי הקס 1.5/2.0/2.5"],
  });
  if (frame) steps.push({
    id: "frame", title: `הרכבת הפריים: ${frame.name}`,
    body: "מרכיבים לפי מדריך היצרן, בלי להדק עד הסוף. מוודאים שהזרועות ישרות ושאין סדקים בקרבון. ברגים שנכנסים לאלומיניום מקבלים טיפת Loctite כחול; לא שמים אותו על ברגים שנכנסים לפלסטיק.",
    tools: ["Loctite כחול"],
  });
  if (motors && frame) steps.push({
    id: "motors", title: `מנועים על הזרועות (${motors.mount}×${motors.mount})`,
    body: `מבריגים את ${motors.name.replace(" ×4", "")} בתבנית ${motors.mount}×${motors.mount}. בורג ארוך מדי יגע בליפופי הסטטור ויקצר את המנוע: בודקים שנשאר מרווח של כ-1 מ"מ מתחת לבורג. החוטים פונים לכיוון מרכז הפריים.`,
    warn: "בורג שנוגע בליפופים = מנוע שרוף. בדקו לפני שמהדקים.",
  });
  if (stack) steps.push({
    id: "esc", title: `ESC על הפריים (${stack.mount} מ"מ)`,
    body: `ה-ESC של ${stack.name} יושב למטה, על גומיות האנטי-ויברציה, עם החץ לכיוון קדמת הרחפן. מקצרים את חוטי המנועים לאורך הנכון, מצפים את הפדים ואת קצות החוטים בבדיל (tinning), ומלחימים כל מנוע לשלושת הפדים שלו. הסדר בין שלושת החוטים לא משנה: את כיוון הסיבוב מתקנים בתוכנה.`,
  });
  if (stack && battery) steps.push({
    id: "power", title: `מחבר סוללה ${stack.connector} + קבל`,
    body: `מלחימים את כבל ה-${stack.connector} לפדי ה-BAT של ה-ESC (אדום ל-+, שחור ל--). חובה קבל Low-ESR (לרוב 1000µF / 35V ל-6S) על אותם פדים: הוא בולע קוצי מתח שמשבשים את הווידאו ואת בקר הטיסה.`,
    warn: "הפולריות חייבת להיות נכונה. חיבור הפוך שורף את ה-ESC מיידית.",
  });
  if (stack) steps.push({
    id: "fc", title: "בקר הטיסה מעל ה-ESC",
    body: "מחברים את כבל ההרתמה (harness) בין ה-ESC ל-FC, ומרכיבים את ה-FC מעל עם החץ קדימה. אם החץ לא קדימה, אפשר לתקן ב-Betaflight (board alignment), אבל עדיף להרכיב נכון.",
  });
  if (receiver && stack) steps.push({
    id: "rx", title: `מקלט ${receiver.name} ל-${UART_RX}`,
    body: `4 חוטים: 5V, GND, ו-TX/RX בהצלבה: TX של המקלט ל-RX2 של הבקר, ו-RX של המקלט ל-TX2. מרחיקים את האנטנה מהקרבון ומהפרופים, ומעמידים אותה ב-90° לאנטנת הווידאו.`,
    warn: "TX ל-TX = אין קליטה. זו הטעות הכי נפוצה.",
  });
  if (vtx && stack) steps.push(digital ? {
    id: "vtx", title: `${vtx.name.split(" (")[0]} ל-${UART_VTX}`,
    body: `מחברים לפי מדריך היצרן: VBAT (מתח סוללה ישיר, ${vtx.vin.join("–")}V), GND, ו-TX/RX ל-${UART_VTX} בהצלבה, בשביל OSD ושליטה בהגדרות. המצלמה מגיעה עם היחידה ונכנסת לפריים בעזרת מתאם ${vtx.camWidth} מ"מ.`,
    warn: "לא מדליקים משדר דיגיטלי בלי אנטנה מחוברת.",
  } : {
    id: "vtx", title: `${vtx.name.split(" (")[0]} + ${camera ? camera.name.split(" (")[0] : "מצלמה"}`,
    body: `המצלמה מתחברת ל-CAM של ה-FC (5V, GND, וידאו), וה-VTX ל-VTX של ה-FC (מתח, GND, וידאו). חוט SmartAudio מה-VTX ל-TX של ${UART_VTX} מאפשר להחליף ערוץ ועוצמה מהשלט.`,
    warn: "לא מדליקים VTX בלי אנטנה. הוא נשרף תוך שניות.",
  });
  steps.push({
    id: "smoke", title: "בדיקת עשן (Smoke Stopper)",
    body: "בלי פרופלורים! מחברים את הסוללה דרך ה-Smoke Stopper. נורה דולקת חזק ולא כבה = יש קצר: מנתקים מיד ובודקים את ההלחמות. נורה שמהבהבת קצת וכבה = תקין.",
    warn: "החיבור הראשון אחרי הלחמה תמיד דרך Smoke Stopper.",
  });
  steps.push({
    id: "bf", title: "הגדרה ב-Betaflight", link: "#betaflight",
    body: "מחברים USB (עדיין בלי פרופים) ומגדירים פורטים, מקלט, מנועים ומתגים. יש לנו קובץ CLI מוכן לבילד שלך.",
  });
  if (props) steps.push({
    id: "props", title: `פרופלורים (${props.size}") אחרונים`,
    body: "רק אחרי שכל ההגדרות נבדקו. ב-Props Out (ברירת המחדל ב-Betaflight 4.x): הפרופ הקדמי-ימני מסתובב נגד כיוון השעון. בודקים את כיוון כל מנוע בטאב Motors לפני שמרכיבים. מהדקים את האומים חזק.",
    warn: "פרופ בכיוון לא נכון = הרחפן מתהפך ברגע ההמראה.",
  });
  return steps;
}

function bnfSteps(b) {
  return [
    { id: "unbox", title: "פתיחה ובדיקה", body: "בודקים שאין נזק במשלוח: זרועות, פרופים, אנטנות. מוודאים שהאנטנות מחוברות לפני כל הדלקה." },
    { id: "bind", title: "בינד לשלט", body: `הרחפן מגיע עם מקלט ${b.bnf.protocol === "elrs24" ? "ELRS 2.4GHz" : "Crossfire"}. מגדירים Binding Phrase זהה בשלט ובמקלט (ב-ELRS זה הכי פשוט), או מבצעים בינד לפי מדריך היצרן.` },
    { id: "bf", title: "בדיקה ב-Betaflight", link: "#betaflight", body: "מחברים USB, בלי פרופים: בודקים שהמקלט מגיב בטאב Receiver, מגדירים מתגים ל-Arm, למצבי טיסה, לביפר ול-Turtle, ובודקים Failsafe." },
    { id: "props", title: "פרופים ובדיקה אחרונה", body: "מוודאים שהפרופים בכיוון הנכון ומהודקים, ועוברים על צ'קליסט הבטיחות." },
  ];
}
