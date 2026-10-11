// Creates the pairs used by the demo video's page scenes.
//
// Each scene needs a different point in the flow, and one pair cannot be in two
// states at once — the app redirects on them:
//
//   answer/[code]   -> /waiting  once this person has sealed
//   waiting/[code]  -> /reveal   once both people have sealed
//   reveal          -> built from both sets of words, which are then destroyed
//
// So there are three pairs, frozen at three different moments:
//
//   OURS01  both joined, nobody sealed   -> the answering screen
//   OURS02  both joined, Maya sealed     -> the waiting screen
//   OURS03  both joined, both sealed     -> the page
//
// `pnpm seed` deliberately does not touch the database — it runs the pipeline in
// memory — so this fills that gap for recording only.
//
//   node demo/seed-for-video.mjs
//   BASE=https://... node demo/seed-for-video.mjs
//
// Fixed codes so scenes can point at them. Re-running is harmless.

import { createHash } from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:3000";

const MAYA = [
  "I always want to go to the good restaurant, and I know it winds him up but it is the one thing I do for myself.",
  "It feels wrong to spend money when we said we would save for the summer.",
  "He does not really notice what things cost. He has never once asked.",
  "I keep track of all of it and I never say anything, because I do not want to sound petty.",
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

const sha = (code, answers) =>
  createHash("sha256").update(JSON.stringify({ code, answers })).digest("hex");

const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });

async function join(code) {
  for (const name of ["Maya", "Sam"]) await post("/api/pair", { code, name });
}

const seal = (code, name, answers) =>
  post("/api/answer", {
    code, name, answers, action: "seal", commitment: sha(code, answers),
  });

console.log(`seeding for the video at ${BASE}`);

// 1. Nobody has sealed. Maya is still answering.
await join("OURS01");
console.log("  OURS01  both joined, nobody sealed");

// 2. Maya has sealed, Sam has not. She is waiting on him.
await join("OURS02");
await seal("OURS02", "Maya", MAYA);
console.log("  OURS02  Maya sealed, Sam not");

// 3. Both sealed. The page gets built, and the words are destroyed.
await join("OURS03");
await seal("OURS03", "Maya", MAYA);
await seal("OURS03", "Sam", SAM);
const rv = await post("/api/reveal", { code: "OURS03" });
const page = await rv.json();
console.log(`  OURS03  both sealed, reveal ${rv.status}`);
for (const m of page.reveal?.movements ?? []) {
  console.log(`    ${m.id.padEnd(20)} ${m.number}`);
}

console.log("\nscene sources");
console.log(`  answer   ${BASE}/answer/OURS01?as=Maya`);
console.log(`  seal     ${BASE}/seal/OURS02?as=Maya`);
console.log(`  waiting  ${BASE}/waiting/OURS02?as=Maya`);
console.log(`  reveal   ${BASE}/reveal/OURS03?as=Maya`);
console.log(`  control  ${BASE}/demo`);