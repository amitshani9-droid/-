import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { check, summary, errorsIfChosen, missingParts, totals } from "../src/index.js";

const data = JSON.parse(readFileSync(new URL("../data/parts.json", import.meta.url)));
const P = Object.fromEntries(data.parts.map(p => [p.id, p]));
const good = {
  frame: P["frame-nazgul-evoque-f5"], motors: P["mot-xing2-2207-1855"], stack: P["stack-speedybee-f405-v4"],
  vtx: P["vtx-dji-o4-pro"], camera: null, receiver: P["rx-rp1"], props: P["props-gemfan-51466"],
  battery: P["bat-cnhl-6s-1100"], radio: P["radio-pocket"], goggles: P["gog-dji-n3"], charger: P["chg-m7"], bnf: null,
};
const errs = b => check(b).filter(i => i.level === "error").map(i => i.rule);

test("dataset: unique ids, known categories, required fields", () => {
  const ids = new Set();
  for (const p of data.parts) {
    assert.ok(!ids.has(p.id), "dup " + p.id); ids.add(p.id);
    assert.ok(p.name && p.cat && typeof p.price === "number", p.id);
  }
});

test("a known-good 5\" 6S DJI build has no errors and no missing parts", () => {
  const s = summary(good);
  assert.equal(s.errors, 0, JSON.stringify(s.issues.filter(i => i.level === "error")));
  assert.deepEqual(missingParts(good), []);
});

test("rule 1+7: 6S battery on 4S-only AIO and 4S motors", () => {
  assert.ok(errs({ ...good, stack: P["stack-f411-aio-25a"] }).includes(1));
  assert.ok(errs({ ...good, motors: P["mot-xing2-2207-2755"] }).includes(7));
});

test("rule 2: 25.5 AIO does not fit a 30.5/20 frame", () => {
  assert.ok(errs({ ...good, stack: P["stack-f411-aio-25a"] }).includes(2));
});

test("rule 3+4: 7\" props on a 5\" frame and 5\" motors", () => {
  const e = errs({ ...good, props: P["props-hq-7x4x3"] });
  assert.ok(e.includes(3) && e.includes(4));
});

test("rule 5: 12x12 motors on a 16x16 frame", () => {
  assert.ok(errs({ ...good, motors: P["mot-speedx2-2105-2650"] }).includes(5));
});

test("rule 6: weak ESC for strong motors", () => {
  assert.ok(errs({ ...good, stack: P["stack-speedybee-f405-mini"], frame: P["frame-mark5"] }).includes(6));
});

test("rule 9: goggles that cannot see the VTX, analog VTX with no camera", () => {
  assert.ok(errs({ ...good, goggles: P["gog-skyzone-04x"] }).includes(9));
  assert.ok(missingParts({ ...good, vtx: P["vtx-rush-tank-solo"] }).includes("camera"));
});

test("rule 11: not enough UARTs", () => {
  assert.ok(errs({ ...good, frame: P["frame-cinelog35"], stack: { ...P["stack-f411-aio-25a"], mount: 20, cells: [2, 6], uarts: 1 } }).includes(11));
});

test("rule 13: Crossfire receiver with an ELRS radio", () => {
  assert.ok(errs({ ...good, receiver: P["rx-crsf-nano"] }).includes(13));
});

test("BNF mode ignores airframe slots and checks battery/goggles/radio", () => {
  const b = { bnf: P["bnf-cinelog35-o4"], battery: P["bat-cnhl-6s-1100"], radio: P["radio-pocket"], goggles: P["gog-walksnail-x"], charger: P["chg-m7"] };
  const e = errs(b);
  assert.ok(e.includes(1) && e.includes(9));
  assert.equal(errs({ ...b, battery: P["bat-gnb-4s-850"], goggles: P["gog-dji-n3"] }).length, 0);
});

test("errorsIfChosen flags a part that would break the build", () => {
  assert.ok(errorsIfChosen(good, P["gog-ev800d"]).length > 0);
  assert.equal(errorsIfChosen(good, P["gog-dji-3"]).length, 0);
});

test("totals: price sums, AUW counts only flying parts", () => {
  const t = totals(good);
  assert.ok(t.price > 3000);
  assert.ok(t.auw > 450 && t.auw < 700, String(t.auw));
});
