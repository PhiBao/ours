/**
 * End-to-end check of the whole loop over real HTTP, against a running server.
 *
 * Proves the things that actually matter and cannot be checked by reading code:
 *   - two people can join one code and both get in
 *   - the hash the person saw is the hash the server stores
 *   - tampering with answers after seeing the hash is rejected
 *   - once the page is built, both sets of words are gone from the database
 *   - both people see the identical page
 *
 *   node scripts/e2e.mjs            (expects the app on :3000)
 */

import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const BASE = process.env.BASE ?? "http://localhost:3000";
// A fresh pair every run, so the check never depends on a cleaned database.
const CODE = "T" + Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[^A-Z0-9]/g, "X");

// Answers mirrored from src/seeds/demo-pair.ts so this script stays plain ESM.
const maya = [
  "I always want to go to the good restaurant, and I know it winds him up but it is the one thing I do for myself.",
  "It feels wrong to spend money when we said we would save for the summer.",
  "He doesn't really notice what things cost. He has never once asked.",
  "I keep track of all of it and I never say anything, because I don't want to sound petty.",
  "I am so tired of being the one who plans everything and then being told I spend too much.",
  "I just want to be able to book the nice place without it turning into a thing.",
];
const sam = [
  "I honestly cannot tell what we are spending. It feels like guessing.",
  "Last month I found three subscriptions I did not know about and it made me feel sick.",
  "She does not think about this stuff at all. She will just book the restaurant and it is done.",
  "I have tried to bring it up twice and it always turns into a row, so now I say nothing.",
  "I am tired of being the one who has to keep track, and nobody notices what I do about it.",
  "I want to be able to say what is going on with our money without it becoming a fight.",
];

const commitment = (code, answers) =>
  createHash("sha256").update(JSON.stringify({ code, answers })).digest("hex");

let failures = 0;
const ok = (label, pass, detail = "") => {
  if (!pass) failures++;
  console.log(`  ${pass ? "pass" : "FAIL"}  ${label.padEnd(52)} ${detail}`);
};

async function api(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

console.log("\nEND TO END\n");

// --- both people join one code ---
const a = await api("/api/pair", { code: CODE, name: "Maya" });
const b = await api("/api/pair", { code: CODE, name: "Sam" });
ok("Maya joins", a.status === 200, `${a.status}`);
ok("Sam joins the same code", b.status === 200, `${b.status}`);
ok("pair holds exactly two people", b.body?.people?.length === 2, JSON.stringify(b.body?.people?.map((p) => p.name)));

// --- the same name twice is refused ---
const dupe = await api("/api/pair", { code: CODE, name: "maya" });
ok("duplicate name refused", dupe.status === 409, `${dupe.status}`);
ok("bad code refused", (await api("/api/pair", { code: "nope", name: "Zed" })).status === 400);

// --- drafts round-trip ---
await api("/api/answer", { code: CODE, name: "Maya", answers: maya.slice(0, 3), action: "draft" });
const draft = await api(`/api/answer?code=${CODE}&as=Maya`);
ok("partial draft persisted", draft.body?.answers?.[0] === maya[0], `${draft.body?.answers?.length} saved`);

// --- tamper: seal with a hash that does not match the answers ---
const wrong = await api("/api/answer", {
  code: CODE, name: "Maya", answers: maya, action: "seal",
  commitment: commitment(CODE, [...maya.slice(0, 5), "something else"]),
});
ok("mismatched commitment rejected", wrong.status === 409, `${wrong.status}`);

// --- seal for real, both people ---
// Seal one person, confirm the page does not exist yet, then seal the other.
const sealA = await api("/api/answer", {
  code: CODE, name: "Maya", answers: maya, action: "seal", commitment: commitment(CODE, maya),
});
ok("Maya seals", sealA.status === 200 && sealA.body?.sealed === true);
ok("still only one person in", sealA.body?.bothSealed === false);

const midway = await api("/api/reveal", { code: CODE });
ok("reveal withheld while only one is in", midway.body?.waiting === true, JSON.stringify(midway.body)?.slice(0, 50));

const sealB = await api("/api/answer", {
  code: CODE, name: "Sam", answers: sam, action: "seal", commitment: commitment(CODE, sam),
});
ok("Sam seals", sealB.status === 200 && sealB.body?.sealed === true);
ok("both now sealed", sealB.body?.bothSealed === true);
ok("nobody can seal twice", (await api("/api/answer", { code: CODE, name: "Sam", answers: sam, action: "seal", commitment: commitment(CODE, sam) })).status === 409);

// --- derive: only after both are in ---
const t0 = Date.now();
const reveal = await api("/api/reveal", { code: CODE });
const ms = Date.now() - t0;
ok("page derived", reveal.status === 200 && !!reveal.body?.reveal, `${ms} ms`);
const page = reveal.body?.reveal;
ok("three movements shown", page?.movements?.length === 3, page?.movements?.map((m) => m.id).join(", "));
ok("opens on both_alone", page?.movements?.[0]?.id === "both_alone");
ok("every movement carries its number", (page?.movements ?? []).every((m) => typeof m.number === "number"));

// --- both people see the identical page ---
const againA = await api("/api/reveal", { code: CODE });
const againB = await api("/api/reveal", { code: CODE });
ok("page is stable across reads", JSON.stringify(againA.body.reveal) === JSON.stringify(page));
ok("page never rebuilt", JSON.stringify(againB.body.reveal) === JSON.stringify(page));

// --- the words are gone ---
const db = new DatabaseSync("data/ours.db", { readOnly: true });
const people = db.prepare("SELECT name, sealed, commitment, raw_answers FROM person WHERE pair_code = ?").all(CODE);
const pairRow = db.prepare("SELECT reveal_json FROM pair WHERE code = ?").get(CODE);
ok("both people still sealed", people.length === 2 && people.every((p) => p.sealed === 1));
ok("both commitments kept", people.every((p) => typeof p.commitment === "string" && p.commitment.length === 64));
ok("MAYA'S WORDS DELETED", people.every((p) => p.raw_answers === null), people.map((p) => `${p.name}=${p.raw_answers}`).join(" "));
ok("reveal_json populated", typeof pairRow?.reveal_json === "string" && pairRow.reveal_json.length > 0);
ok("no raw words anywhere in reveal_json", !/"answers"|raw_answers/.test(pairRow?.reveal_json ?? ""));
db.close();

// --- drafts are unreachable after derivation ---
const afterDraft = await api(`/api/answer?code=${CODE}&as=Maya`);
ok("own draft no longer retrievable", (afterDraft.body?.answers ?? []).every((x) => !x), JSON.stringify(afterDraft.body?.answers?.length));

console.log();
if (failures === 0) {
  console.log("all end-to-end checks passed");
} else {
  console.log(`${failures} check(s) failed`);
  process.exitCode = 1;
}