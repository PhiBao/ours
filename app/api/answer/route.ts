/**
 * Saving and sealing answers.
 *
 * POST /api/answer  { code, name, answers, action: "draft" | "seal", commitment? }
 *
 * Drafts save on every change so a dropped connection loses nothing. Sealing is the
 * moment the words become committed — after this the person cannot edit them, only
 * answer again, which rebuilds the page.
 */

import { NextResponse } from "next/server";
import { getDraft, getPair, saveDraft, sealPerson, areBothSealed } from "@/lib/db";
import { commitment } from "@/lib/commit";
import { isValidCode, isValidName } from "../pair/route";

const MAX_LEN = 2000;

/**
 * Drafts save as you type, so they arrive at whatever length the person has reached —
 * always padded to six. Sealing requires all six.
 */
function cleanAnswers(raw: unknown, requireAll: boolean): string[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length > 6) return null;
  if (requireAll && raw.length !== 6) return null;
  const out: string[] = [];
  for (const a of raw) {
    if (typeof a !== "string") return null;
    out.push(a.slice(0, MAX_LEN));
  }
  while (out.length < 6) out.push("");
  return out;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/answer?code=ABC123&as=Maya -> your own draft, and only yours.
 *
 * This is the one read that returns words, and it is scoped to the caller by name. It
 * exists so a person who closed the tab mid-flow does not lose their answers. After the
 * page is built the stored answers are gone, so this returns nothing.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").toUpperCase();
  const name = (url.searchParams.get("as") ?? "").trim();

  if (!isValidCode(code) || !isValidName(name)) {
    return NextResponse.json({ error: "That doesn't look right." }, { status: 400 });
  }
  const state = await getPair(code);
  if (!state) {
    return NextResponse.json({ error: "No pair with that code." }, { status: 404 });
  }
  const me = state.people.find((p) => p.name === name);
  if (!me) {
    return NextResponse.json({ error: "You are not part of that pair." }, { status: 403 });
  }
  if (me.sealed) {
    return NextResponse.json({ answers: [], sealed: true });
  }

  return NextResponse.json({ answers: await getDraft(code, name), sealed: false });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Could not read that." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.toUpperCase() : "";
  if (!isValidCode(code)) {
    return NextResponse.json({ error: "That code doesn't look right." }, { status: 400 });
  }
  if (!isValidName(body.name)) {
    return NextResponse.json({ error: "We need a name for you." }, { status: 400 });
  }

  const name = String(body.name).trim();
  const state = await getPair(code);
  if (!state) {
    return NextResponse.json({ error: "No pair with that code." }, { status: 404 });
  }
  const me = state.people.find((p) => p.name === name);
  if (!me) {
    return NextResponse.json({ error: "You are not part of that pair." }, { status: 403 });
  }
  if (me.sealed) {
    return NextResponse.json(
      { error: "You've already sealed your answers." },
      { status: 409 },
    );
  }

  const action = body.action === "seal" ? "seal" : "draft";
  const answers = cleanAnswers(body.answers, action === "seal");
  if (!answers) {
    return NextResponse.json(
      { error: action === "seal" ? "All six answers are needed." : "Could not read those answers." },
      { status: 400 },
    );
  }

  if (action === "draft") {
    await saveDraft(code, name, answers);
    return NextResponse.json({ ok: true, saved: true });
  }

  const sent = typeof body.commitment === "string" ? body.commitment : "";
  if (!/^[0-9a-f]{64}$/.test(sent)) {
    return NextResponse.json({ error: "Missing commitment." }, { status: 400 });
  }

  // Recompute server-side. If these disagree, something changed the answers between the
  // person seeing their hash and pressing submit.
  const expected = await commitment(code, answers);
  if (expected !== sent) {
    return NextResponse.json(
      { error: "Those answers don't match the hash. Nothing was saved." },
      { status: 409 },
    );
  }

  await sealPerson(code, name, sent, answers);
  const fresh = await getPair(code);

  return NextResponse.json({
    ok: true,
    sealed: true,
    bothSealed: await areBothSealed(code),
    people: fresh?.people ?? [],
  });
}