// Deterministic capture of the whole journey, for design review and the demo video.
//   node demo/capture.mjs          → PNGs in demo/shots/
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = "demo/shots";
mkdirSync(OUT, { recursive: true });

const sha = (c, a) => createHash("sha256").update(JSON.stringify({ code: c, answers: a })).digest("hex");
const api = async (p, b) => {
  const r = await fetch(`${BASE}${p}`, {
    method: b ? "POST" : "GET",
    headers: b ? { "Content-Type": "application/json" } : undefined,
    body: b ? JSON.stringify(b) : undefined,
  });
  return { s: r.status, b: await r.json().catch(() => null) };
};

const MAYA = [
  "I always want to go to the good restaurant, and I know it winds him up but it is the one thing I do for myself.",
  "It feels wrong to spend money when we said we would save for the summer.",
  "He doesn't really notice what things cost. He has never once asked.",
  "I keep track of all of it and I never say anything, because I don't want to sound petty.",
  "I am so tired of being the one who plans everything and then being told I spend too much.",
  "I just want to be able to book the nice place without it turning into a thing.",
];
const SAM = [
  "I honestly cannot tell what we are spending. It feels like guessing.",
  "Last month I found three subscriptions I did not know about and it made me feel sick.",
  "She does not think about this stuff at all. She will just book the restaurant and it is done.",
  "I have tried to bring it up twice and it always turns into a row, so now I say nothing.",
  "I am tired of being the one who has to keep track, and nobody notices what I do about it.",
  "I want to be able to say what is going on with our money without it becoming a fight.",
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

// Named, not numbered: the README references these, and "07.png" means nothing to
// anyone reading the repo six months from now.
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  return name;
};

console.log("\n--- the whole journey ---");
await page.goto(`${BASE}/`);
await page.waitForTimeout(600);
await shot("01-join");

await page.fill("#name", "Maya");
await page.click('button:has-text("start a new pair")');
await page.waitForSelector("[data-pair-code]", { timeout: 10000 });
await page.waitForTimeout(800);
const CODE = (await page.locator("[data-pair-code]").innerText()).trim();
await shot("02-your-code");
console.log(`  pair: ${CODE}`);

await page.click('button:has-text("Answer my six questions")');
await page.waitForSelector("textarea", { timeout: 10000 });

for (let i = 0; i < MAYA.length; i++) {
  await page.fill("textarea", MAYA[i]);
  await page.waitForTimeout(500);
  if (i === 0) await shot("03-answering");          // first prompt, typed
  const last = i === MAYA.length - 1;
  await page.click(last ? 'button:has-text("One last thing")' : 'button:has-text("Next")');
  await page.waitForTimeout(last ? 1200 : 350);
}
console.log("  answered all six");

await page.waitForURL(/\/seal\//, { timeout: 15000 });
await page.waitForTimeout(2000);
await shot("04-the-hash");          // seal

await page.click('button:has-text("Seal my answers")');
await page.waitForURL(/\/waiting\//, { timeout: 15000 });
await page.waitForTimeout(2800);
await shot("05-waiting-for-them");          // waiting

console.log("  the other person answers");
await api("/api/pair", { code: CODE, name: "Sam" });
await api("/api/answer", { code: CODE, name: "Maya", answers: MAYA, action: "seal", commitment: sha(CODE, MAYA) });
await api("/api/answer", { code: CODE, name: "Sam", answers: SAM, action: "seal", commitment: sha(CODE, SAM) });

await page.goto(`${BASE}/reveal/${CODE}?as=Maya`);
await page.waitForTimeout(5000);
await shot("06-reveal-opening");          // reveal
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9));
  await page.waitForTimeout(1100);
  await shot(`07-reveal-${i + 1}`);
}
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1000);
await shot("08-the-one-thing");          // the next step

// an expanded finding, showing the number and her own words
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
const why = page.locator('button:has-text("WHY WE THINK SO")').first();
if (await why.count()) {
  await why.click();
  await page.waitForTimeout(900);
  await shot("09-why-we-think-so");
}

await page.click('button:has-text("Not yet")');
await page.waitForTimeout(1000);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(600);
await shot("10-what-happened");          // follow-up

await page.goto(`${BASE}/demo`);
await page.waitForTimeout(2500);
await shot("11-control-the-target-pair");          // the default variant
await page.click('button:has-text("The same pair, one answer changed")');
await page.waitForTimeout(2600);
await shot("12-control-one-answer-changed");          // change one answer
await page.click('button:has-text("A pair who agree, and say so")');
await page.waitForTimeout(2600);
await shot("13-control-nothing-to-stand-behind");          // a pair who agree

console.log(`\n  screenshots in ${OUT}/`);
console.log("=== errors ===");
console.log(problems.length ? problems.join("\n") : "none");
await browser.close();