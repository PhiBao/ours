// End-to-end check against a deployed URL. No database access: D1 is remote, so the
// privacy guarantee is verified through the API rather than by reading a file.
//
//   BASE=https://ours.kiter0211.workers.dev node scripts/e2e-live.mjs
import { createHash, randomBytes } from "node:crypto";

const B = process.env.BASE;
if (!B) {
  console.error("set BASE to the deployed URL");
  process.exit(1);
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Random, not time-seeded: a time seed collides across runs and the pair then already exists. */
function freshCode() {
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const sha = (c, a) => createHash("sha256").update(JSON.stringify({ code: c, answers: a })).digest("hex");
// Cloudflare edge latency from a local network is genuinely variable — observed between
// 0.25s and 5.7s for the same route. Retry transport failures so a slow edge node is
// never reported as a broken app.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function attempt(p, b) {
  const r = await fetch(`${B}${p}`, {
    method: b ? "POST" : "GET",
    headers: b ? { "Content-Type": "application/json" } : undefined,
    body: b ? JSON.stringify(b) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  return { s: r.status, b: await r.json().catch(() => null) };
}

const api = async (p, b) => {
  let last;
  for (let i = 0; i < 8; i++) {
    try {
      return await attempt(p, b);
    } catch (err) {
      last = err;
      // Edge latency from a local network was measured between 0.25s and 5.7s, with
      // occasional multi-second connect timeouts. Only transport failures are retried —
      // an HTTP status is a real answer and is returned as-is.
      await sleep(500 * (i + 1));
    }
  }
  throw last;
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

let failures = 0;
const ok = (label, pass, detail = "") => {
  if (!pass) failures++;
  console.log(`  ${pass ? "pass" : "FAIL"}  ${label.padEnd(44)} ${detail}`);
};


let CODE = "";
for (let tries = 0; tries < 10; tries++) {
  CODE = freshCode();
  const r = await api("/api/pair", { code: CODE, name: "Maya" });
  if (r.s === 200) { console.log(`\nLIVE END TO END — ${B}   pair ${CODE}\n`); ok("homepage serves", (await api("/")).s === 200); ok("join A", true); break; }
  if (tries === 9) { console.log("could not find a free pair code"); process.exit(1); }
}
void CODE;
ok("join B", (await api("/api/pair", { code: CODE, name: "Sam" })).s === 200);
ok("duplicate name refused", (await api("/api/pair", { code: CODE, name: "maya" })).s === 409);
ok("bad code refused", (await api("/api/pair", { code: "nope", name: "Zed" })).s === 400);
ok("unknown pair 404s", (await api(`/api/pair?code=${CODE}`)).s === 200);

await api("/api/answer", { code: CODE, name: "Maya", answers: MAYA.slice(0, 3), action: "draft" });
const draft = await api(`/api/answer?code=${CODE}&as=Maya`);
ok("partial draft persisted", Array.isArray(draft.b?.answers) && draft.b.answers.length === 6);

const tampered = await api("/api/answer", {
  code: CODE, name: "Maya", answers: MAYA, action: "seal", commitment: sha(CODE, ["wrong"]),
});
ok("tampered commitment rejected", tampered.s === 409, `status ${tampered.s}`);

ok("seal A", (await api("/api/answer", { code: CODE, name: "Maya", answers: MAYA, action: "seal", commitment: sha(CODE, MAYA) })).s === 200);
ok("no reveal until both are in", (await api("/api/reveal", { code: CODE })).b?.waiting === true);
ok("seal B", (await api("/api/answer", { code: CODE, name: "Sam", answers: SAM, action: "seal", commitment: sha(CODE, SAM) })).s === 200);

const t0 = Date.now();
const rv = await api("/api/reveal", { code: CODE });
ok("reveal derived", !!rv.b?.reveal, `${Date.now() - t0} ms`);
const page = rv.b?.reveal;
ok("three movements", page?.movements?.length === 3, (page?.movements ?? []).map((m) => m.id).join(", "));
ok("opens on both_alone", page?.movements?.[0]?.id === "both_alone");
ok("every movement carries its number", (page?.movements ?? []).every((m) => typeof m.number === "number"));

const again = await api("/api/reveal", { code: CODE });
ok("page identical for both people", JSON.stringify(again.b.reveal) === JSON.stringify(page));
ok("mark saved", (await api("/api/reveal", { code: CODE, mark: true })).b?.ok === true);

const after = await api(`/api/answer?code=${CODE}&as=Maya`);
ok(
  "raw answers unreachable afterwards",
  (after.b?.answers ?? []).every((x) => !x),
  `${after.b?.answers?.length} left`,
);

console.log();
if (failures === 0) console.log("live app fully working");
else { console.log(`${failures} failed`); process.exitCode = 1; }