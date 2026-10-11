// Deterministic screen recording of the whole product, for the demo video.
//   node demo/video.mjs        → demo/raw/journey.webm + demo/ours-demo.mp4
//
// Runs the real app end to end — two people, one code, the page — and captures the
// browser as video so the reveal's motion is real motion rather than a slideshow.
// Everything comes from cached measurements, so it records identically on any machine
// and with the network switched off.
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE ?? "http://localhost:3000";
const RAW = "demo/raw";
mkdirSync(RAW, { recursive: true });

const W = 1440, H = 900;
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
  "She does not think about this stuff at all. She will just book the restaurant, and it is done.",
  "I have tried to bring it up twice and it always turns into a row, so now I say nothing.",
  "I am tired of being the one who has to keep track, and nobody notices what I do about it.",
  "I want to be able to say what is going on with our money without it becoming a fight.",
];

const beat = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  args: ["--force-device-scale-factor=1.5", `--window-size=${W},${H}`],
});
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: RAW, size: { width: W, height: H } },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
const failures = [];
page.on("pageerror", (e) => failures.push(e.message));

// ------------------------------------------------------------------ 1. the problem
await page.goto(`${BASE}/`);
await beat(900);
await page.evaluate(() => window.scrollTo(0, 0));
await beat(2600);                      // the pitch

// ------------------------------------------------------------------ 2. creating a pair
await page.fill("#name", "Maya");
await beat(500);
await page.click('button:has-text("start a new pair")');
await page.waitForSelector("[data-pair-code]", { timeout: 15000 });
const CODE = (await page.locator("[data-pair-code]").innerText()).trim();
await beat(2200);                      // "tell them this code"

// ------------------------------------------------------------------ 3. answering
await page.click('button:has-text("Answer my six questions")');
await page.waitForSelector("textarea", { timeout: 15000 });
await beat(1400);

for (let i = 0; i < MAYA.length; i++) {
  await page.fill("textarea", MAYA[i]);
  await beat(850);
  if (i === 1 || i === 3) await beat(700);   // let two answers breathe
  await page.click(i === MAYA.length - 1 ? 'button:has-text("One last thing")' : 'button:has-text("Next")');
  await beat(520);
}
await page.waitForURL(/\/seal\//, { timeout: 15000 });
await beat(2200);                      // the hash

// ------------------------------------------------------------------ 4. sealing and waiting
await page.click('button:has-text("Seal my answers")');
await page.waitForURL(/\/waiting\//, { timeout: 15000 });
await beat(3000);                      // the wall

// ------------------------------------------------------------------ 5. the other person, then the reveal
console.log(`  pair: ${CODE}`);
await api("/api/pair", { code: CODE, name: "Sam" });
await api("/api/answer", { code: CODE, name: "Maya", answers: MAYA, action: "seal", commitment: sha(CODE, MAYA) });
await api("/api/answer", { code: CODE, name: "Sam", answers: SAM, action: "seal", commitment: sha(CODE, SAM) });

await page.goto(`${BASE}/reveal/${CODE}?as=Maya`);
await beat(5200);                      // let the opening and first movement resolve

// Walk the movements, pausing on each. This is the part that carries the submission.
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.92));
  await beat(2600);
}
await beat(1400);

// Expand the evidence behind a finding.
await page.evaluate(() => window.scrollTo(0, 0));
await beat(1200);
const why = page.locator('button:has-text("WHY WE THINK SO")').first();
if (await why.count()) {
  await why.click();
  await beat(2600);
}

// The next step and the follow-up.
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await beat(2600);

// ------------------------------------------------------------------ 6. the proof
await page.goto(`${BASE}/demo`);
await beat(2400);
await page.click('button:has-text("The same pair, one answer changed")');
await beat(3200);
await page.evaluate(() => window.scrollTo(0, 0));
await beat(1600);
await page.click('button:has-text("A pair who agree, and say so")');
await beat(3000);

await page.close();
const videoPath = await page.video().path();

// ------------------------------------------------------------------ encode
console.log("  encoding");
const out = "demo/ours-demo.mp4";
execFileSync("ffmpeg", [
  "-y", "-i", videoPath,
  // trim the tail: browsers keep recording a moment after the last action
  "-t", "78",
  "-vf", "scale=1440:900:flags=lanczos,fps=30,format=yuv420p",
  "-c:v", "libx264", "-preset", "slow", "-crf", "19",
  "-movflags", "+faststart",
  out,
], { stdio: "inherit" });

execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], { stdio: "inherit" });

console.log(`\n  ${out}`);
console.log(failures.length ? `  page errors: ${failures.join("; ")}` : "  no page errors");
await browser.close();