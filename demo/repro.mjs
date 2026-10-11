// Reproduce the founder's two reports in a real browser.
import { chromium } from "playwright";
import { createHash } from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

console.log("=== BUG 2: start a new pair ===");
await page.goto(`${BASE}/`);
await page.fill("#code", "MAYA01");
await page.fill("#name", "Maya");
await page.click('button:has-text("start a new pair")');
await page.waitForTimeout(2500);
console.log("  landed on:", page.url());
const html = await page.content();
console.log("  pair code shown on the answer screen?",
  /MAYA01|[A-Z0-9]{6}/.test(html) && await page.locator("text=/\\b[A-Z0-9]{6}\\b/").count() > 0 ? "yes" : "NO — you cannot tell which pair you are in");
console.log("  body:", (await page.locator("body").innerText()).split("\n").slice(0, 3).join(" | "));

console.log("\n=== BUG 1: the talked-about-it mark ===");
const C = "MARK01";
const H = { "Content-Type": "application/json" };
const sha = (c, a) => createHash("sha256").update(JSON.stringify({ code: c, answers: a })).digest("hex");
const api = async (p, b) => {
  const r = await fetch(`${BASE}${p}`, { method: b ? "POST" : "GET", headers: b ? H : undefined, body: b ? JSON.stringify(b) : undefined });
  return r.status;
};
const real = [
  "Money has always felt tight and I have never felt like I get to choose anything.",
  "The month the car went I sat in the kitchen doing sums for two hours.",
  "I think he thinks I am careful, but really I just do not want to be the one who says no.",
  "I have wanted to tell him I am scared but I do not know how to start.",
  "I am tired of being the one who has to check everything twice.",
  "I want one evening where we just look at it together.",
];
const sam = [
  "I honestly cannot tell what we are spending and it makes me anxious every month.",
  "I found three subscriptions I did not know about last month.",
  "She does not think about this stuff at all.",
  "I have tried twice and it becomes a row, so I stopped.",
  "I am tired of being the only one keeping track.",
  "I want to say what is going on without it becoming a fight.",
];
await api("/api/pair", { code: C, name: "Maya" });
await api("/api/pair", { code: C, name: "Sam" });
await api("/api/answer", { code: C, name: "Maya", answers: real, action: "seal", commitment: sha(C, real) });
await api("/api/answer", { code: C, name: "Sam", answers: sam, action: "seal", commitment: sha(C, sam) });

await page.goto(`${BASE}/reveal/${C}?as=Maya`);
await page.waitForTimeout(2500);
console.log("  first line:", (await page.locator("body").innerText()).split("\n")[0]);

const btn = page.locator('button:has-text("Not yet")');
await btn.waitFor({ state: "visible", timeout: 8000 });
const before = await btn.evaluate((el) => getComputedStyle(el).color);
await btn.click();
await page.waitForTimeout(1200);
const after = await btn.evaluate((el) => getComputedStyle(el).color);
const pressed = await btn.getAttribute("aria-pressed");
console.log(`  colour ${before} -> ${after}   aria-pressed=${pressed}`);
console.log("  visible feedback?", before !== after ? "YES (but subtle)" : "NO — nothing happens");

console.log("\n=== errors ===");
console.log(errors.length ? errors.slice(0, 6).join("\n") : "none");

await browser.close();