/**
 * Runs the seeded pairs through the real measurement and composition pipeline and prints
 * what the reveal would say — no database, no UI, no browser.
 *
 * This is the kernel, proven on its own before anything was built around it. It is also
 * how the thresholds get re-checked: the controls must come back short.
 *
 *   pnpm seed                    # target pair, then every control
 *   pnpm seed target             # just the target pair
 *   TYPESAFE_FRESH=1 pnpm seed   # ignore the cache and call the model again
 */

import { measure, type Person } from "../src/lib/derive";
import { compose, SHORT_PAGE } from "../src/lib/compose";
import { ALL_PAIRS } from "../src/seeds/demo-pair";

const RULE = "─".repeat(68);
const fmt = (n: number) => n.toFixed(2).padStart(5);

async function renderPair(label: string, a: Person, b: Person, expect: string) {
  const { measurements, trace } = await measure(a, b);
  const reveal = compose(measurements, { a: a.name, b: b.name });

  console.log(`\n${RULE}\n${label}\n  expected: ${expect}\n${RULE}`);
  console.log(
    `  substance   ${a.name} ${measurements.substance.a.toFixed(2)}   ${b.name} ${measurements.substance.b.toFixed(2)}`,
  );
  console.log(
    `  concern     ${a.name}: ${measurements.concerns.a || "—"}   ${b.name}: ${measurements.concerns.b || "—"}`,
  );
  console.log(
    `  both_alone ${fmt(measurements.both_alone)}   both_feel_unseen ${fmt(measurements.both_feel_unseen)}   enjoy_vs_control ${fmt(measurements.enjoy_vs_control)}`,
  );
  console.log(
    `  ${trace.ms} ms · ${trace.model} · ${trace.cached ? "from cache" : "live"} · ${trace.inputTokens} tokens`,
  );

  console.log("\n  the page");
  if (reveal.tooThin) {
    console.log(`  ── ${SHORT_PAGE.headline}`);
    console.log(`     ${SHORT_PAGE.detail}`);
  } else if (reveal.movements.length === 0) {
    console.log("  ── (nothing cleared the bar)");
  } else {
    for (const m of reveal.movements) {
      console.log(`\n  ── ${m.headline}`);
      console.log(`     ${m.detail}`);
      console.log(`     ${m.number.toFixed(2)}  (needs ${m.threshold})`);
    }
  }
  console.log(`\n  ── ${reveal.nextStep.headline}`);
  console.log(`     ${reveal.nextStep.detail}`);

  if (reveal.withheld.length) {
    console.log("\n  withheld");
    for (const w of reveal.withheld) {
      console.log(`  ${w.id} ${fmt(w.number)} — did not reach ${w.threshold}`);
    }
  }
  return reveal;
}

let failures = 0;
function expect(label: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${label.padEnd(44)} ${detail}`);
}

const only = process.argv[2];

const t = ALL_PAIRS.target;
const targetReveal = await renderPair(
  `TARGET · ${t.a.name} & ${t.b.name}`,
  t.a,
  t.b,
  "three movements, ending on the one thing this week",
);

const a0 = targetReveal.movements.find((m) => m.id === "both_alone");
const a1 = targetReveal.movements.find((m) => m.id === "both_feel_unseen");
const a2 = targetReveal.movements.find((m) => m.id === "enjoy_vs_control");

console.log(`\n${RULE}\nCALIBRATION CHECKS\n${RULE}`);
expect("target: both_alone shows", !!a0, a0 ? a0.number.toFixed(2) : "absent");
expect("target: both_alone is strong", !!a0 && a0.number > 0.8, a0?.number.toFixed(2) ?? "—");
expect("target: both_feel_unseen shows", !!a1, a1 ? a1.number.toFixed(2) : "absent");
expect("target: enjoy_vs_control shows", !!a2, a2 ? a2.number.toFixed(2) : "absent");
expect(
  "target: exactly three movements",
  targetReveal.movements.length === 3,
  `${targetReveal.movements.length} movements`,
);
expect("target: opens on both_alone", targetReveal.movements[0]?.id === "both_alone", targetReveal.movements[0]?.id ?? "—");
expect("target: never shows a thin page", !targetReveal.tooThin, `tooThin=${targetReveal.tooThin}`);

if (!only) {
  const s = ALL_PAIRS.sameWorry;
  const same = await renderPair(
    `CONTROL · same underlying worry · ${s.a.name} & ${s.b.name}`,
    s.a,
    s.b,
    "withholds the false split",
  );
  expect(
    "same-worry: does not claim an enjoy/control split",
    !same.movements.some((m) => m.id === "enjoy_vs_control"),
    same.movements.some((m) => m.id === "enjoy_vs_control") ? "claimed one" : "correctly silent",
  );

  const al = ALL_PAIRS.aligned;
  const aligned = await renderPair(
    `CONTROL · aligned and healthy · ${al.a.name} & ${al.b.name}`,
    al.a,
    al.b,
    "comes back nearly empty",
  );
  expect(
    "aligned: withholds both_alone",
    !aligned.movements.some((m) => m.id === "both_alone"),
    "correctly silent",
  );
  expect(
    "aligned: at most one movement",
    aligned.movements.length <= 1,
    `${aligned.movements.length} movements`,
  );

  const d = ALL_PAIRS.dismissive;
  const dismissive = await renderPair(
    `CONTROL · one person dismissive · ${d.a.name} & ${d.b.name}`,
    d.a,
    d.b,
    "says it does not have enough",
  );
  expect("dismissive: returns the short page", dismissive.tooThin, `tooThin=${dismissive.tooThin}`);
  expect(
    "dismissive: shows no movements at all",
    dismissive.movements.length === 0,
    `${dismissive.movements.length} movements`,
  );
}

console.log();
if (failures === 0) {
  console.log("all checks passed");
} else {
  console.log(
    `${failures} check(s) failed — if the controls are not silent, the thresholds have drifted and the page is making claims it should not`,
  );
  process.exitCode = 1;
}