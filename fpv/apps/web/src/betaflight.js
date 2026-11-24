// Generates a Betaflight 4.4/4.5 CLI snippet for the build.
// Assumes the wiring used in the assembly guide: receiver on UART2, VTX on UART1.
// Serial function masks: MSP = 1, SERIAL_RX = 64, VTX_SMARTAUDIO = 2048.
export function betaflightCli(b) {
  const vsys = b.bnf ? b.bnf.system : b.vtx ? b.vtx.system : null;
  const digital = vsys && vsys !== "analog";
  const cells = b.battery ? b.battery.cells : b.bnf ? b.bnf.cells : null;
  const lines = [];
  const c = s => lines.push("# " + s);
  const l = s => lines.push(s);

  c("Go4FPV · Betaflight CLI לבילד שלך (BF 4.4/4.5)");
  c("לפני הדבקה: הקלידו diff all ושמרו גיבוי.");
  c("ההנחה: מקלט על UART2, VTX על UART1. אם חיברתם אחרת, שנו את המספר הראשון בשורות serial (UART1 = 0).");
  l("");
  c("פורטים");
  l("serial 1 64 115200 57600 0 115200");
  if (digital) l("serial 0 1 115200 57600 0 115200");
  else if (vsys === "analog") l("serial 0 2048 115200 57600 0 115200");
  l("");
  c("מקלט: ELRS ו-Crossfire מדברים CRSF");
  l("set serialrx_provider = CRSF");
  l("");
  c("מנועים: DShot600 עם טלמטריה דו-כיוונית (לסינון RPM)");
  l("set motor_pwm_protocol = DSHOT600");
  l("set dshot_bidir = ON");
  l("set motor_poles = 14");
  l("");
  if (digital) {
    c("OSD דרך משדר דיגיטלי (DJI / Walksnail)");
    l("set osd_displayport_device = MSP");
    l("set displayport_msp_serial = 0");
    l("");
  }
  c("סוללה: אזהרה ב-3.50V לתא, מינימום 3.30V");
  l("set vbat_warning_cell_voltage = 350");
  l("set vbat_min_cell_voltage = 330");
  l("set vbat_max_cell_voltage = 430");
  l("");
  c("מתגים: AUX1 = Arm, AUX2 = Angle / Horizon / Acro, AUX3 = ביפר, AUX4 = Turtle");
  l("aux 0 0 0 1700 2100 0 0");
  l("aux 1 1 1 900 1300 0 0");
  l("aux 2 2 1 1300 1700 0 0");
  l("aux 3 13 2 1700 2100 0 0");
  l("aux 4 35 3 1700 2100 0 0");
  l("");
  c("Failsafe: ניתוק שלט = מנועים נעצרים");
  l("set failsafe_procedure = DROP");
  l("");
  l("save");

  const checks = [
    "צריבת הקושחה הנכונה ללוח (טאב Firmware Flasher, לפי שם הבקר)",
    "טאב Setup: הדגם בתלת-ממד זז כמו הרחפן כשמזיזים אותו",
    "טאב Receiver: כל המקלות והמתגים זזים בכיוון הנכון",
    "טאב Motors (בלי פרופים!): כל מנוע במקום ובכיוון הנכון; ב-BLHeli/Bluejay אפשר להפוך כיוון",
    "טאב Modes: Arm עובד רק כשהגז למטה",
    "Failsafe: מכבים את השלט, והמנועים נעצרים",
    cells ? `טאב Power: המתח מוצג נכון (${cells}S מלאה ≈ ${(cells * 4.2).toFixed(1)}V)` : "טאב Power: המתח מוצג נכון",
  ];
  return { cli: lines.join("\n"), checks, digital };
}
