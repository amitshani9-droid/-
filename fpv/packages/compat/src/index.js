// FPV compatibility engine — deterministic rules, no AI.
// A build is { frame, motors, stack, vtx, camera, receiver, props, battery, radio, goggles, bnf } (part objects or null).
// check(build) → [{ rule, level: 'error'|'warn'|'ok', cats:[...], title, msg, fix? }]

export const CATEGORIES = {
  frame: { label: "פריים", icon: "frame", airframe: true },
  motors: { label: "מנועים", icon: "motor", airframe: true },
  stack: { label: "סטאק (בקר + ESC)", icon: "stack", airframe: true },
  vtx: { label: "משדר וידאו (VTX)", icon: "vtx", airframe: true },
  camera: { label: "מצלמה", icon: "camera", airframe: true },
  receiver: { label: "מקלט", icon: "rx", airframe: true },
  props: { label: "פרופלורים", icon: "props", airframe: true },
  battery: { label: "סוללה", icon: "battery" },
  radio: { label: "שלט", icon: "radio" },
  goggles: { label: "משקפות", icon: "goggles" },
  charger: { label: "מטען", icon: "charger" },
  tools: { label: "כלים וציוד נלווה", icon: "tools" },
  bnf: { label: "רחפן מוכן (BNF)", icon: "bnf" },
};

export const SYSTEM_LABEL = { dji_o4: "DJI O4", dji_o3: "DJI O3", walksnail: "Walksnail", analog: "אנלוגי" };
export const PROTOCOL_LABEL = { elrs24: "ELRS 2.4GHz", crsf900: "Crossfire 900MHz" };

const CELL_MAX_V = 4.2, CELL_MIN_V = 3.5;
const fmtMount = m => `${m}×${m}`;
const issue = (rule, level, cats, title, msg, fix) => ({ rule, level, cats, title, msg, ...(fix ? { fix } : {}) });

/** Video-system of the build: from BNF, digital VTX, or analog chain. */
export function videoSystem(b) {
  if (b.bnf) return b.bnf.system;
  return b.vtx ? b.vtx.system : null;
}
export function controlProtocol(b) {
  if (b.bnf) return b.bnf.protocol;
  return b.receiver ? b.receiver.protocol : null;
}
export function batteryCellsAccepted(b) {
  if (b.bnf) return [b.bnf.cells, b.bnf.cells];
  return b.stack ? b.stack.cells : null;
}

export function check(b) {
  const out = [];
  const bnf = !!b.bnf;

  if (!bnf) {
    const { frame, motors, stack, vtx, camera, receiver, props, battery } = b;

    // 1. battery cells vs ESC range
    if (battery && stack) {
      const [lo, hi] = stack.cells;
      if (battery.cells > hi) out.push(issue(1, "error", ["battery", "stack"], "יותר מדי תאים לבקר",
        `הסוללה ${battery.cells}S אבל ה-ESC בנוי עד ${hi}S. מתח גבוה מדי ישרוף אותו כבר בחיבור הראשון.`, `בחרו סוללה עד ${hi}S או סטאק שתומך ב-${battery.cells}S.`));
      else if (battery.cells < lo) out.push(issue(1, "error", ["battery", "stack"], "מעט מדי תאים לבקר",
        `הסוללה ${battery.cells}S אבל ה-ESC צריך לפחות ${lo}S. הבקר לא יעבוד כמו שצריך.`));
      else out.push(issue(1, "ok", ["battery", "stack"], "תאים מול ESC", `${battery.cells}S בטווח ${lo}–${hi}S`));
    }

    // 2. stack mount vs frame
    if (stack && frame) {
      if (!frame.stackMount.includes(stack.mount)) out.push(issue(2, "error", ["stack", "frame"], "הסטאק לא נכנס לפריים",
        `לסטאק יש חורי הרכבה ${fmtMount(stack.mount)} מ"מ, והפריים מקבל רק ${frame.stackMount.map(fmtMount).join(" או ")}.`, "בחרו סטאק בגודל שהפריים תומך בו."));
      else out.push(issue(2, "ok", ["stack", "frame"], "סטאק מול פריים", `${fmtMount(stack.mount)} מ"מ נתמך`));
    }

    // 3. prop size vs motor (stator class)
    if (props && motors) {
      const [lo, hi] = motors.propRange;
      if (props.size < lo - 0.01 || props.size > hi + 0.01) out.push(issue(3, props.size > hi ? "error" : "warn", ["props", "motors"], "פרופלור לא מתאים למנוע",
        `מנועי ${motors.stator} בנויים לפרופים של ${lo}–${hi} אינץ', ובחרתם ${props.size} אינץ'. ${props.size > hi ? "פרופ גדול מדי יחמם את המנועים ואת ה-ESC." : "פרופ קטן מדי יבזבז כוח ויקצר את זמן הטיסה."}`));
      else out.push(issue(3, "ok", ["props", "motors"], "פרופ מול מנוע", `${props.size}" מתאים ל-${motors.stator}`));
    }

    // 4. prop size vs frame
    if (props && frame) {
      if (props.size > frame.maxProp + 0.01) out.push(issue(4, "error", ["props", "frame"], "הפרופים גדולים מהפריים",
        `הפריים מקבל פרופים עד ${frame.maxProp} אינץ', ובחרתם ${props.size} אינץ'. הפרופים ייגעו בזרועות או בפריים.`));
      else if (props.size < frame.maxProp - 1) out.push(issue(4, "warn", ["props", "frame"], "פרופים קטנים לפריים",
        `הפריים בנוי לפרופים של ${frame.maxProp} אינץ'. פרופים של ${props.size} יעבדו, אבל תקבלו רחפן כבד וחלש.`));
      else out.push(issue(4, "ok", ["props", "frame"], "פרופ מול פריים", `${props.size}" עד ${frame.maxProp}"`));
    }

    // 5. motor holes vs frame
    if (motors && frame) {
      if (!frame.motorMount.includes(motors.mount)) out.push(issue(5, "error", ["motors", "frame"], "חורי המנוע לא מתאימים לפריים",
        `המנועים מוברגים בתבנית ${fmtMount(motors.mount)} מ"מ, והזרועות של הפריים קדוחות ל-${frame.motorMount.map(fmtMount).join(" או ")}.`));
      else out.push(issue(5, "ok", ["motors", "frame"], "חורי מנוע", `${fmtMount(motors.mount)} מ"מ`));
    }

    // 6. ESC current vs motors
    if (stack && motors) {
      if (stack.escA < motors.maxA * 0.85) out.push(issue(6, "error", ["stack", "motors"], "ה-ESC חלש מדי למנועים",
        `כל מנוע מושך עד כ-${motors.maxA}A, וה-ESC מחזיק ${stack.escA}A לערוץ. בפול-גז הוא יתחמם ועלול להישרף.`, "בחרו ESC של לפחות " + Math.ceil(motors.maxA) + "A."));
      else if (stack.escA < motors.maxA) out.push(issue(6, "warn", ["stack", "motors"], "ESC על הגבול",
        `המנועים מושכים עד כ-${motors.maxA}A וה-ESC מדורג ל-${stack.escA}A. זה יעבוד, אבל בלי מרווח ביטחון.`));
      else out.push(issue(6, "ok", ["stack", "motors"], "ESC מול מנוע", `${stack.escA}A ≥ ${motors.maxA}A`));
    }

    // 7. KV vs cells
    if (motors && battery) {
      const [lo, hi] = motors.cells;
      if (battery.cells > hi) out.push(issue(7, "error", ["motors", "battery"], "KV גבוה מדי למתח הזה",
        `מנועים של ${motors.kv}KV מיועדים ל-${hi}S. על ${battery.cells}S הם יסתובבו מהר מדי, יתחממו וישרפו.`, `לסוללה של ${battery.cells}S בחרו מנועים עם KV נמוך יותר.`));
      else if (battery.cells < lo) out.push(issue(7, "warn", ["motors", "battery"], "KV נמוך למתח הזה",
        `מנועים של ${motors.kv}KV מיועדים ל-${lo}S. על ${battery.cells}S הרחפן יהיה איטי וכבד.`));
      else out.push(issue(7, "ok", ["motors", "battery"], "KV מול תאים", `${motors.kv}KV על ${battery.cells}S`));
    }

    // 8. VTX voltage
    if (vtx && battery) {
      const vmax = battery.cells * CELL_MAX_V, vmin = battery.cells * CELL_MIN_V;
      if (vmax > vtx.vin[1] + 0.05) out.push(issue(8, "error", ["vtx", "battery"], "מתח גבוה מדי למשדר הווידאו",
        `סוללה מלאה של ${battery.cells}S נותנת ${vmax.toFixed(1)}V, וה-VTX מחזיק עד ${vtx.vin[1]}V.`, "חברו אותו דרך BEC (ממיר מתח) או בחרו VTX שמחזיק את המתח."));
      else if (vmin < vtx.vin[0]) out.push(issue(8, "warn", ["vtx", "battery"], "מתח נמוך למשדר הווידאו",
        `כשהסוללה מתרוקנת היא יורדת לכ-${vmin.toFixed(1)}V, מתחת למינימום של ה-VTX (${vtx.vin[0]}V). התמונה עלולה להיעלם בסוף הטיסה.`));
      else out.push(issue(8, "ok", ["vtx", "battery"], "מתח VTX", `${vmin.toFixed(1)}–${vmax.toFixed(1)}V בטווח`));
    }

    // 9. video chain (vtx ↔ camera ↔ goggles is checked in rule 9b below for both modes)
    if (vtx) {
      if (vtx.includesCamera && camera) out.push(issue(9, "warn", ["camera", "vtx"], "מצלמה מיותרת",
        `${vtx.name.split(" (")[0]} מגיע עם מצלמה משלו, כך שהמצלמה האנלוגית לא תתחבר אליו.`, "הסירו את המצלמה ותחסכו כסף ומשקל."));
      if (!vtx.includesCamera && camera && camera.system !== vtx.system) out.push(issue(9, "error", ["camera", "vtx"], "מצלמה ומשדר ממערכות שונות",
        `המצלמה היא ${SYSTEM_LABEL[camera.system]} וה-VTX הוא ${SYSTEM_LABEL[vtx.system]}.`));
      if (!vtx.includesCamera && camera && camera.system === vtx.system) out.push(issue(9, "ok", ["camera", "vtx"], "מצלמה מול VTX", "שניהם אנלוגיים"));
    }

    // 10. camera width vs frame
    if (frame) {
      const w = vtx && vtx.includesCamera ? vtx.camWidth : camera ? camera.width : null;
      if (w != null) {
        if (!frame.camWidth.includes(w)) out.push(issue(10, "warn", ["camera", "frame"], "רוחב המצלמה לא תואם לפריים",
          `המצלמה ברוחב ${w} מ"מ והפריים בנוי ל-${frame.camWidth.join("/")} מ"מ. תצטרכו מתאם (adapter) כדי להרכיב אותה.`));
        else out.push(issue(10, "ok", ["camera", "frame"], "רוחב מצלמה", `${w} מ"מ`));
      }
    }

    // 11. UARTs
    if (stack && (receiver || vtx)) {
      const need = (receiver ? receiver.uart : 0) + (vtx && vtx.needsUart ? 1 : 0);
      if (need > stack.uarts) out.push(issue(11, "error", ["stack", "receiver", "vtx"], "אין מספיק UART בבקר",
        `המקלט וה-VTX צריכים ${need} יציאות UART, ולבקר יש רק ${stack.uarts}.`));
      else out.push(issue(11, "ok", ["stack"], "יציאות UART", `${need} מתוך ${stack.uarts} בשימוש`));
    }

    // 12. battery connector vs ESC lead
    if (battery && stack && battery.connector !== stack.connector) out.push(issue(12, "warn", ["battery", "stack"], "מחבר סוללה שונה",
      `לסוללה יש ${battery.connector} ולבקר ${stack.connector}. תצטרכו להחליף מחבר או להשתמש במתאם.`));
  } else {
    // BNF: just battery and video/control pairing
    const { bnf: d, battery } = b;
    if (battery) {
      if (battery.cells !== d.cells) out.push(issue(1, "error", ["battery", "bnf"], "סוללה לא מתאימה לרחפן",
        `הרחפן בנוי ל-${d.cells}S ובחרתם ${battery.cells}S.`));
      else out.push(issue(1, "ok", ["battery", "bnf"], "תאים", `${battery.cells}S`));
      if (battery.connector !== d.connector) out.push(issue(12, "warn", ["battery", "bnf"], "מחבר סוללה שונה",
        `לרחפן יש ${d.connector} ולסוללה ${battery.connector}.`));
    }
  }

  // 9b. goggles ↔ video system (both modes)
  const sys = videoSystem(b);
  if (sys && b.goggles) {
    if (!b.goggles.systems.includes(sys)) out.push(issue(9, "error", ["goggles", b.bnf ? "bnf" : "vtx"], "המשקפות לא יראו את התמונה",
      `הרחפן משדר ב-${SYSTEM_LABEL[sys]} והמשקפות קולטות רק ${b.goggles.systems.map(s => SYSTEM_LABEL[s]).join(" / ")}.`, `בחרו משקפות ${SYSTEM_LABEL[sys]}.`));
    else out.push(issue(9, "ok", ["goggles"], "משקפות מול משדר", SYSTEM_LABEL[sys]));
  }

  // 13. control link: radio ↔ receiver
  const proto = controlProtocol(b);
  if (proto && b.radio) {
    if (!b.radio.protocols.includes(proto)) out.push(issue(13, "error", ["radio", b.bnf ? "bnf" : "receiver"], "השלט לא ידבר עם המקלט",
      `המקלט ב-${PROTOCOL_LABEL[proto]} והשלט משדר ${b.radio.protocols.map(p => PROTOCOL_LABEL[p]).join(" / ")}.`, `בחרו מקלט ${PROTOCOL_LABEL[b.radio.protocols[0]]} או שלט מתאים.`));
    else out.push(issue(13, "ok", ["radio"], "שלט מול מקלט", PROTOCOL_LABEL[proto]));
  }

  // 12b. missing parts
  const missing = missingParts(b);
  if (missing.length) out.push(issue(14, "warn", missing, "חסרים חלקים", "עוד לא בחרתם: " + missing.map(c => CATEGORIES[c].label).join(", ") + "."));

  return out;
}

export function missingParts(b) {
  const need = b.bnf ? ["battery", "radio", "goggles", "charger"] : ["frame", "motors", "stack", "vtx", "receiver", "props", "battery", "radio", "goggles", "charger"];
  if (!b.bnf && b.vtx && !b.vtx.includesCamera && !b.camera) need.push("camera");
  return need.filter(c => !b[c]);
}

export function summary(b) {
  const issues = check(b);
  return {
    issues,
    errors: issues.filter(i => i.level === "error").length,
    warnings: issues.filter(i => i.level === "warn").length,
    ok: issues.filter(i => i.level === "ok").length,
  };
}

/** Would choosing `part` in its category make the build worse? Returns the new errors it introduces. */
export function errorsIfChosen(b, part) {
  const key = part.cat;
  const next = { ...b, [key]: part };
  if (key === "bnf") Object.keys(CATEGORIES).forEach(c => { if (CATEGORIES[c].airframe) next[c] = null; });
  else if (CATEGORIES[key] && CATEGORIES[key].airframe) next.bnf = null;
  return check(next).filter(i => i.level === "error" && i.cats.includes(key));
}

export function totals(b, tools = []) {
  const parts = Object.entries(b).filter(([k, v]) => v && k !== "tools").map(([, v]) => v).concat(tools);
  const price = parts.reduce((s, p) => s + (p.price || 0), 0);
  // all-up weight: only things that fly
  const flying = b.bnf ? [b.bnf, b.battery] : ["frame", "motors", "stack", "vtx", "camera", "receiver", "props", "battery"].map(c => b[c]);
  const auw = flying.filter(Boolean).reduce((s, p) => s + (p.weight || 0), 0);
  return { price, auw };
}

/**
 * Rough performance estimate. Everything here is an approximation for orientation, not a measurement:
 * hover efficiency (g/W) by prop class, a flying-style multiplier, and usable battery energy.
 * Returns null when the build lacks motors/props/battery (or BNF/battery).
 */
export function performance(b) {
  const bat = b.battery;
  if (!bat) return null;
  let thrust, propSize;
  if (b.bnf) { thrust = b.bnf.thrustTotalG; propSize = b.bnf.propSize; }
  else {
    if (!b.motors || !b.props) return null;
    thrust = b.motors.thrustG ? b.motors.thrustG * 4 : null;
    propSize = b.props.size;
  }
  const { auw } = totals(b);
  if (!thrust || !auw) return null;
  const cls = propSize >= 6.5 ? "longrange" : propSize >= 4.5 ? "freestyle" : propSize >= 3 ? "cinematic" : "whoop";
  const eff = { longrange: 8, freestyle: 5.5, cinematic: 3.5, whoop: 2.5 }[cls];      // grams lifted per watt in hover
  const style = { longrange: 1.3, freestyle: 2.2, cinematic: 1.6, whoop: 1.5 }[cls];  // average power vs hover
  const usableWh = bat.cells * 3.7 * bat.mah / 1000 * (bat.chem === "liion" ? 0.85 : 0.8);
  const hoverW = auw / eff;
  const twr = thrust / auw;
  const flyMin = usableWh / (hoverW * style) * 60;
  const hoverMin = usableWh / hoverW * 60;
  const notes = [];
  if (twr < 3) notes.push({ level: "warn", msg: `יחס דחף-משקל ${twr.toFixed(1)}:1 נמוך. הרחפן ירגיש כבד ואיטי; לפריסטייל מכוונים ל-5:1 ומעלה.` });
  else if (cls === "freestyle" && twr > 11) notes.push({ level: "ok", msg: "יחס דחף-משקל גבוה מאוד: רחפן חד וחזק. התחילו עם גז עדין." });
  if (cls === "freestyle" && bat.mah < 900) notes.push({ level: "warn", msg: "סוללה קטנה לרחפן 5\": זמן הטיסה יהיה קצר." });
  return {
    cls, auw, thrust, twr: Math.round(twr * 10) / 10,
    hoverThrottle: Math.round(Math.min(1, Math.sqrt(auw / thrust)) * 100),
    flightMin: [Math.max(0.5, flyMin * 0.8), flyMin * 1.15].map(x => Math.round(x * 10) / 10),
    hoverMin: Math.round(hoverMin * 10) / 10,
    usableWh: Math.round(usableWh * 10) / 10,
    notes,
  };
}
