// Two fixes verified in a real browser, both reproduced from the founder's report.
import { chromium } from "playwright";
import { createHash } from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:3000";
const sha = (c, a) => createHash("sha256").update(JSON.stringify({ code: c, answers: a })).digest("hex");
const api = async (p, b) => {
  const r = await fetch(`${BASE}${p}`, {
    method: b ? "POST" : "GET",
    headers: b ? { "Content-Type": "application/json" } : undefined,
    body: b ? JSON.stringify(b) : undefined,
  });
  return { s: r.status, b: await r.json().catch(() => null) };
};

const maya = [
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

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

let fails = 0;
const ok = (l, pass, d = "") => {
  if (!pass) fails++;
  console.log(`  ${pass ? "pass" : "FAIL"}  ${l.padEnd(48)} ${d}`);
};

console.log("\n=== 1. creating a pair now tells you what it is ===");
await page.goto(`${BASE}/`);
await page.fill("#name", "Maya");
await page.click('button:has-text("start a new pair")');
await page.waitForSelector("[data-pair-code]", { timeout: 8000 });
const newCode = (await page.locator("[data-pair-code]").innerText()).trim();
ok("code shown on its own screen", /^[A-Z0-9]{6}$/.test(newCode), newCode);
ok("tells you to hand it over", /tell them|give them/i.test(await page.locator("body").innerText()));

await page.click('button:has-text("Answer my six questions")');
await page.waitForSelector("textarea", { timeout: 8000 });   // actually rendered
await page.waitForTimeout(300);
ok("code visible while answering", (await page.content()).includes(newCode));
ok("copy link offered while answering", await page.locator('button:has-text("COPY LINK")').count() > 0);

console.log("\n=== 2. waiting shows the code, before the page exists ===");
// A fresh pair with only one person sealed, so the reveal does not exist yet.
await api("/api/pair", { code: newCode, name: "Sam" });
await api("/api/answer", { code: newCode, name: "Maya", answers: maya, action: "seal", commitment: sha(newCode, maya) });

await page.goto(`${BASE}/waiting/${newCode}?as=Maya`);
await page.waitForTimeout(2500);
const wt = await page.locator("body").innerText();
ok("waiting shows the code", wt.includes(newCode), wt.split("\n")[0]);
ok("waiting offers to send it", await page.locator('button:has-text("COPY LINK")').count() > 0);
ok("waiting names the other person", wt.includes("Sam"));
ok("says it is with them", /with them/i.test(wt), wt.split("\n").filter((l) => /them/i.test(l))[0] ?? "");

console.log("\n=== 3. the follow-up now confirms ===");
await api("/api/answer", { code: newCode, name: "Sam", answers: sam, action: "seal", commitment: sha(newCode, sam) });
await page.goto(`${BASE}/reveal/${newCode}?as=Maya`);
await page.waitForSelector('button:has-text("Not yet")', { timeout: 12000 });
await page.click('button:has-text("Not yet")');
await page.waitForTimeout(1000);
let body = await page.locator("body").innerText();
ok("confirmation in words", /RECORDED — NOT YET/.test(body), (body.split("\n").find((l) => /RECORDED/.test(l)) ?? "none"));
ok("answer visually marked", (await page.locator('button:has-text("Not yet")').evaluate((el) => getComputedStyle(el).color)) !== "rgb(138, 129, 117)");

await page.click('button:has-text("Yes")');
await page.waitForTimeout(1000);
body = await page.locator("body").innerText();
ok("switching answer updates it", /RECORDED — YOU TALKED ABOUT IT/.test(body));

console.log("\n=== console errors ===");
console.log(errors.length ? errors.slice(0, 6).join("\n") : "none");
if (errors.length) fails++;

console.log(fails === 0 ? "\nboth reported bugs fixed" : `\n${fails} still failing`);
await browser.close();